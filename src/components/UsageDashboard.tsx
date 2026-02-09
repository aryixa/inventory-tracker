import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Package, TrendingUp } from "lucide-react";
import { CategoryUsage, UsageDashboardFilters } from "../types";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";
import toast from "react-hot-toast";
import { useData } from "../contexts/DataContext";
import { format, isValid } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const UsageDashboard: React.FC = () => {
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user, isLoading: authIsLoading } = useAuth();
  const { refreshKey } = useData();

  const loadCategoryUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Build filters object - only include dates if both are provided and valid
      const filters: UsageDashboardFilters = {};

      if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
        const normalizedStart = startDate <= endDate ? startDate : endDate;
        const normalizedEnd = startDate <= endDate ? endDate : startDate;
        filters.startDate = format(normalizedStart, 'yyyy-MM-dd');
        filters.endDate = format(normalizedEnd, 'yyyy-MM-dd');
      }
      
      const response = await apiService.getCategoryUsage(filters);
      if (response.success && response.data) {
        setCategoryUsage(response.data);
      } else {
        toast.error("Failed to load category usage data");
      }
    } catch (error: any) {
      console.error("Error loading category usage:", error);
      toast.error(error.message || "Failed to load category usage data");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!authIsLoading && user) {
      loadCategoryUsage();
    }
  }, [loadCategoryUsage, authIsLoading, user, refreshKey]);

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date && endDate && date > endDate) {
      setStartDate(endDate);
      setEndDate(date);
      return;
    }
    setStartDate(date);
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date && startDate && date < startDate) {
      setEndDate(startDate);
      setStartDate(date);
      return;
    }
    setEndDate(date);
  };

  if (authIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Usage Dashboard
        </h1>
      </div>

      {/* Compact Filters */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center sm:items-end">
            <div className="flex-1 sm:min-w-0">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <DatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  placeholderText="Select start date..."
                  dateFormat="dd/MM/yyyy"
                  isClearable
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={endDate ?? undefined}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                />
              </div>
            </div>
            <div className="flex-1 sm:min-w-0">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <DatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  placeholderText="Select end date..."
                  dateFormat="dd/MM/yyyy"
                  isClearable
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate ?? undefined}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
                />
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Category Usage Details</h2>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : categoryUsage.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No usage data found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Type
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Items Used
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Area (sqm)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryUsage.map((category) => (
                  <tr 
                    key={`${category.category}-${category.thicknessMm}`} 
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-semibold">{category.thicknessMm}MM</div>
                      <div>{category.category || 'Uncategorized'}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-600 font-semibold">
                        {category.totalItemsUsed.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-600 font-semibold">
                        {category.totalSqmArea.toFixed(2)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageDashboard;