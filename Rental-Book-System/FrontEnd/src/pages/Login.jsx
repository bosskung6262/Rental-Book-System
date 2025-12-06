import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const Input = ({ icon: Icon, type = "text", placeholder, value, onChange, required = true, id, disabled, error }) => (
  <div className="relative group">
    <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors w-5 h-5 ${
      error ? 'text-red-500' : 'text-gray-400 group-focus-within:text-[#0770ad]'
    }`} />
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`w-full bg-gray-50 border rounded-xl px-12 py-4 text-gray-700 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        error 
          ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' 
          : 'border-gray-100 focus:ring-[#0770ad]/50 focus:border-[#0770ad]'
      }`}
    />
  </div>
);

const PasswordInput = ({ placeholder, value, onChange, id, disabled, showPw, setShowPw, error }) => (
  <div className="relative group">
    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors w-5 h-5 ${
      error ? 'text-red-500' : 'text-gray-400 group-focus-within:text-[#0770ad]'
    }`} />
    <input
      id={id}
      type={showPw ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
      disabled={disabled}
      className={`w-full bg-gray-50 border rounded-xl px-12 pr-16 py-4 text-gray-700 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
        error 
          ? 'border-red-300 focus:ring-red-500/50 focus:border-red-500' 
          : 'border-gray-100 focus:ring-[#0770ad]/50 focus:border-[#0770ad]'
      }`}
    />
    <button
      type="button"
      onClick={() => setShowPw(!showPw)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0770ad] transition-colors"
      disabled={disabled}
    >
      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  </div>
);

const Login = () => {
  const [tab, setTab] = useState("login");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState({});
  const passwordsMatch = registerForm.password === registerForm.confirmPassword;
  const showPasswordError = registerForm.password && registerForm.confirmPassword && !passwordsMatch;

  // ✅ Handle Login with Better Error Handling
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const result = await login(loginForm.email, loginForm.password);
      
      if (!result.success) {
        // ✅ แยก Error Message ตามกรณี
        const message = result.message || "Login failed";
        
        if (message.toLowerCase().includes("invalid credentials") || 
            message.toLowerCase().includes("incorrect")) {
          setErrors({ 
            login: "Incorrect email or password. Please try again.",
            field: "both" 
          });
        } else if (message.toLowerCase().includes("email")) {
          setErrors({ 
            login: "Email not found. Please check and try again.",
            field: "email" 
          });
        } else if (message.toLowerCase().includes("password")) {
          setErrors({ 
            login: "Incorrect password. Please try again.",
            field: "password" 
          });
        } else {
          setErrors({ login: message, field: "both" });
        }
      }
    } catch (err) {
      setErrors({ 
        login: "Unable to connect to server. Please try again.",
        field: "both" 
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Register with Better Error Handling
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!passwordsMatch) {
      setErrors({ register: "Passwords do not match", field: "password" });
      return;
    }

    if (registerForm.password.length < 6) {
      setErrors({ register: "Password must be at least 6 characters", field: "password" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await register(
        registerForm.name,
        registerForm.email,
        registerForm.password
      );
      
      if (!result.success) {
        const message = result.message || "Registration failed";
        
        // ✅ แยก Error Message
        if (message.toLowerCase().includes("email") && message.toLowerCase().includes("exists")) {
          setErrors({ 
            register: "This email is already registered. Please login instead.",
            field: "email" 
          });
        } else if (message.toLowerCase().includes("invalid email")) {
          setErrors({ 
            register: "Please enter a valid email address.",
            field: "email" 
          });
        } else {
          setErrors({ register: message, field: "all" });
        }
      }
    } catch (err) {
      setErrors({ 
        register: "Unable to connect to server. Please try again.",
        field: "all" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-[#0770ad] to-[#298dc5] p-6 relative overflow-hidden">
      
      <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 rounded-bl-[200px]" />
      <div className="absolute bottom-0 left-0 w-2/5 h-4/5 bg-white/5 rounded-tr-[200px]" />

      <div className="hidden lg:flex flex-col text-white max-w-lg mr-16 z-10">
        <h1 className="text-5xl font-black mb-3">WELCOME BACK!</h1>
        <h3 className="uppercase tracking-wide font-bold mb-4 text-blue-100">
          We're glad to see you again.
        </h3>
        <p className="text-blue-100 leading-relaxed text-lg">
          {tab === "login" 
            ? "To keep connected with us please login with your personal info."
            : "Join us today and start your reading journey!"
          }
        </p>
      </div>

      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 z-10">
        
        <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-full w-fit mx-auto">
          {["login", "register"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setErrors({});
              }}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${
                tab === t
                  ? "bg-white text-[#0770ad] shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* LOGIN FORM */}
        {tab === "login" && (
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign In</h2>
              <p className="text-gray-400 text-sm">Use your email account</p>
            </div>

            <Input
              icon={Mail}
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => {
                setLoginForm({ ...loginForm, email: e.target.value });
                setErrors({});
              }}
              id="login-email"
              disabled={loading}
              error={errors.field === "email" || errors.field === "both"}
            />

            <PasswordInput
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => {
                setLoginForm({ ...loginForm, password: e.target.value });
                setErrors({});
              }}
              id="login-password"
              disabled={loading}
              showPw={showPw}
              setShowPw={setShowPw}
              error={errors.field === "password" || errors.field === "both"}
            />

            {/* ✅ Error Message with Icon */}
            {errors.login && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{errors.login}</p>
              </div>
            )}

            <div className="flex justify-between text-sm items-center">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#0770ad] rounded border-gray-300"
                />
                Remember me
              </label>
              <Link
                to="/forgetpass"
                className="text-[#0770ad] font-bold hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === "register" && (
          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h2>
              <p className="text-gray-400 text-sm">Use your email for registration</p>
            </div>

            <Input
              icon={User}
              placeholder="Full Name"
              value={registerForm.name}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, name: e.target.value });
                setErrors({});
              }}
              id="register-name"
              disabled={loading}
              error={errors.field === "name" || errors.field === "all"}
            />

            <Input
              icon={Mail}
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, email: e.target.value });
                setErrors({});
              }}
              id="register-email"
              disabled={loading}
              error={errors.field === "email" || errors.field === "all"}
            />

            <PasswordInput
              placeholder="Password"
              value={registerForm.password}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, password: e.target.value });
                setErrors({});
              }}
              id="reg-pass"
              disabled={loading}
              showPw={showPw}
              setShowPw={setShowPw}
              error={errors.field === "password" || errors.field === "all"}
            />

            <PasswordInput
              placeholder="Confirm Password"
              value={registerForm.confirmPassword}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, confirmPassword: e.target.value });
                setErrors({});
              }}
              id="reg-pass2"
              disabled={loading}
              showPw={showPw}
              setShowPw={setShowPw}
              error={showPasswordError || errors.field === "password" || errors.field === "all"}
            />

            {showPasswordError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">Passwords do not match</p>
              </div>
            )}

            {registerForm.password && passwordsMatch && !errors.register && (
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-green-700 text-sm font-medium">✓ Passwords match</p>
              </div>
            )}

            {/* ✅ Register Error Message */}
            {errors.register && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">{errors.register}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || showPasswordError}
              className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "SIGN UP"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our{" "}
          <a href="#" className="text-[#0770ad] hover:underline">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-[#0770ad] hover:underline">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
};

export default Login;