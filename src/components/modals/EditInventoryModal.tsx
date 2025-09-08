import React, { useState } from "react";
import toast from "react-hot-toast";
import apiService from "../../services/api";
import { InventoryItem } from "../../types";

interface EditInventoryModalProps {
  item: InventoryItem;
  onClose: () => void;
  onUpdated: (updated: InventoryItem) => void;
}

const EditInventoryModal: React.FC<EditInventoryModalProps> = ({
  item,
  onClose,
  onUpdated,
}) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    brand: item.brand || "",
    type: item.type || "",
    thicknessMm: item.thicknessMm,
    sheetLengthMm: item.sheetLengthMm,
    sheetWidthMm: item.sheetWidthMm,
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Mm") ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiService.updateInventoryItem(item._id, formData);

      if (res.success && res.data) {
        toast.success(res.message || "Item updated successfully");
        onUpdated(res.data);
        onClose();
      } else {
        toast.error(res.message || "Failed to update item");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Error updating item"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
        <h2 className="text-lg font-bold mb-4">Edit Inventory Item</h2>

        <div className="space-y-4">
          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              name="brand"
              type="text"
              value={formData.brand ?? ""}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input
              name="type"
              type="text"
              value={formData.type ?? ""}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Thickness */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thickness (mm)
            </label>
            <input
              name="thicknessMm"
              type="number"
              step="0.01"
              value={formData.thicknessMm ?? ""}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length (mm)
            </label>
            <input
              name="sheetLengthMm"
              type="number"
              value={formData.sheetLengthMm ?? ""}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>

          {/* Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width (mm)
            </label>
            <input
              name="sheetWidthMm"
              type="number"
              value={formData.sheetWidthMm ?? ""}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditInventoryModal;
