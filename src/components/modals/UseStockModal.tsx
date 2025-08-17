// src/components/modals/UseStockModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { InventoryItem } from '../../types';

interface UseStockModalProps {
  item: InventoryItem;
  onConfirm: (quantity: number, subType: 'usage' | 'breakage') => void;
  onClose: () => void;
}

const UseStockModal: React.FC<UseStockModalProps> = ({ item, onConfirm, onClose }) => {
  const [quantity, setQuantity] = useState('');
  const [subType, setSubType] = useState<'usage' | 'breakage'>('usage');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (Number.isInteger(qty) && qty > 0) {
      onConfirm(qty, subType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Use Stock</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900">{item.brand}</h4>
          <p className="text-sm text-gray-600">{item.type}</p>
          <p className="text-sm text-gray-600">
            {item.thicknessMm} mm • {item.sheetLengthMm} × {item.sheetWidthMm} mm
          </p>
          <p className="text-sm text-gray-600">
            Current Stock:{' '}
            <span className="font-medium">{item.currentQuantity} units</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Quantity to Use
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={item.currentQuantity}
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Reduction
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="usage"
                  checked={subType === 'usage'}
                  onChange={() => setSubType('usage')}
                  className="mr-2"
                />
                <span className="text-sm">Usage (Normal consumption)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="breakage"
                  checked={subType === 'breakage'}
                  onChange={() => setSubType('breakage')}
                  className="mr-2"
                />
                <span className="text-sm">Breakage (Damaged/Lost)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reduce Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UseStockModal;
