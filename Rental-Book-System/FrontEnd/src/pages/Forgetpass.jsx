import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import api from "../api/axios"; // ✅ เรียกใช้ axios instance จริง

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // ✅ เชื่อมต่อ API จริง (Backend Route: POST /users/forgot-password)
      await api.post("/users/forgot-password", { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "User not found or server error.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-[#0770ad] to-[#298dc5] p-6">
        {/* ✅ เพิ่ม z-10 เพื่อให้แน่ใจว่า Content อยู่เหนือ Background */}
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 text-center relative z-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Check Your Email</h2>
          <p className="text-gray-600 mb-2">We've sent a password reset link to:</p>
          <p className="text-[#0770ad] font-bold mb-6 break-all">{email}</p>
          <p className="text-sm text-gray-500 mb-8">The link will expire in 1 hour.</p>

          <div className="space-y-3">
            {/* ✅ ใช้ button + navigate เพื่อ control flow ให้แม่นยำขึ้น */}
            <button
              onClick={() => navigate("/login")}
              className="block w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-3 rounded-xl font-bold transition-all shadow-md"
            >
              Back to Login
            </button>
            
            <button
              onClick={() => setSuccess(false)}
              className="block w-full text-gray-600 hover:text-gray-800 py-3 font-medium transition-colors"
            >
              Resend Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-[#0770ad] to-[#298dc5] p-6 relative overflow-hidden">
      
      {/* Background Decorations: ✅ เพิ่ม pointer-events-none เพื่อไม่ให้บังการคลิก */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 rounded-bl-[200px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2/5 h-4/5 bg-white/5 rounded-tr-[200px] pointer-events-none" />

      {/* Left Content */}
      <div className="hidden lg:flex flex-col text-white max-w-lg mr-16 z-10 relative">
        <h1 className="text-5xl font-black mb-3">FORGOT PASSWORD?</h1>
        <h3 className="uppercase tracking-wide font-bold mb-4 text-blue-100">Don't worry — we've got you.</h3>
        <p className="text-blue-100 leading-relaxed text-lg">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 z-10 relative">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-500 text-sm">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              disabled={loading}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0770ad]/50 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="animate-spin" /> Sending...</> : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-[#0770ad] font-bold hover:underline text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}