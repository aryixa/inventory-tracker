import React, { useState } from "react";
import { InventoryItem } from "../../types";
import { X } from "lucide-react";

interface BookNowModalProps {
  item: InventoryItem;
  onConfirm: (quantity: number, notes?: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const BookNowModal: React.FC<BookNowModalProps> = ({
  item,
  onConfirm,
  onClose,
  isOpen
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity < 1) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(quantity, notes.trim() || undefined);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const quantityLimit = item.currentQuantity || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Book Item
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-gray-900 mb-2">{item.type}</h3>
              <p className="text-sm text-gray-600">{item.brand}</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Thickness:</span>
                  <span className="font-medium">{item.thicknessMm}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium">{item.sheetLengthMm}×{item.sheetWidthMm}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Stock:</span>
                  <span className="font-medium">{item.currentQuantity} units</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Book *
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={quantityLimit}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum available: {quantityLimit} units
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or special requirements..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
            />
            <p className="mt-1 text-sm text-gray-500">
              {notes.length}/500 characters
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || quantity < 1 || quantity > quantityLimit}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Booking..." : "Book Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookNowModal;
