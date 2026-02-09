import React, { useEffect, useMemo, useState } from "react";
import apiService from "../services/api";
import toast from "react-hot-toast";
import { InventoryItem } from "../types";

const CategoriesView: React.FC = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiService.getInventoryCategories();
        if (response.success) {
          setCategories(response.data || []);
        } else {
          toast.error(response.message || "Failed to fetch categories");
        }
      } catch (error: any) {
        console.error("Error fetching categories:", error);
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch categories";
        toast.error(msg);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const handleCategoryClick = async (category: string) => {
    setSelectedCategory(category);
    setIsLoadingItems(true);
    setItems([]);

    try {
      const response = await apiService.getInventoryItemsByCategory(category);
      if (response.success) {
        setItems(response.data || []);
      } else {
        toast.error(response.message || "Failed to fetch items for category");
      }
    } catch (error: any) {
      console.error("Error fetching items by category:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch items for category";
      toast.error(msg);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return items;

    const copy = [...items];
    copy.sort((a, b) => {
      // 1. Primary: thickness (ascending)
      const tA = a.thicknessMm ?? 0;
      const tB = b.thicknessMm ?? 0;
      if (tA !== tB) return tA - tB;

      // 2. Type name alphabetical order
      const typeA = (a.type || "").toLowerCase();
      const typeB = (b.type || "").toLowerCase();
      if (typeA !== typeB) return typeA.localeCompare(typeB);

      // 3. Sheet width (ascending)
      const wA = a.sheetWidthMm ?? 0;
      const wB = b.sheetWidthMm ?? 0;
      if (wA !== wB) return wA - wB;

      // 4. Sheet length (ascending)
      const lA = a.sheetLengthMm ?? 0;
      const lB = b.sheetLengthMm ?? 0;
      return lA - lB;
    });

    return copy;
  }, [items]);

  if (isLoadingCategories) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fetch Categories</h1>
          
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center justify-center">
          <p className="text-gray-700 font-medium mb-1">No categories found</p>
          <p className="text-sm text-gray-500">
            Add inventory items with categories to see them listed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Categories</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click a category to view its items.
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {categories.length} total
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 sm:px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr
                        key={category}
                        className={`cursor-pointer transition-colors ${
                          selectedCategory === category
                            ? "bg-blue-50 text-blue-900"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleCategoryClick(category)}
                      >
                        <td className="px-4 sm:px-6 py-2.5 text-gray-900 truncate">
                          {category}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Items for selected category (desktop / large screens) */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
              <div className="px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">
                    {selectedCategory
                      ? `Items in "${selectedCategory}"`
                      : "Items by category"}
                  </h2>
                  
                </div>
                              </div>

              <div className="flex-1 p-4 sm:p-6">
                {!selectedCategory ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 text-sm">
                    <p>Select a category from the left to view its items.</p>
                  </div>
                ) : isLoadingItems ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <p className="text-gray-700 font-medium mb-1">
                      No items found for this category
                    </p>
                    <p className="text-xs text-gray-500">
                      Add inventory items under this category to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Thickness
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Length
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Width
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sortedItems.map((item) => (
                          <tr key={item._id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">
                              {item.thicknessMm || 0}mm
                            </td>
                            <td className="px-3 py-2 text-gray-900">
                              {item.type || 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-gray-900">
                              {item.sheetLengthMm || 0}mm
                            </td>
                            <td className="px-3 py-2 text-gray-900">
                              {item.sheetWidthMm || 0}mm
                            </td>
                            <td className="px-3 py-2 text-gray-900">
                              {item.brand || 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-gray-900">
                              {item.currentQuantity || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: modal-style overlay for items when a category is selected */}
      {selectedCategory && (
        <div className="fixed inset-0 z-40 flex items-end justify-center lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              // Close the modal on mobile
              setSelectedCategory(null);
            }}
          />

          {/* Sheet */}
          <div className="relative w-full max-h-[80vh] bg-white rounded-t-2xl shadow-lg border-t border-gray-200 p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Items in "{selectedCategory}"
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sorted by: thickness → type → length → width
                </p>
              </div>
              <button
                  type="button"
                  className="text-xs font-medium text-gray-500 hover:text-gray-800"
                  onClick={() => {
                    setSelectedCategory(null);
                  }}
                >
                  Close
                </button>
            </div>

            {isLoadingItems ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : sortedItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-700 font-medium mb-1">
                  No items found for this category
                </p>
                <p className="text-xs text-gray-500">
                  Add inventory items under this category to see them here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thickness
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Length
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Width
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedItems.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">
                          {item.thicknessMm || 0}mm
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {item.type || 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {item.sheetLengthMm || 0}mm
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {item.sheetWidthMm || 0}mm
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {item.brand || 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {item.currentQuantity || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesView;
