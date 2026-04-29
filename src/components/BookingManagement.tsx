import React, { useState, useEffect, useCallback } from "react";
import { Booking, BookingStatus } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import apiService from "../services/api";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Clock, AlertCircle, Package, User, Calendar, Trash2 } from "lucide-react";

const BOOKING_CREATED = "booking:created";
const BOOKING_UPDATED = "booking:updated";

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | "all">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { user, isAdmin } = useAuth();
  const socket = useSocket();

  const loadBookings = useCallback(async () => {
    try {
      const params: any = {};
      if (selectedStatus !== "all") {
        params.status = selectedStatus;
      }

      const response = await apiService.getBookings(params);
      if (response.success) {
        setBookings(response.data || []);
      } else {
        toast.error(response.message || "Failed to load bookings");
      }
    } catch (error: any) {
      console.error("Error loading bookings:", error);
      toast.error(error?.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    setIsLoading(true);
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!socket || !user) return;

    const onCreated = (created: Booking) => {
      setBookings((prev) => {
        const next = [created, ...prev];
        return next.filter((b) => 
          selectedStatus === "all" || b.status === selectedStatus
        );
      });
    };

    const onUpdated = (updated: Booking) => {
      setBookings((prev) => {
        const next = prev.map((b) => (b._id === updated._id ? updated : b));
        return next.filter((b) => 
          selectedStatus === "all" || b.status === selectedStatus
        );
      });
    };

    socket.on(BOOKING_CREATED, onCreated);
    socket.on(BOOKING_UPDATED, onUpdated);

    return () => {
      socket.off(BOOKING_CREATED, onCreated);
      socket.off(BOOKING_UPDATED, onUpdated);
    };
  }, [socket, user, selectedStatus]);

  const handleApprove = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const response = await apiService.approveBooking(bookingId);
      if (response.success) {
        toast.success("Booking approved successfully!");
        loadBookings();
      } else {
        toast.error(response.message || "Failed to approve booking");
      }
    } catch (error: any) {
      console.error("Error approving booking:", error);
      toast.error(error?.message || "Failed to approve booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking) return;

    setActionLoading(selectedBooking._id);
    try {
      const response = await apiService.rejectBooking(selectedBooking._id, {
        rejectionReason: rejectionReason.trim() || undefined
      });
      if (response.success) {
        toast.success("Booking rejected successfully!");
        setShowRejectModal(false);
        setSelectedBooking(null);
        setRejectionReason("");
        loadBookings();
      } else {
        toast.error(response.message || "Failed to reject booking");
      }
    } catch (error: any) {
      console.error("Error rejecting booking:", error);
      toast.error(error?.message || "Failed to reject booking");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm("Are you sure you want to permanently delete this booking record?")) {
      return;
    }

    setActionLoading(bookingId);
    try {
      const response = await apiService.deleteBooking(bookingId);
      if (response.success) {
        toast.success("Booking deleted successfully!");
        loadBookings();
      } else {
        toast.error(response.message || "Failed to delete booking");
      }
    } catch (error: any) {
      console.error("Error deleting booking:", error);
      toast.error(error?.message || "Failed to delete booking");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "approved":
        return "text-green-600 bg-green-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      case "cancelled":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? "Booking Management" : "My Bookings"}
        </h1>
        <div className="flex gap-2 group overflow-x-auto scrollbar-hide">
          {Object.values<BookingStatus | "all">(["pending", "approved", "rejected", "all"]).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-16">
          <Package className="mx-auto w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No bookings found
          </h3>
          <p className="text-gray-600">
            {selectedStatus === "all"
              ? "No bookings have been created yet."
              : `No ${selectedStatus} bookings found.`}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {booking.itemId?.type || 'Unknown Item'}
                        </div>
                        <div className="text-gray-500 break-words">
                          {booking.itemId?.brand || 'Unknown Brand'} • {booking.itemId?.thicknessMm || 0}mm • {booking.itemId?.sheetLengthMm || 0}×{booking.itemId?.sheetWidthMm || 0}mm
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        {booking.userId?.username || 'Unknown User'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {booking.quantity} units
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span className="ml-1">
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {booking.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(booking._id)}
                                disabled={actionLoading === booking._id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Approve"
                              >
                                {actionLoading === booking._id ? <span className="animate-spin inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></span> : <CheckCircle className="w-5 h-5" />}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading === booking._id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Reject"
                              >
                                {actionLoading === booking._id ? <span className="animate-spin inline-block w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full"></span> : <XCircle className="w-5 h-5" />}
                              </button>
                            </>
                          )}
                          {(booking.status === "approved" || booking.status === "rejected") && (
                            <button
                              onClick={() => handleDelete(booking._id)}
                              disabled={actionLoading === booking._id}
                              className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                              title="Delete permanently"
                            >
                              {actionLoading === booking._id ? <span className="animate-spin inline-block w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full"></span> : <Trash2 className="w-5 h-5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Reject Booking
              </h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedBooking(null);
                  setRejectionReason("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReject();
              }}
              className="p-6"
            >
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to reject this booking for {selectedBooking.quantity} units of {selectedBooking.itemId?.type || 'Unknown Item'}?
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  id="rejectionReason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  maxLength={500}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {rejectionReason.length}/500 characters
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedBooking(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === selectedBooking._id}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === selectedBooking._id ? "Rejecting..." : "Reject Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
