import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Plus, Minus, Search, RefreshCw } from 'lucide-react';
import { InventoryItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import AddStockModal from './modals/AddStockModal';
import UseStockModal from './modals/UseStockModal';
import toast from 'react-hot-toast';
import { useData } from '../contexts/DataContext';
import { useSocket } from '../contexts/SocketContext';

const INVENTORY_CREATED = 'inventory:created';
const INVENTORY_UPDATED = 'inventory:updated';
const INVENTORY_DELETED = 'inventory:deleted';

const InventoryManagement: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user, isLoading: authIsLoading, isAdmin, canReduce } = useAuth();
  const { refreshKey } = useData();
  const socket = useSocket(); // Socket | null (provider present), waits for connect()

  const matchesSearch = useCallback((item: InventoryItem, term: string) => {
    const t = term.trim().toLowerCase();
    if (!t) return true;
    return (
      item.brand.toLowerCase().includes(t) ||
      item.type.toLowerCase().includes(t) ||
      String(item.thickness).toLowerCase().includes(t) ||
      item.sheetSize.toLowerCase().includes(t)
    );
  }, []);

  const loadItems = useCallback(
    async (showRefresh = false) => {
      if (authIsLoading) return;
      try {
        if (showRefresh) setIsRefreshing(true);
        const response = await apiService.getInventoryItems({ search: searchTerm });

        if (response.success) {
          setItems(response.data || []);
        } else {
          toast.error(response.message || 'Failed to load inventory items');
        }
      } catch (error: any) {
        console.error('Error loading items:', error);
        toast.error(error?.message || 'Failed to load inventory items');
      } finally {
        setIsLoading(false);
        if (showRefresh) setIsRefreshing(false);
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

  // Real-time socket listeners
  useEffect(() => {
    if (!socket || !user) return;

    const onCreated = (created: InventoryItem) => {
    setItems(prev => {
        const next = [created, ...prev];
        return next.filter(i => matchesSearch(i, searchTerm));
    });
};

    const onUpdated = (updated: InventoryItem) => {
      setItems(prev => {
        const next = prev.map(i => (i._id === updated._id ? updated : i));
        return next.filter(i => matchesSearch(i, searchTerm));
      });
    };

    const onDeleted = (payload: { id: string } | string) => {
      const id = typeof payload === 'string' ? payload : payload?.id;
      if (!id) return;
      setItems(prev => prev.filter(i => i._id !== id));
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
      toast.error('Only admins can add stock.');
      return;
    }

    try {
      const response = await apiService.updateInventoryQuantity(selectedItem._id, {
        transactionType: 'addition',
        quantityChanged: quantity,
      });

      if (response.success) {
        toast.success(response.message || 'Stock added successfully!');
        setShowAddModal(false);
        setSelectedItem(null);
      } else {
        toast.error(response.message || 'Failed to add stock');
      }
    } catch (error: any) {
      console.error('Add stock error:', error);
      const status = error?.status ?? error?.response?.status;
      if (status === 403) {
        toast.error(error?.response?.data?.message || 'You do not have permission to add stock.');
      } else {
        toast.error(error?.message || 'Failed to add stock');
      }
    }
  };

  const handleUseStock = async (
    quantity: number,
    reductionReason: 'usage' | 'breakage'
  ) => {
    if (!selectedItem || !user) return;
    if (!canReduce) {
      toast.error('Viewers cannot reduce inventory.');
      return;
    }

    try {
      const response = await apiService.updateInventoryQuantity(selectedItem._id, {
        transactionType: 'reduction',
        quantityChanged: quantity,
        reductionReason,
      });

      if (response.success) {
        toast.success(response.message || 'Stock reduced successfully!');
        setShowUseModal(false);
        setSelectedItem(null);
      } else {
        toast.error(response.message || 'Failed to reduce stock');
      }
    } catch (error: any) {
      console.error('Use stock error:', error);
      const status = error?.status ?? error?.response?.status;
      if (status === 403) {
        toast.error(error?.response?.data?.message || 'You do not have permission to reduce inventory.');
      } else {
        toast.error(error?.message || 'Failed to reduce stock');
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
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
          <button
            onClick={() => loadItems(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
              ? 'No items match your search criteria.'
              : 'Get started by adding your first inventory item.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{item.brand}</h3>
                    <p className="text-sm text-gray-600 truncate">{item.type}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Thickness:</span>
                  <span className="text-sm font-medium">{item.thickness}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sheet Size:</span>
                  <span className="text-sm font-medium">{item.sheetSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Stock:</span>
                  <span
                    className={`text-sm font-medium ${
                      item.currentQuantity === 0
                        ? 'text-red-600'
                        : item.currentQuantity < 10
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}
                  >
                    {item.currentQuantity} units
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowAddModal(true);
                    }}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add
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
                    <Minus className="w-4 h-4" />
                    Reduce
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
};

export default InventoryManagement;
