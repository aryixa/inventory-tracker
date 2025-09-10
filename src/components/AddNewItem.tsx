import React, { useState } from "react";
import { Package, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import toast from "react-hot-toast";

interface AddNewItemProps {
  onItemAdded?: () => void;
}

interface FormState {
  thicknessMm: string;
  sheetLengthMm: string;
  sheetWidthMm: string;
  brand: string;
  type: string;
  initialQuantity: string;
  rate: string;
}

const defaultFormData: FormState = {
  thicknessMm: "",
  sheetLengthMm: "",
  sheetWidthMm: "",
  brand: "",
  type: "",
  initialQuantity: "",
  rate: "",
};

const AddNewItem: React.FC<AddNewItemProps> = ({ onItemAdded }) => {
  const [formData, setFormData] = useState<FormState>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "Admin";

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!isAdmin) {
    toast.error("You do not have permission to add inventory items.");
    return;
  }

  // Convert to numbers
  const thicknessNum = Number(formData.thicknessMm);
  const lengthNum = Number(formData.sheetLengthMm);
  const widthNum = Number(formData.sheetWidthMm);
  const initialQtyNum = Number(formData.initialQuantity);
  const rateNum = Number(formData.rate);

  // Integer-only validation
  // Decimal (max 2dp) validation
if (
  !Number.isFinite(thicknessNum) ||
  thicknessNum <= 0 ||
  !/^\d+(\.\d{1,2})?$/.test(formData.thicknessMm)
) {
  toast.error("Thickness (mm) must be a positive number with up to 2 decimal places.");
  return;
}

  if (!Number.isInteger(lengthNum) || lengthNum <= 0) {
    toast.error("Length (mm) must be a positive whole number.");
    return;
  }
  if (!Number.isInteger(widthNum) || widthNum <= 0) {
    toast.error("Width (mm) must be a positive whole number.");
    return;
  }
  if (!Number.isInteger(initialQtyNum) || initialQtyNum < 0) {
    toast.error("Initial quantity must be a non-negative whole number.");
    return;
  }

  // Rate validation
  if (
    !Number.isFinite(rateNum) ||
    rateNum < 0 ||
    !/^\d+(\.\d{1,2})?$/.test(formData.rate)
  ) {
    toast.error("Rate must be a non-negative number with up to 2 decimal places.");
    return;
  }

  setIsSubmitting(true);
  try {
    const response = await apiService.createInventoryItem({
      thicknessMm: thicknessNum,
      sheetLengthMm: lengthNum,
      sheetWidthMm: widthNum,
      brand: formData.brand.trim(),
      type: formData.type.trim(),
      initialQuantity: initialQtyNum,
      rate: rateNum,
    });

    if (response?.success) {
      toast.success(response.message || "Inventory item added successfully!");
      setFormData(defaultFormData);
      onItemAdded?.();
    } else {
      toast.error(response?.message || "Failed to add inventory item.");
    }
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "An unexpected error occurred.";
    toast.error(msg);
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

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> All fields including the rate per unit are required. The system will automatically calculate stock valuation using the formula: Total Area × Thickness × Rate (where Total Area = Sheet Width × Sheet Length × Quantity ÷ 1,000,000).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label
                  htmlFor="brand"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Brand
                </label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Enter brand"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Type
                </label>
                <input
                  type="text"
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="Enter type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label
                  htmlFor="thicknessMm"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Thickness (mm)
                </label>
                <input
                  type="number"
                  id="thicknessMm"
                  name="thicknessMm"
                  value={formData.thicknessMm}
                  onChange={handleChange}
                  placeholder="Enter thickness in mm"
                  min="0.1"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="sheetLengthMm"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Sheet length (mm)
                </label>
                <input
                  type="number"
                  id="sheetLengthMm"
                  name="sheetLengthMm"
                  value={formData.sheetLengthMm}
                  onChange={handleChange}
                  placeholder="Enter length in mm"
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="sheetWidthMm"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Sheet width (mm)
                </label>
                <input
                  type="number"
                  id="sheetWidthMm"
                  name="sheetWidthMm"
                  value={formData.sheetWidthMm}
                  onChange={handleChange}
                  placeholder="Enter width in mm"
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="initialQuantity"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Initial quantity
              </label>
              <input
                type="number"
                id="initialQuantity"
                name="initialQuantity"
                value={formData.initialQuantity}
                onChange={handleChange}
                placeholder="Enter initial quantity"
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="rate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Rate per unit (₹)
              </label>
              <input
                type="number"
                id="rate"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                placeholder="Enter rate per unit"
                min="0"
                step="0.01"
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
