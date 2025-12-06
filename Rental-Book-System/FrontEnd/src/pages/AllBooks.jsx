// FrontEnd/src/pages/AllBooks.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Book, Filter, X, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import BookCard from '../components/BookCard';
import apiService from '../services/api';
import apiAxios from '../api/axios';

const AllBooks = () => {
  const [library, setLibrary] = useState([]);
  const [google, setGoogle] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debounce = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // 1. Init Data
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cats, books] = await Promise.all([
          apiAxios.get('/categories'),
          apiService.getBooks()
        ]);
        setCategories(cats.data || []);
        setLibrary(books || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ 2. Auto Suggestions (แก้ไขให้เร็วขึ้นและแม่นยำขึ้น)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    
    if (debounce.current) clearTimeout(debounce.current);
    
    debounce.current = setTimeout(async () => {
      try {
        const res = await apiAxios.get('/books/suggest', {
          params: { query: query.trim() }
        });
        setSuggestions(res.data || []);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Suggestions error:', err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  // ✅ 3. Click Outside
  useEffect(() => {
    const handleClick = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ✅ 4. Keyboard Navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleSearch(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleBookClick(suggestions[selectedIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // ✅ 5. Handle Search
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    try {
      const res = await apiAxios.get('/books/search', { 
        params: { query: query.trim() } 
      });
      setGoogle(res.data || []);
    } catch (err) {
      console.error('Search error:', err);
      setGoogle([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 6. Handle Book Click
  const handleBookClick = (book) => {
    const targetId = book.book_id || book.id || book.google_id;
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    navigate(`/book/${targetId}`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await apiService.getBooks();
      setLibrary(data);
      setGoogle([]);
      setQuery('');
    } finally { 
      setLoading(false); 
    }
  };

  const handleClear = () => {
    setQuery('');
    setGoogle([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Filters
  const allCats = ["All", ...new Set(library.map(b => b.category).filter(Boolean).sort())];
  const filtered = !category || category === 'All' 
    ? library 
    : library.filter(b => {
        const catObj = categories.find(c => String(c.category_id) === String(category));
        return b.category === catObj?.name || b.category_name === catObj?.name;
      });

  // ✅ Google Card Component
  const GoogleCard = ({ book }) => (
    <div 
      onClick={() => handleBookClick(book)}
      className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full"
    >
      <div className="h-56 bg-gray-50 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
        <img 
          src={book.cover_image || "https://via.placeholder.com/150x220?text=No+Cover"} 
          alt={book.title} 
          className="h-full object-contain group-hover:scale-105 transition-transform" 
          loading="lazy"
          onError={(e) => e.target.src = "https://via.placeholder.com/150x220?text=No+Cover"}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
          <span className="bg-white text-[#0770ad] px-4 py-2 rounded-full font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110 shadow-lg">
            View Details
          </span>
        </div>
      </div>
      <h3 className="font-bold leading-tight mb-1 line-clamp-2 group-hover:text-[#0770ad] transition-colors">
        {book.title}
      </h3>
      <p className="text-sm text-gray-500 mb-3 line-clamp-1">
        {book.author || 'Unknown'}
      </p>
      <div className="mt-auto">
        <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0770ad] px-2 py-1 rounded-md border border-blue-100">
          {book.published_year || 'N/A'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <Navbar />
      <div className="container mx-auto px-6 lg:px-16">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-8 gap-4 border-b border-gray-100 pb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Library</h1>
              <p className="text-gray-500">Search and browse our collection</p>
            </div>
            <button 
              onClick={handleRefresh} 
              className="flex items-center gap-2 bg-white text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 transition border border-gray-200"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* ✅ Search Bar with Auto Suggestions */}
          <div className="mb-8 flex flex-col md:flex-row gap-4 relative z-20">
            <div className="flex-1 relative" ref={inputRef}>
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                
                <input 
                  type="text" 
                  placeholder="พิมพ์ชื่อหนังสือหรือผู้แต่ง... (เช่น ความ, harry, steve)" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { 
                    if (suggestions.length > 0) setShowSuggestions(true); 
                  }} 
                  className="w-full pl-14 pr-28 py-4 bg-gray-50 border-2 border-transparent focus:border-[#0770ad]/30 focus:bg-white rounded-xl transition-all outline-none" 
                />
                
                {/* ✅ Loading / Clear Button */}
                {query && (
                  <button 
                    type="button" 
                    onClick={handleClear}
                    className="absolute right-24 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
                
                {/* ✅ Search Button */}
                <button 
                  type="submit" 
                  disabled={!query.trim() || loading}
                  className="absolute right-2 top-2 bottom-2 bg-[#0770ad] text-white px-5 rounded-lg font-bold hover:bg-[#055a8c] disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                </button>
              </form>
              
              {/* ✅ Auto Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {loadingSuggestions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0770ad]" />
                      <span className="ml-3 text-gray-500">กำลังค้นหา...</span>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <>
                      {suggestions.map((book, index) => (
                        <button 
                          key={book.id || book.google_id} 
                          onClick={() => handleBookClick(book)}
                          className={`w-full px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-left transition-colors border-b border-gray-50 last:border-0 ${
                            index === selectedIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <img 
                            src={book.cover_image || "https://via.placeholder.com/50x75?text=No+Cover"} 
                            alt="" 
                            className="w-10 h-14 object-cover rounded bg-gray-200 shadow-sm flex-shrink-0"
                            onError={(e) => e.target.src = "https://via.placeholder.com/50x75?text=No+Cover"}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-gray-800">
                              {book.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              by {book.author || 'Unknown'}
                            </p>
                          </div>
                          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </button>
                      ))}
                      
                      {/* ✅ View All Results Button */}
                      <button
                        onClick={handleSearch}
                        className="w-full p-4 text-center text-[#0770ad] font-bold hover:bg-blue-50 transition-colors border-t-2 border-gray-200"
                      >
                        ดูผลลัพธ์ทั้งหมดสำหรับ "{query}"
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-gray-500 mb-2">ไม่พบหนังสือที่ค้นหา</p>
                      <button
                        onClick={handleSearch}
                        className="text-[#0770ad] font-bold hover:underline text-sm"
                      >
                        ค้นหาจาก Google Books
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* ✅ Category Filter */}
            <div className="relative w-full md:w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0770ad] w-5 h-5 pointer-events-none" />
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full pl-12 pr-8 py-4 bg-blue-50 text-[#0770ad] font-bold rounded-xl cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-[#0770ad]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ Google Search Results */}
          {google.length > 0 && (
            <div className="mb-12 pb-8 border-b border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                  <Search className="w-5 h-5 text-[#0770ad]" /> 
                  Search Results ({google.length})
                </h2>
                <button 
                  onClick={() => setGoogle([])} 
                  className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  Clear Results
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {google.map(book => (
                  <GoogleCard key={book.google_id || book.id} book={book} />
                ))}
              </div>
            </div>
          )}

          {/* ✅ Library Collection */}
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800">
              <Book className="w-5 h-5 text-[#0770ad]" /> 
              Collection ({filtered.length})
            </h2>
            
            {/* Category Filters */}
            {library.length > 0 && (
              <div className="mb-6 flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                {allCats.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => { 
                      const c = categories.find(c => c.name === cat); 
                      setCategory(cat === "All" ? "" : c?.category_id || ""); 
                    }} 
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                      ((cat === "All" && !category) || 
                       (category && categories.find(c => String(c.category_id) === String(category))?.name === cat)) 
                        ? "bg-[#0770ad] text-white shadow-md" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            
            {/* Books Grid */}
            {loading && !google.length ? (
              <div className="text-center py-20">
                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-[#0770ad]" />
                <p className="text-gray-400">Loading library...</p>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filtered.map(book => (
                  <div key={book.id || book.book_id} onClick={() => handleBookClick(book)}>
                    <BookCard book={book} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Book className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-600">No books found</h3>
                <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AllBooks;