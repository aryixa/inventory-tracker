// src/components/modals/CreateUserModal.tsx
import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { User, Role } from '../../types';

interface CreateUserModalProps {
  onConfirm: (username: string, password: string, role: Extract<Role, 'User' | 'Viewer'>) => void;
  onClose: () => void;
  existingUsers: User[];
  isLoading?: boolean; 
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  onConfirm,
  onClose,
  existingUsers,
  isLoading = false
}) => {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Extract<Role, 'User' | 'Viewer'>>('User');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // prevent double submit

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    if (existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      setError('Username already exists');
      return;
    }
    if (password.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    onConfirm(username.trim(), password, role);
  };

  const disableForm = isLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
          <button
            onClick={onClose}
            disabled={disableForm}
            className={`transition-colors ${disableForm ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disableForm}
              required
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disableForm}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={disableForm}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disableForm}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={disableForm}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Extract<Role, 'User' | 'Viewer'>)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={disableForm}
            >
              <option value="User">User</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={disableForm}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                disableForm
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disableForm}
              className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center ${
                disableForm
                  ? 'bg-blue-400 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
