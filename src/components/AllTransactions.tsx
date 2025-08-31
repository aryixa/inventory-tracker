// src/components/AllTransactions.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { Transaction } from "../types";
import apiService from "../services/api";
import toast from "react-hot-toast";
import { useData } from "../contexts/DataContext";
import { format, isValid } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type ActiveFilter = "none" | "search" | "date" | "type";

const AllTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "addition" | "reduction" | "usage" | "breakage"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("none");

  const { refreshKey } = useData();
  const PAGE_SIZE = 20;

  const loadTransactions = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setIsLoading(true);

        const params: any = {
          page: currentPage,
          limit: PAGE_SIZE,
          search: searchTerm,
        };

        if (filterType !== "all") {
          if (filterType === "addition" || filterType === "reduction") {
            params.transactionType = filterType;
          } else if (filterType === "usage" || filterType === "breakage") {
            params.reductionReason = filterType;
          }
        }

        if (selectedDate && isValid(selectedDate)) {
          params.date = format(selectedDate, "yyyy-MM-dd");
        }

        const response = await apiService.getTransactions(params);

        if (response?.success) {
          setTransactions(response.data || []);
          const pages =
            response.pages ??
            response.meta?.pages ??
            (response.total
              ? Math.max(1, Math.ceil(response.total / PAGE_SIZE))
              : 1);
          setTotalPages(pages);
        } else {
          toast.error(response?.message || "Failed to load transactions");
          setTransactions([]);
          setTotalPages(1);
        }
      } catch (error: any) {
        console.error("Error loading transactions:", error);
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load transactions";
        toast.error(msg);
        setTransactions([]);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    },
    [searchTerm, filterType, currentPage, selectedDate]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      loadTransactions();
    }, 500);
    return () => clearTimeout(handler);
  }, [
    searchTerm,
    loadTransactions,
    refreshKey,
    currentPage,
    filterType,
    selectedDate,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, selectedDate]);

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy, hh:mm a");
  };

  const getTransactionTypeDisplay = (transaction: Transaction) => {
    const t = transaction as any;
    if (t.transactionType === "addition") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <TrendingUp className="w-3 h-3" />
          Addition
        </span>
      );
    }
    if (t.reductionReason === "usage") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          <TrendingDown className="w-3 h-3" />
          Usage
        </span>
      );
    }
    if (t.reductionReason === "breakage") {
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
        Reduction
      </span>
    );
  };

  const getStockChangeDisplay = (transaction: Transaction) => {
    const t = transaction as any;
    return (
      <span
        className={`font-medium ${
          t.transactionType === "addition" ? "text-green-600" : "text-red-600"
        }`}
      >
        {t.previousQuantity} → {t.newQuantity}
      </span>
    );
  };

  const renderItemLabel = (t: Transaction) => {
    const it = (t as any).item_id;
    if (!it) return "Deleted Item";

    // Safely get thickness, handling cases where it might be a string, number, or missing
    const thickness = it.thicknessMm !== undefined && it.thicknessMm !== null
      ? String(it.thicknessMm)
      : 'N/A';

    return `${it.brand} - ${thickness}mm - ${it.sheetLengthMm}x${it.sheetWidthMm}mm - ${it.type}`;
  };

  const toggleFilter = (key: ActiveFilter) => {
    setActiveFilter((prev) => (prev === key ? "none" : key));
  };

  const hasActiveFilters =
    (searchTerm && searchTerm.trim().length > 0) ||
    (selectedDate && isValid(selectedDate)) ||
    filterType !== "all";

  const clearDate = () => {
    setSelectedDate(null);
    setCurrentPage(1);
    setActiveFilter("none");
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    if (activeFilter === "search") setActiveFilter("none");
  };

  const clearType = () => {
    setFilterType("all");
    setCurrentPage(1);
    if (activeFilter === "type") setActiveFilter("none");
  };

  const clearAll = () => {
    setSearchTerm("");
    setSelectedDate(null);
    setFilterType("all");
    setCurrentPage(1);
    setActiveFilter("none");
  };

  if (isLoading) {
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
          {/* Desktop filters — persistent */}
          <div className="hidden sm:flex flex-row gap-4 items-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => {
                  setSelectedDate(date);
                  setCurrentPage(1);
                }}
                placeholderText="Select date..."
                dateFormat="dd/MM/yyyy"
                isClearable
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any);
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

          {/* Mobile filters — collapsed icons + single active input */}
          <div className="sm:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Search"
                aria-pressed={activeFilter === "search"}
                onClick={() => toggleFilter("search")}
                className={`w-10 h-10 grid place-content-center rounded-md border ${
                  activeFilter === "search"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                <Search className="w-5 h-5" />
              </button>

              <button
                type="button"
                aria-label="Date"
                aria-pressed={activeFilter === "date"}
                onClick={() => toggleFilter("date")}
                className={`w-10 h-10 grid place-content-center rounded-md border ${
                  activeFilter === "date"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                <Calendar className="w-5 h-5" />
              </button>

              <button
                type="button"
                aria-label="Type"
                aria-pressed={activeFilter === "type"}
                onClick={() => toggleFilter("type")}
                className={`w-10 h-10 grid place-content-center rounded-md border ${
                  activeFilter === "type"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3">
              {activeFilter === "search" && (
                <input
                  autoFocus
                  type="text"
                  inputMode="search"
                  placeholder="Search item, user or type..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {activeFilter === "date" && (
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => {
                    setSelectedDate(date);
                    setCurrentPage(1);
                    setActiveFilter("none");
                  }}
                  placeholderText="Select date..."
                  dateFormat="dd/MM/yyyy"
                  isClearable
                  withPortal
                  open
                  shouldCloseOnSelect
                  onClickOutside={() => setActiveFilter("none")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              )}

              {activeFilter === "type" && (
                <select
                  autoFocus
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="addition">Addition</option>
                  <option value="reduction">Reduction</option>
                  <option value="usage">Usage</option>
                  <option value="breakage">Breakage</option>
                </select>
              )}
            </div>
          </div>

          {/* Active filter chips + Clear all */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {selectedDate && isValid(selectedDate) && (
                <button
                  type="button"
                  onClick={clearDate}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                  title="Clear date filter"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {format(selectedDate, "dd/MM/yyyy")}
                  <span aria-hidden>×</span>
                </button>
              )}

              {filterType !== "all" && (
                <button
                  type="button"
                  onClick={clearType}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs bg-violet-50 text-violet-700 hover:bg-violet-100 capitalize"
                  title="Clear type filter"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {filterType}
                  <span aria-hidden>×</span>
                </button>
              )}

              {searchTerm.trim().length > 0 && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs bg-amber-50 text-amber-800 hover:bg-amber-100"
                  title="Clear search"
                >
                  <Search className="w-3.5 h-3.5" />“{searchTerm.trim()}”
                  <span aria-hidden>×</span>
                </button>
              )}

              <button
                type="button"
                onClick={clearAll}
                className="ml-auto inline-flex items-center gap-2 px-2.5 py-1.5 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Mobile list */}
        <div className="block sm:hidden">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Clock className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {transactions.map((transaction) => (
                <div
                  key={(transaction as any)._id}
                  className="border rounded-lg p-4 shadow-sm bg-white"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">
                      {formatDateTime((transaction as any).createdAt)}
                    </span>
                    {getTransactionTypeDisplay(transaction)}
                  </div>
                  <div className="text-gray-900 font-medium">
                    {renderItemLabel(transaction)}
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    Quantity: {(transaction as any).quantityChanged}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    User:{" "}
                    {(transaction as any).user_id
                      ? (transaction as any).user_id.username
                      : "Unknown User"}
                  </div>
                  <div className="mt-1">
                    {getStockChangeDisplay(transaction)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date &amp; Time
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
                    className="px-4 sm:px-6 py-12 text-center text-gray-500"
                  >
                    <Clock className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={(transaction as any)._id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime((transaction as any).createdAt)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {renderItemLabel(transaction)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {getTransactionTypeDisplay(transaction)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(transaction as any).quantityChanged}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(transaction as any).user_id
                        ? (transaction as any).user_id.username
                        : "Unknown User"}
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

        {/* Pagination */}
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