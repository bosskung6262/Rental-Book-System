import { Routes, Route, Navigate } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import AllBooks from "./pages/AllBooks";
import BookDetail from "./pages/BookDetail";
import BorrowReturn from "./pages/BorrowReturn";
import Login from "./pages/Login";
import Forgetpass from "./pages/Forgetpass";
import Settings from "./pages/Settings";
import Favbooks from "./pages/Favbooks";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/books" element={<AllBooks />} />
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/borrow" element={<BorrowReturn />} />
          <Route path="/login" element={<Login />} />
          <Route path="/favorites" element={<Favbooks />} />
          <Route path="/forgetpass" element={<Forgetpass />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/hometest" element={<Settings />} />
          <Route path="/register" element={<Navigate to="/login" />} />
          <Route path="/forgetpass" element={<Forgetpass />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
