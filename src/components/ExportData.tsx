import React, { useState, useEffect } from 'react';
import { Download, Package, Clock, FileDown } from 'lucide-react';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const ExportData: React.FC = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    totalTransactions: 0,
    additionTransactions: 0,
    reductionTransactions: 0,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Removed the limit to ensure all items are fetched for accurate stats
      const [inventoryResponse, transactionStatsResponse] = await Promise.all([
        apiService.getInventoryItems(),
        apiService.getTransactionStats(),
      ]);

      if (inventoryResponse.success) {
        const items = inventoryResponse.data || [];
        const totalStock = items.reduce((sum: number, item: any) => sum + item.currentQuantity, 0);
        
        setStats(prev => ({
          ...prev,
          totalItems: items.length,
          totalStock,
        }));
      }

      if (transactionStatsResponse.success) {
  const transactionStats = transactionStatsResponse.data;
  setStats(prev => ({
    ...prev,
    totalTransactions: transactionStats?.totalTransactions || 0,
    additionTransactions: transactionStats?.totalAdditions || 0,
    reductionTransactions: transactionStats?.totalReductions || 0,
  }));
}

    } catch (error: any) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load export statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportInventory = async () => {
    setIsExporting(true);
    try {
      const blob = await apiService.exportInventory();
      downloadFile(blob, `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Inventory data exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export inventory data');
    } finally {
      setIsExporting(false);
    }
  };

  const exportTransactions = async () => {
    setIsExporting(true);
    try {
      const blob = await apiService.exportTransactions();
      downloadFile(blob, `transactions-export-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Transaction history exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export transaction history');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAll = async () => {
    setIsExporting(true);
    try {
      // Refactored to use await for reliable sequential execution
      await exportInventory();
      await exportTransactions();
      toast.success('All data exported successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Download className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Export Data</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Current Inventory */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Current Inventory</h3>
              <p className="text-xs sm:text-sm text-gray-600">Export all inventory items</p>
            </div>
          </div>

          <div className="space-y-2 mb-4 sm:mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-medium">{stats.totalItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Stock:</span>
              <span className="font-medium">{stats.totalStock} units</span>
            </div>
          </div>

          <button
            onClick={exportInventory}
            disabled={isExporting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <FileDown className="w-4 h-4" />
            Export Inventory
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Transaction History</h3>
              <p className="text-xs sm:text-sm text-gray-600">Export all transactions</p>
            </div>
          </div>

          <div className="space-y-2 mb-4 sm:mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Transactions:</span>
              <span className="font-medium">{stats.totalTransactions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Additions:</span>
              <span className="font-medium text-green-600">{stats.additionTransactions}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Reductions:</span>
              <span className="font-medium text-red-600">{stats.reductionTransactions}</span>
            </div>
          </div>

          <button
            onClick={exportTransactions}
            disabled={isExporting}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <FileDown className="w-4 h-4" />
            Export Transactions
          </button>
        </div>

        {/* Complete Export */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Complete Export</h3>
              <p className="text-xs sm:text-sm text-gray-600">Export everything</p>
            </div>
          </div>

          <div className="space-y-2 mb-4 sm:mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Files Generated:</span>
              <span className="font-medium">2 CSV files</span>
            </div>
            <div className="text-xs text-gray-500">
              <p>• inventory-export-[date].csv</p>
              <p>• transactions-export-[date].csv</p>
            </div>
          </div>

          <button
            onClick={exportAll}
            disabled={isExporting}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export All Data'}
          </button>
        </div>
      </div>

      {/* Export Information */}
      <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Export Information</h3>
        <ul className="space-y-2 text-xs sm:text-sm text-blue-700">
          <li>• Files are exported in CSV format for Excel compatibility</li>
          <li>• All dates are formatted in your local timezone</li>
          <li>• Data includes complete history since system setup</li>
          <li>• Files will download automatically to your browser's download folder</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportData;