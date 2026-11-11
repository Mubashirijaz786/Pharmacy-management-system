import React, { useContext } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppProvider, AppContext } from "./context/AppContext";
import { MainLayout } from "./layouts/MainLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { POS } from "./pages/POS";
import { Medicines } from "./pages/Medicines";
import { Inventory } from "./pages/Inventory";
import { Suppliers } from "./pages/Suppliers";
import { Customers } from "./pages/Customers";
import { Prescriptions } from "./pages/Prescriptions";
import { Purchases } from "./pages/Purchases";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Returns } from "./pages/Returns";
import { Invoices } from "./pages/Invoices";

// Smart Role-Based Homepage Router
const Home = () => {
  const { currentUser } = useContext(AppContext);

  if (currentUser?.role === "Cashier") {
    return <POS />;
  }
  if (currentUser?.role === "Pharmacist") {
    return <Prescriptions />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Main ERP Layout Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/medicines" element={<Medicines />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}

export default App;
