// FrontEnd/src/components/BookCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Star, TrendingUp, Book as BookIcon } from 'lucide-react';

const BookCard = ({ book, rank = null, showStats = false }) => {
  const navigate = useNavigate();

  // 🔍 Debug: ดูค่าที่ส่งมาใน Console (กด F12 ดูได้เลย)
  // console.log("Card Data:", book.title, "Borrow:", book.borrow_count, "Queue:", book.queue_count);

  const handleClick = () => {
    const targetId = book.book_id || book.id || book.google_id;
    navigate(`/book/${targetId}`);
  };

  const borrowCount = parseInt(book.borrow_count || 0);
  const queueCount = parseInt(book.queue_count || 0);
  const avgRating = parseFloat(book.avg_rating || book.rating || 0);
  const reviewCount = parseInt(book.review_count || 0);

  return (
    <div 
      onClick={handleClick}
      className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full relative"
    >
      {/* 🏆 Rank Badge */}
      {rank && (
        <div className="absolute -top-3 -left-3 z-20">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-black text-lg w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            #{rank}
          </div>
        </div>
      )}

      {/* 🖼️ Cover Image */}
      <div className="h-56 bg-gray-50 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
        <img 
          src={book.cover_image || "https://via.placeholder.com/150x220?text=No+Cover"} 
          alt={book.title} 
          className="h-full object-contain group-hover:scale-105 transition-transform duration-300" 
          loading="lazy"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/150x220?text=No+Cover";
          }}
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-10">
          <span className="bg-white text-[#0770ad] px-4 py-2 rounded-full font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110 shadow-lg">
            View Details
          </span>
        </div>

        {/* 🏷️ Status Badge */}
        {book.status === 'borrowed' && (
          <div className="absolute top-2 right-2 z-10 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
            <Clock className="w-3 h-3" /> Borrowed
          </div>
        )}

        {/* ✨ BADGES: แสดงตลอดแม้จะเป็น 0 เพื่อทดสอบ */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 z-10">
          
          {/* Queue Badge (สีส้ม) */}
          <div className={`backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1 ${
             queueCount > 0 ? 'bg-orange-500/90' : 'bg-gray-400/80' // ถ้า 0 ให้เป็นสีเทา
          }`}>
            <Users className="w-3 h-3" />
            Queue: {queueCount}
          </div>

          {/* Borrow Badge (สีฟ้า) */}
          <div className={`backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1 ${
             borrowCount > 0 ? 'bg-blue-600/80' : 'bg-gray-400/80' // ถ้า 0 ให้เป็นสีเทา
          }`}>
            <TrendingUp className="w-3 h-3" />
            {borrowCount} Uses
          </div>

        </div>
      </div>

      {/* 📝 Book Info */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-bold text-base leading-tight mb-1 line-clamp-2 group-hover:text-[#0770ad] transition-colors">
          {book.title}
        </h3>
        
        <p className="text-sm text-gray-500 mb-3 line-clamp-1">
          {book.author || 'Unknown Author'}
        </p>

        {/* ⭐ Stats Section (Bottom) */}
        {showStats && (
          <div className="mt-auto pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2 text-sm">
              {avgRating > 0 ? (
                <>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-md border border-yellow-100">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-yellow-700">{avgRating.toFixed(1)}</span>
                  </div>
                  <span className="text-gray-400 text-xs">
                    ({reviewCount})
                  </span>
                </>
              ) : (
                <span className="text-xs text-gray-400 italic">No ratings yet</span>
              )}
            </div>
          </div>
        )}

        {/* 📂 Category */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded-md truncate max-w-[70%]">
            {book.category || book.category_name || 'General'}
          </span>
          {book.published_year && (
            <span className="text-[10px] text-gray-400 font-medium">
              {book.published_year}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;