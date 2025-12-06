// FrontEnd/src/pages/Favbooks.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Search, 
  Filter, 
  SortAsc, 
  Trash2, 
  Grid,
  List,
  Download,
  Share2
} from 'lucide-react';
import Swal from 'sweetalert2';
import Navbar from '../components/Navbar';
import BookCard from '../components/BookCard';

const Favbooks = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc'); 
  const [viewMode, setViewMode] = useState('grid');
  const [selectedBooks, setSelectedBooks] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const loadFavorites = () => {
    setLoading(true);
    try {
      const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const favoritesWithTimestamp = storedFavorites.map(book => ({
        ...book,
        addedAt: book.addedAt || Date.now()
      }));
      setFavorites(favoritesWithTimestamp);
    } catch (err) {
      console.error('Failed to load favorites:', err);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
    window.addEventListener('favoritesUpdated', loadFavorites);
    return () => window.removeEventListener('favoritesUpdated', loadFavorites);
  }, []);

  const categories = useMemo(() => {
    return [
      'all',
      ...new Set(favorites.map(book => book.category || book.category_name).filter(Boolean).sort())
    ];
  }, [favorites]);

  const filteredAndSortedBooks = useMemo(() => {
    let result = [...favorites];

    if (selectedCategory !== 'all') {
      result = result.filter(book => (book.category || book.category_name) === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(book =>
        book.title?.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return (b.addedAt || 0) - (a.addedAt || 0);
        case 'date-asc':
          return (a.addedAt || 0) - (b.addedAt || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        default:
          return 0;
      }
    });

    return result;
  }, [favorites, selectedCategory, searchQuery, sortBy]);

  const handleSelectBook = (bookId) => {
    const newSelected = new Set(selectedBooks);
    if (newSelected.has(bookId)) {
      newSelected.delete(bookId);
    } else {
      newSelected.add(bookId);
    }
    setSelectedBooks(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedBooks.size === filteredAndSortedBooks.length) {
      setSelectedBooks(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredAndSortedBooks.map(book => book.id || book.book_id));
      setSelectedBooks(allIds);
      setShowBulkActions(true);
    }
  };

  // ✅ Remove Selected - SweetAlert2
  const handleRemoveSelected = async () => {
    const result = await Swal.fire({
      title: 'Remove from Favorites?',
      html: `Are you sure you want to remove <strong>${selectedBooks.size}</strong> book${selectedBooks.size > 1 ? 's' : ''} from your favorites?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove them',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      const updatedFavorites = favorites.filter(
        book => !selectedBooks.has(book.id || book.book_id)
      );
      
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
      setSelectedBooks(new Set());
      setShowBulkActions(false);
      
      window.dispatchEvent(new Event('favoritesUpdated'));

      Swal.fire({
        title: 'Removed!',
        text: `${selectedBooks.size} book${selectedBooks.size > 1 ? 's' : ''} removed successfully.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // ✅ Clear All - SweetAlert2
  const handleClearAll = async () => {
    const result = await Swal.fire({
      title: 'Clear All Favorites?',
      html: `This will remove <strong>all ${favorites.length} books</strong> from your favorites.<br><span style="color: #ef4444;">This action cannot be undone!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, clear all',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      localStorage.setItem('favorites', JSON.stringify([]));
      setFavorites([]);
      setSelectedBooks(new Set());
      setShowBulkActions(false);
      window.dispatchEvent(new Event('favoritesUpdated'));

      Swal.fire({
        title: 'Cleared!',
        text: 'All favorites have been removed.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // ✅ Export - SweetAlert2
  const handleExport = () => {
    const exportData = filteredAndSortedBooks.map(book => ({
      title: book.title,
      author: book.author,
      category: book.category || book.category_name,
      addedAt: new Date(book.addedAt).toLocaleDateString()
    }));

    const csv = [
      'Title,Author,Category,Added Date',
      ...exportData.map(b => `"${b.title}","${b.author}","${b.category}","${b.addedAt}"`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `favorites-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    Swal.fire({
      title: 'Exported!',
      text: 'Your favorites list has been downloaded.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // ✅ Share - SweetAlert2
  const handleShare = async () => {
    const shareText = `My Favorite Books (${favorites.length}):\n${
      favorites.slice(0, 5).map(b => `• ${b.title} by ${b.author}`).join('\n')
    }${favorites.length > 5 ? '\n...' : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Favorite Books',
          text: shareText
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        Swal.fire({
          title: 'Copied!',
          text: 'Favorites list copied to clipboard.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        Swal.fire({
          title: 'Error',
          text: 'Failed to share favorites.',
          icon: 'error',
          confirmButtonColor: '#0770ad'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <Navbar /> 
      <div className="container mx-auto px-6 lg:px-16">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              My Favorites
            </h1>
            <p className="text-gray-500">
              {favorites.length === 0 
                ? 'No favorites yet' 
                : `${favorites.length} book${favorites.length === 1 ? '' : 's'} in your collection`}
            </p>
          </div>

          {favorites.length > 0 && (
            <div className="flex gap-3">
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition">
                <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition">
                <Share2 className="w-4 h-4" /><span className="hidden sm:inline">Share</span>
              </button>
              <button onClick={handleClearAll} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-100 transition">
                <Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Clear All</span>
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0770ad] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400 font-medium animate-pulse">Loading favorites...</p>
          </div>
        )}

        {!loading && favorites.length === 0 && (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Favorites Yet</h3>
            <p className="text-gray-500 mb-6">Start adding books to your favorites by clicking the heart icon.</p>
            <Link to="/books" className="inline-block bg-[#0770ad] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#055a8c] transition">
              Browse Books
            </Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#0770ad] transition"
                />
              </div>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-[#0770ad] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Grid className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-[#0770ad] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><List className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0770ad] w-5 h-5" />
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full sm:w-auto pl-12 pr-8 py-2.5 bg-blue-50 text-[#0770ad] font-bold rounded-xl outline-none cursor-pointer appearance-none">
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat} ({cat === 'all' ? favorites.length : favorites.filter(b => (b.category || b.category_name) === cat).length})</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <SortAsc className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full sm:w-auto pl-12 pr-8 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl outline-none cursor-pointer appearance-none">
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                </select>
              </div>
              <button onClick={handleSelectAll} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition whitespace-nowrap">
                {selectedBooks.size === filteredAndSortedBooks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        )}

        {showBulkActions && (
          <div className="bg-[#0770ad] text-white rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
            <span className="font-bold">{selectedBooks.size} selected</span>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedBooks(new Set()); setShowBulkActions(false); }} className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition">Cancel</button>
              <button onClick={handleRemoveSelected} className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition flex items-center gap-2"><Trash2 className="w-4 h-4" /> Remove Selected</button>
            </div>
          </div>
        )}

        {!loading && filteredAndSortedBooks.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8' : 'space-y-4'}>
            {filteredAndSortedBooks.map(book => {
               const bookId = book.id || book.book_id;
               return (
                  <div key={bookId} className="relative group">
                    <div className="absolute top-4 left-4 z-10">
                      <input type="checkbox" checked={selectedBooks.has(bookId)} onChange={() => handleSelectBook(bookId)} className="w-5 h-5 rounded border-2 border-gray-300 text-[#0770ad] focus:ring-2 focus:ring-[#0770ad] cursor-pointer" />
                    </div>
                    <BookCard book={book} />
                  </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favbooks;