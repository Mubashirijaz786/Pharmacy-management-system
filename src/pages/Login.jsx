import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import api from "../services/api";
import { IoLockClosedOutline, IoPersonOutline, IoKeyOutline, IoShieldCheckmarkOutline } from "react-icons/io5";

export const Login = () => {
  const { currentUser, setCurrentUser, addToast, logAudit } = useContext(AppContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Attempt Real Backend API Authentication
      const response = await api.post("/auth/login", {
        username: username.trim(),
        password: password
      });

      if (response.data && response.data.token) {
        const userData = {
          id: response.data.userId,
          name: response.data.fullName,
          username: response.data.username,
          role: response.data.role,
          branchId: response.data.branchId,
          branchName: response.data.branchName,
          token: response.data.token,
          expiresAt: response.data.expiresAt
        };

        setCurrentUser(userData);
        localStorage.setItem("pharmacy_currentUser", JSON.stringify(userData));
        logAudit?.("LOGIN_SUCCESS", `User ${userData.name} (${userData.role}) logged in via Cloud API`);
        addToast(`Welcome back, ${userData.name}! (${userData.role})`, "success");

        // Role-based redirection
        if (userData.role === "Cashier") navigate("/pos");
        else if (userData.role === "Pharmacist") navigate("/prescriptions");
        else navigate("/");
        return;
      }
    } catch (apiError) {
      console.warn("Backend API unavailable or invalid credentials. Checking local offline credentials...", apiError);
      
      // 2. Offline / Local Fallback Authentication
      const localUsers = [
        { id: "USR001", name: "John Doe", username: "admin", password: "123", role: "Admin", branchId: "BR001" },
        { id: "USR002", name: "Sarah Smith", username: "cashier", password: "123", role: "Cashier", branchId: "BR001" },
        { id: "USR003", name: "Dr. Robert Chen", username: "pharmacist", password: "123", role: "Pharmacist", branchId: "BR001" },
        { id: "USR004", name: "Emily Watson", username: "manager", password: "123", role: "Manager", branchId: "BR001" }
      ];

      const foundLocal = localUsers.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
      );

      if (foundLocal) {
        const localUserData = {
          id: foundLocal.id,
          name: foundLocal.name,
          username: foundLocal.username,
          role: foundLocal.role,
          branchId: foundLocal.branchId,
          token: "local-offline-session-token"
        };

        setCurrentUser(localUserData);
        localStorage.setItem("pharmacy_currentUser", JSON.stringify(localUserData));
        logAudit?.("LOGIN_OFFLINE", `User ${localUserData.name} logged in using offline credentials`);
        addToast(`Logged in (Offline Mode) as ${localUserData.name}`, "info");

        if (localUserData.role === "Cashier") navigate("/pos");
        else if (localUserData.role === "Pharmacist") navigate("/prescriptions");
        else navigate("/");
        return;
      } else {
        setErrorMessage("Invalid credentials. Please check your username and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleName, userAccount, userPass) => {
    setUsername(userAccount);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 p-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none"></div>
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 space-y-6 relative z-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white font-black text-3xl mb-1.5 shadow-lg shadow-emerald-500/30">
            P
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">PharmaCare ERP</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Enterprise Pharmacy Portal</p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
            <IoLockClosedOutline className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Traditional Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <IoPersonOutline className="w-3.5 h-3.5 text-emerald-600" />
              Username
            </label>
            <input
              type="text"
              required
              placeholder="e.g. admin, cashier, pharmacist"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-400"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <IoKeyOutline className="w-3.5 h-3.5 text-emerald-600" />
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <IoShieldCheckmarkOutline className="w-4 h-4" />
            )}
            <span>{loading ? "Authenticating..." : "Sign In to Portal"}</span>
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
            Demo Profiles
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Quick autofill buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { role: "Admin", user: "admin", pass: "123", desc: "Full Access" },
            { role: "Cashier", user: "cashier", pass: "123", desc: "POS Billing" },
            { role: "Pharmacist", user: "pharmacist", pass: "123", desc: "Rx & Drugs" },
            { role: "Manager", user: "manager", pass: "123", desc: "Reports & Stock" }
          ].map((item) => (
            <button
              key={item.role}
              type="button"
              onClick={() => handleQuickLogin(item.role, item.user, item.pass)}
              className="p-3 text-left border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">{item.role}</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">123</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
            </button>
          ))}
        </div>

        <div className="text-center text-[11px] text-slate-400 font-medium">
          Supports Offline Sign-in & Live .NET Cloud Synchronization
        </div>
      </div>
    </div>
  );
};
