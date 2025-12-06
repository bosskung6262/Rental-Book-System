import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Settings, ChevronDown, User as UserIcon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isShelfOpen, setIsShelfOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shelfRef = useRef(null);

  const currentPath = location.pathname;
  const isActive = (path) => currentPath === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shelfRef.current && !shelfRef.current.contains(event.target)) {
        setIsShelfOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const underline = [
    "relative",
    "pb-1",
    "after:content-['']",
    "after:absolute",
    "after:left-0",
    "after:bottom-0",
    "after:h-[2px]",
    "after:bg-[#0770ad]",
    "after:transition-all",
    "after:duration-300"
  ].join(" ");

  // ✅ ฟังก์ชันดึงชื่อ User (ปรับปรุงใหม่)
  const getUserName = () => {
    if (!user) return "Guest";
    
    // 1. ให้ความสำคัญกับ First Name มากที่สุด
    if (user.first_name) return user.first_name;
    if (user.firstName) return user.firstName; // เผื่อกรณี state ยังเป็น camelCase
    
    // 2. ถ้าไม่มี First Name ให้ใช้ Username แทน
    if (user.username) return user.username;
    
    // 3. ท้ายที่สุดถ้าไม่มีอะไรเลย ให้ใช้อีเมลส่วนหน้า
    return user.email?.split('@')[0] || "User";
  };

  return (
    <nav className="absolute top-0 left-0 w-full z-50 px-6 md:px-16 py-6 flex items-center justify-between bg-transparent">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-2xl font-bold tracking-widest text-gray-900 uppercase">
          ShelfShare
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <Link to="/books" className={`text-sm font-medium tracking-wide transition-colors ${underline} ${isActive("/books") ? "font-bold text-[#0770ad] after:w-full" : "text-gray-600 hover:text-[#0770ad] after:w-0 hover:after:w-full"}`}>
          Explore
        </Link>

        <div className="relative" ref={shelfRef}>
          <button onClick={() => setIsShelfOpen(!isShelfOpen)} className={`flex items-center gap-1 text-sm font-medium tracking-wide transition-colors ${underline} ${["/favorites", "/borrow"].includes(currentPath) ? "font-bold text-[#0770ad] after:w-full" : "text-gray-600 hover:text-[#0770ad] after:w-0 hover:after:w-full"}`}>
            My Shelf
            <ChevronDown className={`w-4 h-4 transition-transform ${isShelfOpen ? "rotate-180" : ""}`} />
          </button>
          {isShelfOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <Link to="/favorites" className={`px-4 py-2 text-sm transition block relative after:content-[''] after:absolute after:left-4 after:bottom-1 after:h-0.5 after:bg-[#0770ad] after:transition-all after:duration-300 ${isActive("/favorites") ? "font-bold text-[#0770ad] bg-gray-50 after:w-[80%]" : "text-gray-700 hover:text-[#0770ad] hover:bg-gray-50 after:w-0 hover:after:w-[80%]"}`} onClick={() => setIsShelfOpen(false)}>Favorites</Link>
              <Link to="/borrow" className={`px-4 py-2 text-sm transition block relative after:content-[''] after:absolute after:left-4 after:bottom-1 after:h-0.5 after:bg-[#0770ad] after:transition-all after:duration-300 ${isActive("/borrow") ? "font-bold text-[#0770ad] bg-gray-50 after:w-[80%]" : "text-gray-700 hover:text-[#0770ad] hover:bg-gray-50 after:w-0 hover:after:w-[80%]"}`} onClick={() => setIsShelfOpen(false)}>Borrow & Return</Link>
            </div>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            {/* ✅ แสดง First Name ตรงนี้ */}
            <div className="flex items-center gap-2 text-gray-900 font-bold bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <UserIcon className="w-4 h-4 text-[#0770ad]" />
                <span className="text-sm truncate max-w-[150px] capitalize">
                    {getUserName()}
                </span>
            </div>
            
            <button onClick={handleLogout} className="bg-[#0770ad] text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-[#055a8c] transition shadow-md">
                Log Out
            </button>
          </div>
        ) : (
          <Link to="/login" className={`px-8 py-2.5 rounded-full font-bold text-sm transition shadow-md ${isActive("/login") ? "bg-[#055a8c] text-white" : "bg-[#0770ad] text-white hover:bg-[#055a8c]"}`}>Log In</Link>
        )}

        <Link to="/settings" className={`${underline} transition-colors ${isActive("/settings") ? "text-[#0770ad] after:w-full" : "text-gray-400 hover:text-[#0770ad] after:w-0 hover:after:w-full"}`}>
          <Settings className="w-6 h-6" />
        </Link>
      </div>

      <button className="md:hidden text-gray-900" onClick={() => setIsOpen(true)}>
        <Menu className="w-7 h-7" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col p-6">
          <div className="flex justify-between items-center mb-8">
            <span className="text-2xl font-bold uppercase">ShelfShare</span>
            <button onClick={() => setIsOpen(false)}><X className="w-7 h-7" /></button>
          </div>
          <div className="flex flex-col gap-6 text-center">
            
            {/* ✅ แสดง First Name ใน Mobile Menu */}
            {user && (
                <div className="flex flex-col items-center gap-2 mb-4 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[#0770ad] shadow-sm border border-gray-100">
                        <UserIcon className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-lg text-gray-900 capitalize">
                      Hello, {getUserName()}
                    </p>
                </div>
            )}

            <Link to="/books" className={`text-xl font-medium ${isActive("/books") ? "text-[#0770ad] font-bold" : "text-gray-800 hover:text-[#0770ad]"}`} onClick={() => setIsOpen(false)}>Explore</Link>
            <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-xl">
              <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">My Shelf</span>
              <Link to="/favorites" className={`text-lg font-medium ${isActive("/favorites") ? "text-[#0770ad] font-bold" : "text-gray-800 hover:text-[#0770ad]"}`} onClick={() => setIsOpen(false)}>Favorites</Link>
              <Link to="/borrow" className={`text-lg font-medium ${isActive("/borrow") ? "text-[#0770ad] font-bold" : "text-gray-800 hover:text-[#0770ad]"}`} onClick={() => setIsOpen(false)}>Borrow & Return</Link>
            </div>
            <Link to="/settings" className={`text-xl font-medium ${isActive("/settings") ? "text-[#0770ad] font-bold" : "text-gray-800 hover:text-[#0770ad]"}`} onClick={() => setIsOpen(false)}>Settings</Link>
            {user ? (
              <button onClick={handleLogout} className="text-xl font-medium text-red-600 mt-4">Log Out</button>
            ) : (
              <Link to="/login" className={`text-xl font-medium mt-4 ${isActive("/login") ? "text-[#0770ad] font-bold" : "text-[#0770ad]"}`} onClick={() => setIsOpen(false)}>Log In</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;