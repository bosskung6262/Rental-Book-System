import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import api from "../api/axios";

export default function ResetPassword() {
  const { token } = useParams(); // ✅ รับ token จาก URL
  const navigate = useNavigate();
  
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", success: false });

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setStatus({ ...status, error: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      return setStatus({ ...status, error: "Passwords do not match" });
    }
    
    if (passwords.new.length < 6) {
      return setStatus({ ...status, error: "Password must be at least 6 characters" });
    }

    setStatus({ ...status, loading: true });

    try {
      // ✅ ส่ง token ใน Body แทน URL
      await api.post("/users/reset-password", { 
        token: token,
        newPassword: passwords.new 
      });
      
      setStatus({ loading: false, error: "", success: true });
    } catch (err) {
      setStatus({ 
        loading: false, 
        error: err.response?.data?.message || "Invalid or expired token.", 
        success: false 
      });
    }
  };

  // ✅ เช็คว่ามี Token หรือไม่
  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-[#0770ad] to-[#298dc5] p-6">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Invalid Link</h2>
          <p className="text-gray-600 mb-6">This password reset link is invalid or has expired.</p>
          <button
            onClick={() => navigate("/forget-password")}
            className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-3 rounded-xl font-bold transition-all"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (status.success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-[#0770ad] to-[#298dc5] p-6">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 text-center relative z-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Password Reset!</h2>
          <p className="text-gray-600 mb-8">Your password has been updated successfully.</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-3 rounded-xl font-bold transition-all shadow-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-[#0770ad] to-[#298dc5] p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 rounded-bl-[200px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2/5 h-4/5 bg-white/5 rounded-tr-[200px] pointer-events-none" />

      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 z-10 relative">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">New Password</h2>
          <p className="text-gray-500 text-sm">Create a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPass ? "text" : "password"}
              name="new"
              placeholder="New Password"
              value={passwords.new}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0770ad]/50 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              name="confirm"
              placeholder="Confirm Password"
              value={passwords.confirm}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0770ad]/50 transition-all"
              required
            />
          </div>

          {status.error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-red-700 text-sm font-medium">{status.error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status.loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" /> Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}