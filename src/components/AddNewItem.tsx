//src\components\AddNewItem.tsx
import React, { useState } from "react";
import { Package, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import toast from "react-hot-toast";
interface AddNewItemProps {
  onItemAdded?: () => void;
}
const defaultFormData = {
  thickness: "",
  sheetSize: "",
  brand: "",
  type: "",
  initialQuantity: "",
};
const AddNewItem: React.FC<AddNewItemProps> = ({ onItemAdded }) => {
  const [formData, setFormData] = useState(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "Admin";
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("You do not have permission to add inventory items.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiService.createInventoryItem({
        thickness: formData.thickness.trim(),
        sheetSize: formData.sheetSize.trim(),
        brand: formData.brand.trim(),
        type: formData.type.trim(),
        initialQuantity: parseInt(formData.initialQuantity, 10),
      });
      if (response.success) {
        toast.success(response.message || "Inventory item added successfully!");
        setFormData(defaultFormData);
        onItemAdded?.();
      } else {
        toast.error(response.message || "Failed to add inventory item.");
      }
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-600">
        You do not have permission to view this page.
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Add New Inventory Item
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {["thickness", "sheetSize", "brand", "type"].map((field) => {
                const label = field
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (s) => s.toUpperCase());
                return (
                  <div key={field}>
                    <label
                      htmlFor={field}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {label}
                    </label>
                    <input
                      type="text"
                      id={field}
                      name={field}
                      value={(formData as any)[field]}
                      onChange={handleChange}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                );
              })}
            </div>

            <div>
              <label
                htmlFor="initialQuantity"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Initial Quantity
              </label>
              <input
                type="number"
                id="initialQuantity"
                name="initialQuantity"
                value={formData.initialQuantity}
                onChange={handleChange}
                placeholder="Enter initial quantity"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {isSubmitting ? "Adding Item..." : "Add Item to Inventory"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default AddNewItem;
