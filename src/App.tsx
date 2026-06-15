import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import { Toaster } from "./components/ui/toast";
import AppLayout from "./layout/AppLayout";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/pos/POS";
import Sales from "./pages/sales/Sales";
import Receipt from "./pages/sales/Receipt";
import Inventory from "./pages/inventory/Inventory";
import ProductForm from "./pages/inventory/ProductForm";
import DailySummary from "./pages/reports/DailySummary";
import ProductSales from "./pages/reports/ProductSales";
import Users from "./pages/settings/Users";
import BusinessSettings from "./pages/settings/BusinessSettings";
import NotFound from "./pages/OtherPage/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Toaster />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Authenticated app */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <RequireAuth minRole="manager">
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route path="/pos" element={<POS />} />
            <Route path="/sales/:id/receipt" element={<Receipt />} />
            <Route
              path="/sales"
              element={
                <RequireAuth minRole="manager">
                  <Sales />
                </RequireAuth>
              }
            />
            <Route
              path="/inventory"
              element={
                <RequireAuth minRole="manager">
                  <Inventory />
                </RequireAuth>
              }
            />
            <Route
              path="/inventory/new"
              element={
                <RequireAuth minRole="manager">
                  <ProductForm />
                </RequireAuth>
              }
            />
            <Route
              path="/inventory/:id/edit"
              element={
                <RequireAuth minRole="manager">
                  <ProductForm />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/daily"
              element={
                <RequireAuth minRole="manager">
                  <DailySummary />
                </RequireAuth>
              }
            />
            <Route
              path="/reports/products"
              element={
                <RequireAuth minRole="manager">
                  <ProductSales />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/users"
              element={
                <RequireAuth minRole="owner">
                  <Users />
                </RequireAuth>
              }
            />
            <Route
              path="/settings/business"
              element={
                <RequireAuth minRole="owner">
                  <BusinessSettings />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
