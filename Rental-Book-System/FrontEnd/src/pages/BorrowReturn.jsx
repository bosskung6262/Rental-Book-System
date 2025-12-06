import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Calendar, Clock, CheckCircle, RotateCcw, Trash2, Loader2, 
  ArrowRight, History, Hourglass, XCircle, ChevronLeft, ChevronRight, 
  RefreshCw, BookMarked, ClipboardList, Filter
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import Swal from 'sweetalert2';
import FavBtn from '../components/FavBtn';

const BorrowReturn = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('loans'); 
  const [historyFilter, setHistoryFilter] = useState('all'); // ✅ เพิ่ม filter state
  
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [history, setHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; 

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { 
    setCurrentPage(1); 
    setHistoryFilter('all'); // ✅ รีเซ็ต filter เมื่อเปลี่ยน tab
  }, [activeTab]);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  };

  const getAdaptiveCountdown = (targetDateInput) => {
    if (!targetDateInput) return "Available Now";

    const target = new Date(targetDateInput);
    const diff = target - now;

    if (diff <= 0) return "Ready / Overdue";

    const oneSecond = 1000;
    const oneMinute = oneSecond * 60;
    const oneHour = oneMinute * 60;
    const oneDay = oneHour * 24;
    const oneWeek = oneDay * 7;

    const p = (n) => n.toString().padStart(2, '0');

    if (diff < oneHour) {
        const m = Math.floor(diff / oneMinute);
        const s = Math.floor((diff % oneMinute) / oneSecond);
        return `${p(m)}:${p(s)}`;
    }
    if (diff < oneDay) {
        const h = Math.floor(diff / oneHour);
        const m = Math.floor((diff % oneHour) / oneMinute);
        const s = Math.floor((diff % oneMinute) / oneSecond);
        return `${p(h)}:${p(m)}:${p(s)}`;
    }
    if (diff < oneWeek) {
        const d = Math.floor(diff / oneDay);
        const h = Math.floor((diff % oneDay) / oneHour);
        const m = Math.floor((diff % oneHour) / oneMinute);
        const s = Math.floor((diff % oneMinute) / oneSecond);
        return `${d}:${p(h)}:${p(m)}:${p(s)}`;
    }
    const w = Math.floor(diff / oneWeek);
    const d = Math.floor((diff % oneWeek) / oneDay);
    const h = Math.floor((diff % oneDay) / oneHour);
    const m = Math.floor((diff % oneHour) / oneMinute);
    const s = Math.floor((diff % oneMinute) / oneSecond);
    return `${w}:${d}:${p(h)}:${p(m)}:${p(s)}`;
  };

  const calculateWaitTime = (res) => {
      let targetTime = res.current_holder_due_date 
        ? new Date(res.current_holder_due_date).getTime() 
        : now.getTime();

      if (res.queue_position > 1) {
          const additionalWait = (res.queue_position - 1) * (28 * 24 * 60 * 60 * 1000);
          targetTime += additionalWait;
      }

      return new Date(targetTime);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allLoans, reservationsData] = await Promise.all([
        api.getBorrowedBooks(),
        api.getMyReservations()
      ]);
      
      const activeLoans = allLoans.filter(l => l.status === 'active');
      const activeReservations = reservationsData.filter(r => ['active', 'ready'].includes(r.status));
      
      const allHistory = [
        ...allLoans.map(l => ({
          ...l,
          type: 'loan',
          action: l.status === 'active' ? 'Borrowed' : 'Returned',
          date: l.status === 'active' ? l.loan_date : l.return_date,
          status_label: l.status === 'active' ? 'Active' : 'Completed'
        })),
        ...reservationsData.map(r => ({
          ...r,
          type: 'reservation',
          action: r.status === 'active' ? 'Reserved' : 
                  r.status === 'ready' ? 'Ready to Borrow' :
                  r.status === 'cancelled' ? 'Cancelled' : 
                  r.status === 'completed' ? 'Completed' : 'Expired',
          date: r.reservation_date,
          status_label: r.status.charAt(0).toUpperCase() + r.status.slice(1)
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setLoans(activeLoans);
      setReservations(activeReservations);
      setHistory(allHistory);
      
    } catch (err) { 
      console.error("Error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReturn = async (bookId, title) => {
    const result = await Swal.fire({
      title: 'Return Book?', 
      text: `Return "${title}"?`, 
      icon: 'question',
      showCancelButton: true, 
      confirmButtonColor: '#0770ad', 
      confirmButtonText: 'Yes, Return it!'
    });
    
    if (result.isConfirmed) {
      try { 
        await api.returnBook(bookId); 
        Swal.fire('Success', 'Book returned successfully!', 'success'); 
        fetchData(); 
      } catch (err) { 
        Swal.fire('Error', err.response?.data || 'Failed to return book', 'error'); 
      }
    }
  };

  const handleCancelReservation = async (reservationId, title) => {
    const result = await Swal.fire({
      title: 'Cancel Reservation?', 
      text: `Remove "${title}" from queue?`, 
      icon: 'warning',
      showCancelButton: true, 
      confirmButtonColor: '#d33', 
      confirmButtonText: 'Yes, Cancel it!'
    });
    
    if (result.isConfirmed) {
      try { 
        await api.cancelReservation(reservationId); 
        Swal.fire('Cancelled', 'Reservation cancelled successfully.', 'success'); 
        fetchData(); 
      } catch (err) { 
        Swal.fire('Error', 'Failed to cancel reservation', 'error'); 
      }
    }
  };

  // ✅ ฟังก์ชันลบ History
  const handleClearHistory = async () => {
    const result = await Swal.fire({
      title: 'Clear All History?',
      text: 'This will permanently delete your history. This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Clear All',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setHistory([]);
      Swal.fire('Cleared!', 'Your history has been deleted.', 'success');
    }
  };

  const getCurrentList = () => {
    switch (activeTab) {
        case 'loans': return loans;
        case 'reservations': return reservations;
        case 'history': {
          // ✅ กรอง history ตาม filter
          if (historyFilter === 'borrowed') {
            return history.filter(h => h.type === 'loan' && h.status === 'active');
          }
          if (historyFilter === 'returned') {
            return history.filter(h => h.type === 'loan' && h.status === 'returned');
          }
          return history; // all
        }
        default: return [];
    }
  };

  const currentList = getCurrentList();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentList.length / itemsPerPage);

  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 lg:px-16">
        
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-800 mb-2">My Shelf</h1>
            <p className="text-gray-500">Manage your books and reservations.</p>
          </div>
          <button 
            onClick={fetchData} 
            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-[#0770ad] transition shadow-sm"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
          {[
            { key: 'loans', icon: BookOpen, label: 'Borrowed', count: loans.length },
            { key: 'reservations', icon: Clock, label: 'Reservations', count: reservations.length },
            { key: 'history', icon: ClipboardList, label: 'History', count: history.length }
          ].map(({ key, icon: Icon, label, count }) => (
             <button 
                key={key} 
                onClick={() => setActiveTab(key)} 
                className={`pb-4 px-4 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === key 
                    ? 'text-[#0770ad] border-b-2 border-[#0770ad]' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
             >
                <Icon className="w-4 h-4" />
                {label}
                <span className={`ml-1 text-xs py-0.5 px-2 rounded-full ${
                  activeTab === key ? 'bg-blue-100 text-[#0770ad]' : 'bg-gray-100 text-gray-500'
                }`}>
                    {count}
                </span>
             </button>
          ))}
        </div>

        {/* ✅ Filter สำหรับ History Tab */}
        {activeTab === 'history' && !loading && history.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Filter:</span>
            </div>
            {[
              { key: 'all', label: 'All', count: history.length },
              { key: 'borrowed', label: 'Borrowed', count: history.filter(h => h.type === 'loan' && h.status === 'active').length },
              { key: 'returned', label: 'Returned', count: history.filter(h => h.type === 'loan' && h.status === 'returned').length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => {
                  setHistoryFilter(key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  historyFilter === key
                    ? 'bg-[#0770ad] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label} <span className="ml-1">({count})</span>
              </button>
            ))}
            
            {/* ✅ ปุ่ม Clear History */}
            <button
              onClick={handleClearHistory}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#0770ad]" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {currentItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {currentItems.map((item) => (
                        <div 
                          key={item.loan_id || item.reservation_id || `${item.type}-${item.book_id}-${item.date}`} 
                          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-6 relative overflow-hidden transition hover:shadow-md"
                        >
                            
                            <div className="absolute top-4 right-4 z-10">
                              <FavBtn book={item} />
                            </div>

                            <img 
                                src={item.cover_image} 
                                alt={item.title} 
                                className="w-24 h-36 object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => navigate(`/book/${item.book_id}`)}
                                onError={(e) => e.target.src = 'https://via.placeholder.com/150x220?text=No+Cover'}
                            />

                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 mb-1 truncate pr-8" title={item.title}>
                                      {item.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-3 truncate">{item.author}</p>

                                    {activeTab === 'loans' && (
                                        <>
                                            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-100 w-fit mb-2">
                                                <Hourglass className="w-3 h-3 animate-pulse" />
                                                <span className="text-xs font-bold font-mono tracking-wider">
                                                    {getAdaptiveCountdown(item.due_date)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                              Borrowed: {formatDateTime(item.loan_date)}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                              Due: {formatDateTime(item.due_date)}
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'reservations' && (
                                        <>
                                            <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-2 rounded-lg border border-orange-100 w-fit mb-2">
                                                <Clock className="w-3 h-3 animate-pulse" />
                                                <span className="text-xs font-bold font-mono tracking-wider">
                                                    {getAdaptiveCountdown(calculateWaitTime(item))}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                              Reserved: {formatDateTime(item.reservation_date)}
                                            </div>
                                            {item.status === 'ready' && (
                                              <div className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Ready to Borrow!
                                              </div>
                                            )}
                                            <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-bl-xl z-20">
                                                Queue #{item.queue_position || item.queue_no || 1}
                                            </div>
                                        </>
                                    )}

                                    {activeTab === 'history' && (
                                        <>
                                            <div className={`text-xs mt-2 flex items-center gap-1 font-medium px-2 py-1 rounded w-fit ${
                                              item.type === 'loan' 
                                                ? item.status === 'active'
                                                  ? 'text-green-600 bg-green-50'
                                                  : 'text-blue-600 bg-blue-50'
                                                : item.status === 'active'
                                                  ? 'text-orange-600 bg-orange-50'
                                                  : item.status === 'cancelled'
                                                    ? 'text-gray-600 bg-gray-100'
                                                    : item.status === 'expired'
                                                      ? 'text-red-500 bg-red-50'
                                                      : 'text-green-600 bg-green-50'
                                            }`}>
                                                {item.type === 'loan' ? <BookOpen className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                {item.action}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                              {formatDateTime(item.date)}
                                            </div>
                                            {item.type === 'reservation' && item.queue_position && (
                                              <div className="text-xs text-gray-400">
                                                Queue Position: #{item.queue_position}
                                              </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="mt-4">
                                    {activeTab === 'loans' && (
                                        <button 
                                          onClick={() => handleReturn(item.book_id, item.title)} 
                                          className="w-full py-2 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-[#0770ad] hover:text-white transition-colors text-sm flex items-center justify-center gap-2"
                                        >
                                          <RotateCcw className="w-4 h-4" />
                                          Return Book
                                        </button>
                                    )}
                                    
                                    {activeTab === 'reservations' && (
                                        <div className="flex gap-2">
                                          {item.status === 'ready' && (
                                            <button 
                                              onClick={() => navigate(`/book/${item.book_id}`)} 
                                              className="flex-1 py-2 rounded-lg bg-[#0770ad] text-white font-bold hover:bg-[#055a8c] transition-colors text-sm flex items-center justify-center gap-2"
                                            >
                                              <BookOpen className="w-4 h-4" />
                                              Borrow Now
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => handleCancelReservation(item.reservation_id, item.title)} 
                                            className={`${item.status === 'ready' ? 'flex-1' : 'w-full'} py-2 rounded-lg border border-red-100 text-red-500 font-bold hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2`}
                                          >
                                            <Trash2 className="w-4 h-4" /> 
                                            Cancel
                                          </button>
                                        </div>
                                    )}
                                    
                                    {activeTab === 'history' && (
                                        <button 
                                          onClick={() => navigate(`/book/${item.book_id}`)} 
                                          className="w-full py-2 rounded-lg bg-[#0770ad] text-white font-bold hover:bg-[#055a8c] transition-colors text-sm flex items-center justify-center gap-2"
                                        >
                                          <BookMarked className="w-4 h-4" />
                                          View Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={activeTab === 'loans' ? BookOpen : activeTab === 'reservations' ? Clock : ClipboardList} 
                    title={`No ${activeTab === 'loans' ? 'Borrowed Books' : activeTab === 'reservations' ? 'Active Reservations' : historyFilter === 'borrowed' ? 'Borrowed Books' : historyFilter === 'returned' ? 'Returned Books' : 'History'}`} 
                    desc={activeTab === 'loans' ? "You haven't borrowed any books yet." : activeTab === 'reservations' ? "You don't have any active reservations." : "No activity yet."} 
                    btnText="Browse Books" 
                    onClick={() => navigate('/books')} 
                />
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1} 
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition bg-white"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    <span className="text-sm font-medium text-gray-600 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={currentPage === totalPages} 
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition bg-white"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, desc, btnText, onClick }) => (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-400 mb-6 text-center px-4">{desc}</p>
        <button 
          onClick={onClick} 
          className="px-6 py-2 bg-[#0770ad] text-white rounded-full font-bold hover:bg-[#055a8c] transition flex items-center gap-2"
        >
            {btnText} <ArrowRight className="w-4 h-4" />
        </button>
    </div>
);

export default BorrowReturn;