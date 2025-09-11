import React, { useState, useEffect, useCallback } from "react";
import { Package, Search } from "lucide-react";
import { InventoryItem } from "../types";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import AddStockModal from "./modals/AddStockModal";
import UseStockModal from "./modals/UseStockModal";
import EditInventoryModal from "./modals/EditInventoryModal";
import toast from "react-hot-toast";
import { useData } from "../contexts/DataContext";
import { useSocket } from "../contexts/SocketContext";

const INVENTORY_CREATED = "inventory:created";
const INVENTORY_UPDATED = "inventory:updated";
const INVENTORY_DELETED = "inventory:deleted";

const InventoryManagement: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user, isLoading: authIsLoading, isAdmin, canReduce } = useAuth();
  const { refreshKey } = useData();
  const socket = useSocket();

  const matchesSearch = useCallback((item: InventoryItem, term: string) => {
    const t = term.trim().toLowerCase();
    if (!t) return true;
    const brand = item.brand?.toLowerCase() || "";
    const type = item.type?.toLowerCase() || "";
    const thickness = (item.thicknessMm ?? "").toString();
    const length = (item.sheetLengthMm ?? "").toString();
    const width = (item.sheetWidthMm ?? "").toString();
    return (
      brand.includes(t) ||
      type.includes(t) ||
      thickness.includes(t) ||
      length.includes(t) ||
      width.includes(t)
    );
  }, []);

  const loadItems = useCallback(
    async () => {
      if (authIsLoading) return;
      try {
        const response = await apiService.getInventoryItems({
          search: searchTerm,
        });
        if (response.success) {
          setItems(response.data || []);
        } else {
          toast.error(response.message || "Failed to load inventory items");
        }
      } catch (error: any) {
        console.error("Error loading items:", error);
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load inventory items";
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [authIsLoading, searchTerm]
  );

  useEffect(() => {
    if (authIsLoading) return;
    const handler = setTimeout(() => {
      loadItems();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, loadItems, authIsLoading, refreshKey]);

  useEffect(() => {
    if (!socket || !user) return;

    const onCreated = (created: InventoryItem) => {
      setItems((prev) => {
        const next = [created, ...prev];
        return next.filter((i) => matchesSearch(i, searchTerm));
      });
    };

    const onUpdated = (updated: InventoryItem) => {
      setItems((prev) => {
        const next = prev.map((i) => (i._id === updated._id ? updated : i));
        return next.filter((i) => matchesSearch(i, searchTerm));
      });
    };

    const onDeleted = (payload: { id: string } | string) => {
      const id = typeof payload === "string" ? payload : payload?.id;
      if (!id) return;
      setItems((prev) => prev.filter((i) => i._id !== id));
    };

    socket.on(INVENTORY_CREATED, onCreated);
    socket.on(INVENTORY_UPDATED, onUpdated);
    socket.on(INVENTORY_DELETED, onDeleted);

    return () => {
      socket.off(INVENTORY_CREATED, onCreated);
      socket.off(INVENTORY_UPDATED, onUpdated);
      socket.off(INVENTORY_DELETED, onDeleted);
    };
  }, [socket, user, searchTerm, matchesSearch]);

  const handleAddStock = async (quantity: number) => {
    if (!selectedItem || !user) return;
    if (!isAdmin) {
      toast.error("Only admins can add stock.");
      return;
    }
    try {
      const response = await apiService.updateInventoryQuantity(
        selectedItem._id,
        {
          transactionType: "addition",
          quantityChanged: quantity,
        }
      );
      if (response.success) {
        toast.success(response.message || "Stock added successfully!");
        setShowAddModal(false);
        setSelectedItem(null);
      } else {
        toast.error(response.message || "Failed to add stock");
      }
    } catch (error: any) {
      console.error("Add stock error:", error);
      const status = error?.status ?? error?.response?.status;
      if (status === 403) {
        toast.error(
          error?.response?.data?.message ||
            "You do not have permission to add stock."
        );
      } else {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to add stock"
        );
      }
    }
  };

  const handleUseStock = async (
    quantity: number,
    reductionReason: "usage" | "breakage"
  ) => {
    if (!selectedItem || !user) return;
    if (!canReduce) {
      toast.error("Viewers cannot reduce inventory.");
      return;
    }
    try {
      const response = await apiService.updateInventoryQuantity(
        selectedItem._id,
        {
          transactionType: "reduction",
          quantityChanged: quantity,
          reductionReason,
        }
      );
      if (response.success) {
        toast.success(response.message || "Stock reduced successfully!");
        setShowUseModal(false);
        setSelectedItem(null);
      } else {
        toast.error(response.message || "Failed to reduce stock");
      }
    } catch (error: any) {
      console.error("Use stock error:", error);
      const status = error?.status ?? error?.response?.status;
      if (status === 403) {
        toast.error(
          error?.response?.data?.message ||
            "You do not have permission to reduce inventory."
        );
      } else {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to reduce stock"
        );
      }
    }
  };

  if (isLoading || authIsLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Calculate total stock valuation with fallback calculation
  const totalStockValuation = items.reduce((total, item) => {
    // Use backend stockValuation if available, otherwise calculate manually
    let itemValuation = item.stockValuation || 0;
    
    // Fallback calculation for items without stockValuation
    if (!itemValuation && item.rate && item.thicknessMm && item.sheetLengthMm && item.sheetWidthMm && item.currentQuantity) {
      // Formula: total area * thickness * rate
      // Total area = (sheet width * sheet length * quantity) / 1,000,000
      const totalArea = (item.sheetLengthMm * item.sheetWidthMm * item.currentQuantity) / 1_000_000;
      itemValuation = totalArea * item.thicknessMm * item.rate;
    }
    
    return total + itemValuation;
  }, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Inventory Management
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Total Stock Valuation - Minimalist Design */}
      <div className="mb-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-600" />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Total Stock Valuation
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {items.length} items • {items.reduce((sum, item) => sum + item.currentQuantity, 0)} units
              </span>
            </div>
          </div>
          <div className="text-xl font-semibold text-gray-900">
            ₹{totalStockValuation.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="mx-auto w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No inventory items found
          </h3>
          <p className="text-gray-600">
            {searchTerm
              ? "No items match your search criteria."
              : "Get started by adding your first inventory item."}
          </p>
        </div>
      ) : (
        <div
  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
        >
          {items.map((item) => (
<div
  key={item._id}
  className="bg-blue-50 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col"
>
  <div className="flex items-start justify-between mb-4">
    <div className="min-w-0 flex-1">
  
      <div className="overflow-x-auto overflow-y-hidden whitespace-nowrap">
        <h3 className="font-bold text-xl text-blue-900">
          {item.type}
        </h3>
        <p className="text-sm text-gray-900">
          {item.brand}
        </p>
      </div>
    </div>
    
    {isAdmin && (
      <button
        onClick={() => {
          setSelectedItem(item);
          setShowEditModal(true);
        }}
        className="p-2 rounded-full bg-white shadow hover:bg-gray-100 transition-colors flex-shrink-0 ml-3"
        aria-label="Edit inventory item"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"
          />
        </svg>
      </button>
    )}
  </div>

  {/* Item details */}
  <div className="space-y-2 mb-4">
    <div className="flex justify-between">
      <span className="text-sm font-medium text-gray-900">
        Thickness:
      </span>
      <span className="text-sm font-medium text-gray-900">
        {item.thicknessMm}mm
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm font-medium text-gray-900">
        Length:
      </span>
      <span className="text-sm font-medium text-gray-900">
        {item.sheetLengthMm}mm
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm font-medium text-gray-900">
        Width:
      </span>
      <span className="text-sm font-medium text-gray-900">
        {item.sheetWidthMm}mm
      </span>
    </div>
    {typeof item.totalSqm === "number" && (
      <div className="flex justify-between">
        <span className="text-sm font-medium text-gray-900">
          Total area:
        </span>
        <span className="text-sm font-medium text-gray-900">
          {item.totalSqm.toFixed(1)}sqm
        </span>
      </div>
    )}
    <div className="flex justify-between">
      <span className="text-sm font-medium text-gray-900">
        Rate per unit:
      </span>
      <span className="text-sm font-medium text-gray-900">
        {typeof item.rate === "number" ? `₹${item.rate.toFixed(2)}` : 'Not set'}
      </span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm font-medium text-gray-900">
        Current stock:
      </span>
      <span
        className={`text-sm font-medium ${
          item.currentQuantity === 0
            ? "text-red-600"
            : item.currentQuantity < 10
            ? "text-orange-600"
            : "text-green-600"
        }`}
      >
        {item.currentQuantity} units
      </span>
    </div>
  </div>

  {/* Stock Valuation - Minimalist Design */}
  {(() => {
    // Calculate stock valuation with fallback
    let stockValuation = item.stockValuation || 0;
    
    // Fallback calculation for items without stockValuation
    if (!stockValuation && item.rate && item.thicknessMm && item.sheetLengthMm && item.sheetWidthMm && item.currentQuantity) {
      // Formula: total area * thickness * rate
      // Total area = (sheet width * sheet length * quantity) / 1,000,000
      const totalArea = (item.sheetLengthMm * item.sheetWidthMm * item.currentQuantity) / 1_000_000;
      stockValuation = totalArea * item.thicknessMm * item.rate;
    }
    
    return (
      <div className="flex justify-between items-center py-2 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-700">
          Stock Valuation
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {stockValuation > 0 ? `₹${stockValuation.toFixed(2)}` : 'N/A'}
        </span>
      </div>
    );
  })()}

  {/* Action buttons */}
  <div className="flex flex-col gap-2 mt-auto">
    {isAdmin && (
      <button
        onClick={() => {
          setSelectedItem(item);
          setShowAddModal(true);
        }}
        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        + Add
      </button>
    )}
    {canReduce && (
      <button
        onClick={() => {
          setSelectedItem(item);
          setShowUseModal(true);
        }}
        disabled={item.currentQuantity === 0}
        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        – Reduce
      </button>
    )}
  </div>
</div>



          ))}
        </div>
      )}

      {/* Modals */}
      {isAdmin && showAddModal && selectedItem && (
        <AddStockModal
          item={selectedItem}
          onConfirm={handleAddStock}
          onClose={() => {
            setShowAddModal(false);
            setSelectedItem(null);
          }}
        />
      )}

      {canReduce && showUseModal && selectedItem && (
        <UseStockModal
          item={selectedItem}
          onConfirm={handleUseStock}
          onClose={() => {
            setShowUseModal(false);
            setSelectedItem(null);
          }}
        />
      )}

      {isAdmin && showEditModal && selectedItem && (
        <EditInventoryModal
          item={selectedItem}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          onUpdated={(updated: InventoryItem) => {
            setItems((prev) =>
              prev.map((i) => (i._id === updated._id ? updated : i))
            );
          }}
        />
      )}
    </div>
  );
};

export default InventoryManagement;
