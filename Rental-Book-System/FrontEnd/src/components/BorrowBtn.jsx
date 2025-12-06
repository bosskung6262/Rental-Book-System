// FrontEnd/src/components/BorrowBtn.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, CheckCircle, Clock, Ticket } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import Swal from "sweetalert2";

const BorrowBtn = ({ book, hours = 168, className = "", label = "Borrow Now", onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [isBorrowed, setIsBorrowed] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [queueInfo, setQueueInfo] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [userBorrowCount, setUserBorrowCount] = useState(0);
  const [userBorrowLimit, setUserBorrowLimit] = useState(5);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const checkUserStatus = async () => {
      if (!user || !book) {
        setCheckingStatus(false);
        return;
      }
      setCheckingStatus(true);
      try {
        const targetBookId = String(book.book_id || book.id || book.google_id);
        const [borrowedBooks, reservations] = await Promise.all([
          api.getBorrowedBooks(),
          api.getMyReservations(),
        ]);
        if (!isMounted) return;

        const myActiveLoan = borrowedBooks.find(
          (b) => String(b.book_id) === targetBookId && b.status === "active"
        );
        setIsBorrowed(!!myActiveLoan);
        setUserBorrowCount(borrowedBooks.filter((b) => b.status === "active").length);

        const myReservation = reservations.find(
          (r) => String(r.book_id) === targetBookId && ["active", "ready"].includes(r.status)
        );
        setIsReserved(!!myReservation);
        if (myReservation) {
          setQueueInfo(myReservation.queue_position || myReservation.queue_no + 1);
        }

        setUserBorrowLimit(user.borrow_limit || 5);
      } catch (err) {
        console.error("checkUserStatus error:", err);
      } finally {
        if (isMounted) setCheckingStatus(false);
      }
    };
    checkUserStatus();
    return () => { isMounted = false; };
  }, [book, user]);

  const handleBorrow = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");

    if (userBorrowCount >= userBorrowLimit) {
      Swal.fire({
        icon: "error",
        title: "Limit Reached",
        text: `You can only borrow ${userBorrowLimit} books at a time.`,
        confirmButtonColor: "#d33",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Borrow?",
      text: `Borrow "${book.title}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0770ad",
      confirmButtonText: "Yes, Borrow it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const bookId = String(book.book_id || book.id || book.google_id);
      const totalHours = parseFloat(hours) || 168; // ✅ ใช้ hours จาก props
      
      console.log("🚀 Borrowing book:", { bookId, hours: totalHours });

      await api.borrowBook(bookId, totalHours);

      setIsBorrowed(true);
      if (onUpdate) await onUpdate();

      Swal.fire({
        icon: "success",
        title: "Borrowed Successfully!",
        text: "The book has been added to your shelf.",
        showCancelButton: true,
        confirmButtonText: "Go to My Shelf",
        cancelButtonText: "OK",
        confirmButtonColor: "#0770ad",
        cancelButtonColor: "#6b7280",
      }).then((res) => {
        if (res.isConfirmed) navigate("/borrow");
      });
    } catch (error) {
      console.error("Borrow error:", error);
      const errorMsg = error.response?.data || error.message || "Failed to borrow book";
      Swal.fire({
        icon: "error",
        title: "Borrow Failed",
        text: errorMsg,
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReserveClick = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");

    const { value: duration } = await Swal.fire({
      title: "Join Waitlist",
      html: `
        <div class="text-left">
          <p class="mb-4">This book is currently borrowed.</p>
          <p class="font-bold mb-2">📅 Select borrow duration:</p>
          <p class="text-sm text-gray-600 mb-3">When it's your turn, we'll automatically borrow the book for this duration!</p>
        </div>
      `,
      input: "select",
      inputOptions: {
        0.083: "5 Minutes",
        0.167: "10 Minutes",
        0.25: "15 Minutes",
        0.5: "30 Minutes",
        0.75: "45 Minutes",
        1: "1 Hour",
        3: "3 Hours",
        6: "6 Hours",
        12: "12 Hours",
        24: "1 Day",
        72: "3 Days",
        168: "1 Week ⭐",
        336: "2 Weeks",
        504: "3 Weeks",
        720: "30 Days",
      },
      inputValue: "168",
      showCancelButton: true,
      confirmButtonText: "Join Queue",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#6b7280",
      inputValidator: (value) => {
        if (!value) return "Please select a duration!";
      },
    });

    if (!duration) return;

    setLoading(true);
    try {
      const bookId = String(book.book_id || book.id || book.google_id);
      const hoursValue = parseFloat(duration);
      const response = await api.createReservation(bookId, hoursValue);

      console.log("✅ Reservation response:", response);

      setIsReserved(true);
      const queuePos = response.queue_position || 1;
      setQueueInfo(queuePos);

      if (onUpdate) await onUpdate();

      const getDurationText = (h) => {
        if (h < 1) return `${Math.round(h * 60)} minutes`;
        if (h < 24) return `${h} hour${h > 1 ? 's' : ''}`;
        if (h < 168) return `${h / 24} day${h / 24 > 1 ? 's' : ''}`;
        return `${h / 168} week${h / 168 > 1 ? 's' : ''}`;
      };

      Swal.fire({
        icon: "success",
        title: "Reserved Successfully!",
        html: `
          <div>
            <p class="text-lg mb-2">You are <span class="text-3xl font-bold text-orange-500">#${queuePos}</span> in the queue</p>
            <p class="text-sm text-blue-600 font-bold mt-2">✨ Auto-borrow: ${getDurationText(hoursValue)}</p>
            ${response.estimated_available ? `<p class="text-sm text-gray-600 mt-2">📅 Est. available: ${new Date(response.estimated_available).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>` : ''}
            <p class="text-sm text-gray-500 mt-3">When it's your turn, we'll automatically borrow it for you!</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Go to My Reservations",
        cancelButtonText: "OK",
        confirmButtonColor: "#0770ad",
        cancelButtonColor: "#6b7280",
      }).then((res) => {
        if (res.isConfirmed) navigate("/borrow");
      });
    } catch (err) {
      console.error("Reserve error:", err);
      const errorMsg = err.response?.data || err.message || "Failed to reserve book";
      Swal.fire({
        icon: "error",
        title: "Reservation Failed",
        text: errorMsg,
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <button disabled className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
        Checking...
      </button>
    );
  }

  if (isBorrowed) {
    return (
      <button onClick={() => navigate("/borrow")} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all shadow-md ${className}`}>
        <CheckCircle className="w-5 h-5" />
        In Your Shelf
      </button>
    );
  }

  if (isReserved) {
    return (
      <button onClick={() => navigate("/borrow")} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-50 text-purple-700 border-2 border-purple-200 hover:bg-purple-100 transition-all ${className}`}>
        <Clock className="w-5 h-5" />
        Reserved {queueInfo ? `(#${queueInfo})` : ""}
      </button>
    );
  }

  if (book.status && book.status !== "available") {
    return (
      <button onClick={handleReserveClick} disabled={loading} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ticket className="w-5 h-5" />}
        {loading ? "Joining..." : "Join Waitlist"}
      </button>
    );
  }

  return (
    <button onClick={handleBorrow} disabled={loading || userBorrowCount >= userBorrowLimit} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0770ad] text-white hover:bg-[#055a8c] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
      {loading ? "Borrowing..." : label}
    </button>
  );
};

export default BorrowBtn;