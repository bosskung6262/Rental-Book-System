import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ✅ เพิ่ม X เข้ามาใน import เพื่อแก้ปัญหาหน้าขาว
import {
  User, Mail, Lock, Camera, Save, LogOut,
  Eye, EyeOff, Loader2, Edit2, X
} from "lucide-react";
import { Toaster, toast } from 'react-hot-toast';
import Swal from "sweetalert2";
import { useAuth } from "../hooks/useAuth";

const Settings = () => {
  const [tab, setTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  // State นี้จะควบคุมการสลับระหว่างโหมดดูและโหมดแก้ไขในหน้าเดียว
  const [isEditing, setIsEditing] = useState(false);
  
  const { user, logout, updateProfile, changePassword } = useAuth();
  const navigate = useNavigate();

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    gender: "",
    address: "",
  });

  const [originalData, setOriginalData] = useState({});

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // ✅ LOAD DATA
  useEffect(() => {
    if (user) {
      // รองรับทั้ง snake_case (จาก DB) และ camelCase
      const initialData = {
        firstName: user.first_name || user.firstName || "",
        lastName: user.last_name || user.lastName || "",
        email: user.email || "",
        mobile: user.mobile || "",
        gender: user.gender || "Other",
        address: user.address || "",
      };
      setProfileForm(initialData);
      setOriginalData(initialData);
    }
  }, [user]);

  // Cancel Edit
  const handleCancelEdit = () => {
    setProfileForm(originalData);
    setIsEditing(false);
  };

  // ✅ Submit Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ส่งข้อมูลกลับไป Update
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        mobile: profileForm.mobile,
        gender: profileForm.gender,
        address: profileForm.address
      });

      toast.success("Profile updated successfully!");
      setOriginalData(profileForm);
      setIsEditing(false); // ปิดโหมดแก้ไขเมื่อสำเร็จ
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await changePassword(passwordForm.current, passwordForm.newPass);
      toast.success("Password changed successfully!");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Logout with SweetAlert2
  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your session.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0770ad',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Logout'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate("/login");
        Swal.fire({
          title: 'Logged Out!',
          text: 'You have been successfully logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  // UI Components
  const TabButton = ({ value, icon: Icon, label }) => (
    <button
      onClick={() => setTab(value)}
      className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 md:py-3 rounded-xl font-medium transition-all text-sm md:text-base ${
        tab === value
          ? "bg-[#0770ad] text-white shadow-md"
          : "text-gray-600 hover:bg-gray-100 hover:text-[#0770ad] bg-white md:bg-transparent border md:border-none border-gray-100"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const Input = ({ label, type = "text", value, onChange, placeholder, required = false, disabled = false, readOnly = false, icon: Icon }) => (
    <div>
      <label className="block font-semibold mb-2 text-gray-700 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
        {required && <span className="text-red-500">*</span>}
        {readOnly && <span className="text-xs text-gray-400 font-normal ml-auto bg-gray-100 px-2 py-0.5 rounded">Read-only</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full p-3 border rounded-xl focus:outline-none transition 
          ${readOnly || disabled
            ? "bg-gray-50 border-gray-200 text-gray-500 cursor-default" 
            : "bg-white border-gray-300 focus:ring-2 focus:ring-[#0770ad] shadow-sm"
          }`}
      />
    </div>
  );

  const PasswordInput = ({ label, value, onChange, show, onToggle }) => (
    <div>
      <label className="block font-semibold mb-2 text-gray-700 flex items-center gap-2">
        <Lock className="w-4 h-4 text-gray-400" />
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          disabled={loading}
          className="w-full p-3 pr-12 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0770ad] transition"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pt-24 pb-12">
      <Toaster position="top-center" reverseOrder={false} />
      
      <div className="container mx-auto py-8 md:py-10 flex flex-col md:flex-row gap-8 md:gap-12 px-6 lg:px-16">
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-1/4 shrink-0 space-y-4 md:space-y-6">
          <h2 className="text-2xl font-bold mb-2 md:mb-6 text-gray-800">Settings</h2>
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <TabButton value="profile" icon={User} label="Profile" />
            <TabButton value="password" icon={Lock} label="Password" />
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 bg-white rounded-3xl shadow-sm p-6 md:p-12 border border-gray-100">
          
          {/* PROFILE TAB */}
          {tab === "profile" && (
            <>
              {/* Header: Avatar & Name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 border-b border-gray-100 pb-8">
                <div className="relative group shrink-0">
                  <img
                    src={`https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=0770ad&color=fff&size=128&bold=true`}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 shadow-md"
                    alt="Profile"
                  />
                </div>
                <div className="flex flex-col text-center sm:text-left">
                    <h3 className="font-black text-3xl text-gray-900 mb-1">{user?.username || "Guest"}</h3>
                    <p className="text-gray-500 font-medium">{user?.email}</p>
                    
                    <div className="mt-3 flex justify-center sm:justify-start">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            user?.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-blue-50 text-[#0770ad] border border-blue-100'
                        }`}>
                            Role: {user?.role || "USER"}
                        </span>
                    </div>
                </div>
              </div>

              {/* Edit Mode Toggle Header */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Personal Information</h3>
                {!isEditing && (
                    <button 
                        type="button" // ✅ ใส่ type="button" กันเหนียวไม่ให้ submit
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 text-[#0770ad] hover:bg-blue-50 px-4 py-2 rounded-lg transition font-semibold"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                    </button>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="First Name"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="First name"
                    readOnly={!isEditing}
                  />
                  <Input
                    label="Last Name"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Last name"
                    readOnly={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Email"
                    icon={Mail}
                    type="email"
                    value={profileForm.email}
                    readOnly={true} // Email มักจะห้ามแก้
                    disabled={true} 
                  />
                  <Input
                    label="Mobile Number"
                    value={profileForm.mobile}
                    onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    readOnly={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block font-semibold mb-2 text-gray-700">Gender</label>
                    <div className={`flex gap-6 mt-3 p-3 rounded-xl border ${!isEditing ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                      {["Male", "Female", "Other"].map((gender) => (
                        <label key={gender} className={`flex items-center gap-2 ${!isEditing ? 'cursor-default opacity-70' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="gender"
                            value={gender}
                            checked={profileForm.gender === gender}
                            onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                            disabled={!isEditing}
                            className="accent-[#0770ad] w-5 h-5"
                          />
                          <span className="text-gray-600">{gender}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-2 text-gray-700">Address</label>
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className={`w-full p-3 border rounded-xl focus:outline-none transition 
                        ${!isEditing 
                            ? "bg-gray-50 border-gray-200 text-gray-500 resize-none cursor-default" 
                            : "bg-white border-gray-300 focus:ring-2 focus:ring-[#0770ad]"
                        }`}
                    rows="3"
                    placeholder="Residential Address..."
                    readOnly={!isEditing}
                  />
                </div>

                {/* Buttons Action (Show only when Editing) */}
                {isEditing && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#0770ad] text-white font-bold hover:bg-[#055a8c] transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Save Changes
                        </button>
                        
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={loading}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                        >
                            {/* ✅ ตอนนี้ X render ได้แล้ว ไม่จอขาวแน่นอน */}
                            <X className="w-5 h-5" />
                            Cancel
                        </button>
                    </div>
                )}

                {/* Logout Zone (Always Visible if not editing) */}
                {!isEditing && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl text-gray-600 bg-gray-100 font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                )}
              </form>
            </>
          )}

          {/* PASSWORD TAB */}
          {tab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Change Password</h2>
              <PasswordInput
                label="Current Password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                show={showPasswords.current}
                onToggle={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              />
              <PasswordInput
                label="New Password"
                value={passwordForm.newPass}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                show={showPasswords.new}
                onToggle={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              />
              <PasswordInput
                label="Confirm New Password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                show={showPasswords.confirm}
                onToggle={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              />
              <button
                type="submit"
                disabled={loading || !passwordForm.current || !passwordForm.newPass || !passwordForm.confirm}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#0770ad] text-white font-bold hover:bg-[#055a8c] transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                Update Password
              </button>
            </form>
          )}

        </main>
      </div>
    </div>
  );
};

export default Settings;