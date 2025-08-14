// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext"; // 🟢 New: Import SocketProvider
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./components/Login";
import InventoryManagement from "./components/InventoryManagement";
import AddNewItem from "./components/AddNewItem";
import AllTransactions from "./components/AllTransactions";
import ExportData from "./components/ExportData";
import UserManagement from "./components/UserManagement";
import { DataProvider } from "./contexts/DataContext";

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route element={<Layout />}>
        {/* Accessible to all roles */}
        <Route
          path="/"
          element={
            <ProtectedRoute roles={["Admin", "User", "Viewer"]}>
              <InventoryManagement />
            </ProtectedRoute>
          }
        />

        {/* Admin-only */}
        <Route
          path="/add-item"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <AddNewItem />
            </ProtectedRoute>
          }
        />
        <Route
          path="/export"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <ExportData />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Read-only for all roles */}
        <Route
          path="/transactions"
          element={
            <ProtectedRoute roles={["Admin", "User", "Viewer"]}>
              <AllTransactions />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>  {/* 🟢 New: Wrap your app with the SocketProvider */}
          <DataProvider>
            <div className="App">
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                }}
              />
            </div>
          </DataProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;