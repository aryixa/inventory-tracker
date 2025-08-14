// src/components/UserManagement.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Plus, Key, User } from 'lucide-react';
import { User as UserType, ApiResponse, Role, AdminCreateUserInput } from '../types';
import apiService from '../services/api';
import CreateUserModal from './modals/CreateUserModal';
import ChangePasswordModal from './modals/ChangePasswordModal';
import toast from 'react-hot-toast';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Initialize to false

  // NEW: role filter state
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');

  // We use a ref to track if the effect has already run
  const hasLoadedRef = useRef(false);

  const loadUsers = async (showToast = false) => {
    try {
      setIsLoading(true);
      const response: ApiResponse<UserType[]> = await apiService.getUsers();
      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data);
        if (showToast) {
          toast.success('Users loaded successfully.');
        }
      } else {
        console.error('API call was successful but returned invalid data format:', response);
        setUsers([]);
        toast.error('Failed to parse user data.');
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error(error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadUsers(true);
      hasLoadedRef.current = true;
    }
  }, []);

  const handleCreateUser = async (
    username: string,
    password: string,
    role: Extract<Role, 'User' | 'Viewer'>
  ) => {
    const payload: AdminCreateUserInput = { username, password, role };
    try {
      const response = await apiService.createUser(payload);
      if (response.success) {
        await loadUsers();
        setShowCreateModal(false);
        toast.success(response.message || `User "${username}" (${role}) created successfully!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!selectedUser) return;
    try {
      const response = await apiService.changeUserPassword(selectedUser._id, newPassword);
      if (response.success) {
        toast.success(response.message || `Password updated for ${selectedUser.username}`);
        setShowPasswordModal(false);
        setSelectedUser(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    }
  };

  const roleBadgeClass = (role: Role) => {
    switch (role) {
      case 'Admin':
        return 'bg-blue-100 text-blue-800';
      case 'User':
        return 'bg-green-100 text-green-800';
      case 'Viewer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // NEW: list of available filters
  const roleFilters: Array<'All' | Role> = ['All', 'Admin', 'User', 'Viewer'];

  // NEW: derived filtered users
  const filteredUsers = useMemo(() => {
    return roleFilter === 'All' ? users : users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Create New User
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">System Users</h2>
                <p className="text-xs sm:text-sm text-gray-600">Manage user accounts and permissions</p>
              </div>

              {/* NEW: Role filter control */}
              <div className="flex items-center gap-2">
                {roleFilters.map((rf) => {
                  const isActive = rf === roleFilter;
                  return (
                    <button
                      key={rf}
                      onClick={() => setRoleFilter(rf)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      aria-pressed={isActive}
                    >
                      {rf}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-4 sm:px-6 py-8 text-sm text-gray-500" colSpan={3}>
                      No users found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{u.username}</div>
                            <div className="text-xs text-gray-500">ID: {u._id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(u.role)}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.role !== 'Admin' && (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowPasswordModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1 text-sm"
                          >
                            <Key className="w-4 h-4" />
                            Change Password
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-8 bg-blue-50 rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">User Management Information</h3>
        <ul className="space-y-2 text-xs sm:text-sm text-blue-700">
          <li>• New user accounts are created with a secure password you specify</li>
          <li>• Users should change their password after first login for security</li>
          <li>• Usernames must be unique across the system</li>
          <li>• Passwords must be at least 6 characters long with mixed case and numbers</li>
        </ul>
      </div>

      {showCreateModal && (
        <CreateUserModal onConfirm={handleCreateUser} onClose={() => setShowCreateModal(false)} existingUsers={users} />
      )}

      {showPasswordModal && selectedUser && (
        <ChangePasswordModal
          user={selectedUser}
          onConfirm={handleChangePassword}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
