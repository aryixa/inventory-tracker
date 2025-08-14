// src/components/Layout.tsx
import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  Package,
  Plus,
  Clock,
  Download,
  Users,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Layout: React.FC = () => {
  const { user, logout, isAdmin, isViewer } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Build menu dynamically based on role
// Build menu dynamically based on role — only filter if user exists
const navItems = user
  ? [
      { path: '/', icon: Package, label: 'Inventory', roles: ['Admin', 'User', 'Viewer'] },
      { path: '/transactions', icon: Clock, label: 'Logs', roles: ['Admin', 'User', 'Viewer'] },
      { path: '/add-item', icon: Plus, label: 'Add', roles: ['Admin'] },
      { path: '/export', icon: Download, label: 'Export', roles: ['Admin'] },
      { path: '/users', icon: Users, label: 'Users', roles: ['Admin'] },
    ].filter(item => item.roles.includes(user.role))
  : [];

  const Sidebar = (
    <div className="w-80 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">Inventory Tracker</h1>
        <div className="mt-2 flex items-center gap-2">
          <UserIcon className="w-4 h-4" />
          <span className="text-sm text-gray-300">{user?.username}</span>
          {isAdmin && (
            <span className="bg-blue-600 text-xs px-2 py-1 rounded">ADMIN</span>
          )}
          {isViewer && (
            <span className="bg-purple-600 text-xs px-2 py-1 rounded">VIEWER</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  const MobileNav = (
    <div className="bg-gray-900 text-white flex justify-around items-center py-2 border-b border-gray-700">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs ${
              isActive ? 'text-blue-400' : 'text-gray-300 hover:text-white'
            }`
          }
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
      {/* Logout icon */}
      <button
        onClick={handleLogout}
        className="flex flex-col items-center text-xs text-gray-300 hover:text-white"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Mobile top nav */}
      <div className="md:hidden">{MobileNav}</div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">{Sidebar}</div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
