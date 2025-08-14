// src/components/AllTransactions.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Search, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '../types';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns'; 

const AllTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { refreshKey } = useData();

  const loadTransactions = useCallback(
    async (showRefresh = false) => {
      try {
        setIsLoading(true);
        const params: any = {
          page: currentPage,
          limit: 20,
          search: searchTerm,
        };

        if (filterType !== 'all') {
          if (filterType === 'addition' || filterType === 'reduction') {
            params.transactionType = filterType;
          } else if (filterType === 'usage' || filterType === 'breakage') {
            params.reductionReason = filterType;
          }
        }

        const response = await apiService.getTransactions(params);

        if (response.success) {
          setTransactions(response.data || []);
          setTotalPages(1);
        } else {
          toast.error(response.message || 'Failed to load transactions');
        }
      } catch (error: any) {
        console.error('Error loading transactions:', error);
        toast.error('Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, filterType, currentPage]
  );
  useEffect(() => {
    const handler = setTimeout(() => {
      loadTransactions();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, loadTransactions, refreshKey, currentPage, filterType]);
 const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), 'dd/MM/yyyy, hh:mm a');
};
  const getTransactionTypeDisplay = (transaction: Transaction) => {
    if (transaction.transactionType === 'addition') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <TrendingUp className="w-3 h-3" />
          Addition
        </span>
      );
    }
    if (transaction.reductionReason === 'usage') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          <TrendingDown className="w-3 h-3" />
          Usage
        </span>
      );
    }
    if (transaction.reductionReason === 'breakage') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          <TrendingDown className="w-3 h-3" />
          Breakage
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
        <TrendingDown className="w-3 h-3" />
        Unknown
      </span>
    );
  };
  const getStockChangeDisplay = (transaction: Transaction) => {
    return (
      <span
        className={`font-medium ${
          transaction.transactionType === 'addition'
            ? 'text-green-600'
            : 'text-red-600'
        }`}
      >
        {transaction.previousQuantity} → {transaction.newQuantity}
      </span>
    );
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
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          All Transactions
        </h1>
      </div>
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search item, user or type..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Types</option>
                <option value="addition">Addition</option>
                <option value="reduction">Reduction</option>
                <option value="usage">Usage</option>
                <option value="breakage">Breakage</option>
              </select>
            </div>
          </div>
        </div>
        <div className="block sm:hidden">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Clock className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id}
                  className="border rounded-lg p-4 shadow-sm bg-white"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">
                      {formatDateTime(transaction.createdAt)}
                    </span>
                    {getTransactionTypeDisplay(transaction)}
                  </div>
                  <div className="text-gray-900 font-medium">
                    {transaction.item_id
                      ? `${transaction.item_id.brand} - ${transaction.item_id.thickness} - ${transaction.item_id.sheetSize} - ${transaction.item_id.type}`
                      : 'Deleted Item'}
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    Quantity: {transaction.quantityChanged}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    User: {transaction.user_id
                      ? transaction.user_id.username
                      : 'Unknown User'}
                  </div>
                  <div className="mt-1">{getStockChangeDisplay(transaction)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Change
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 sm:px-6 py-12 text-center text-gray-500">
                    <Clock className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(transaction.createdAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.item_id
                        ? `${transaction.item_id.brand} - ${transaction.item_id.thickness} - ${transaction.item_id.sheetSize} - ${transaction.item_id.type}`
                        : 'Deleted Item'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {getTransactionTypeDisplay(transaction)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.quantityChanged}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.user_id
                        ? transaction.user_id.username
                        : 'Unknown User'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {getStockChangeDisplay(transaction)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AllTransactions;
