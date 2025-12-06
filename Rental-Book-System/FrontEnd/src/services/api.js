// FrontEnd/src/services/api.js
import axios from '../api/axios';

const api = {
  // ============================================
  // 🔐 USER & AUTH
  // ============================================
  login: async (email, password) => {
    const { data } = await axios.post('/users/login', { email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  register: async (username, email, password) => {
    const { data } = await axios.post('/users/register', { username, email, password });
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  updateProfile: async (userId, updates) => {
    const { data } = await axios.put(`/users/${userId}`, updates);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    const { data } = await axios.put(`/users/${userId}/password`, {
      currentPassword,
      newPassword,
    });
    return data;
  },

  requestPasswordReset: async (email) => {
    const { data } = await axios.post('/users/forgot-password', { email });
    return data;
  },

  resetPassword: async (token, newPassword) => {
    const { data } = await axios.post('/users/reset-password', { token, newPassword });
    return data;
  },

  // ============================================
  // 📚 BOOKS
  // ============================================
  searchBooks: async (query = '') => {
    const { data } = await axios.get(`/books/search?query=${encodeURIComponent(query)}`);
    return data;
  },

  getBookById: async (id) => {
    const { data } = await axios.get(`/books/${id}`);
    return data;
  },

  getAllBooks: async () => {
    const { data } = await axios.get('/books');
    return data;
  },

  addBook: async (bookData) => {
    const { data } = await axios.post('/books', bookData);
    return data;
  },

  getSuggestions: async (query = '') => {
    const { data } = await axios.get(`/books/suggestions?query=${encodeURIComponent(query)}`);
    return data;
  },

  // ============================================
  // 📖 LOANS (ยืม-คืนหนังสือ)
  // ============================================
  
  // 🔥 แก้ไขตรงนี้: เปลี่ยนจาก /loans เป็น /loans/borrow
  borrowBook: async (bookId, hours = 168) => {
    try {
      console.log('📤 [API] Sending borrow request:', { bookId, hours });
      const { data } = await axios.post('/loans/borrow', { 
        book_id: bookId, 
        hours: parseFloat(hours) 
      });
      console.log('✅ [API] Borrow response:', data);
      return data;
    } catch (error) {
      console.error('❌ [API] Borrow error:', error.response || error);
      throw error;
    }
  },

  // 🔥 แก้ไขตรงนี้: เปลี่ยนจาก /loans เป็น /loans/return
  returnBook: async (bookId) => {
    try {
      console.log('📤 [API] Sending return request:', { bookId });
      const { data } = await axios.post('/loans/return', { book_id: bookId });
      console.log('✅ [API] Return response:', data);
      return data;
    } catch (error) {
      console.error('❌ [API] Return error:', error.response || error);
      throw error;
    }
  },

  getBorrowedBooks: async () => {
    const { data } = await axios.get('/loans/my-loans');
    return data;
  },

  getOverdueBooks: async () => {
    const { data } = await axios.get('/loans/overdue');
    return data;
  },

  // ============================================
  // 🎫 RESERVATIONS (การจอง)
  // ============================================
  createReservation: async (bookId, preferredHours = 168) => {
    try {
      console.log('📤 [API] Sending reservation request:', { bookId, preferredHours });
      const { data } = await axios.post('/reservations', {
        book_id: bookId,
        preferred_hours: parseFloat(preferredHours),
      });
      console.log('✅ [API] Reservation response:', data);
      return data;
    } catch (error) {
      console.error('❌ [API] Reservation error:', error.response || error);
      throw error;
    }
  },

  getMyReservations: async () => {
    const { data } = await axios.get('/reservations/my-reservations');
    return data;
  },

  cancelReservation: async (reservationId) => {
    const { data } = await axios.delete(`/reservations/${reservationId}`);
    return data;
  },

  // ============================================
  // ⭐ REVIEWS
  // ============================================
  getReviews: async (bookId) => {
    const { data } = await axios.get(`/reviews/book/${bookId}`);
    return data;
  },

  addReview: async (bookId, rating, comment) => {
    const { data } = await axios.post('/reviews', {
      book_id: bookId,
      rating: parseInt(rating),
      comment,
    });
    return data;
  },

  updateReview: async (reviewId, rating, comment) => {
    const { data } = await axios.put(`/reviews/${reviewId}`, {
      rating: parseInt(rating),
      comment,
    });
    return data;
  },

  deleteReview: async (reviewId) => {
    const { data } = await axios.delete(`/reviews/${reviewId}`);
    return data;
  },

  getMyReviews: async () => {
    const { data } = await axios.get('/reviews/my-reviews');
    return data;
  },

  // ============================================
  // 📂 CATEGORIES
  // ============================================
  getCategories: async () => {
    const { data } = await axios.get('/categories');
    return data;
  },

  // ============================================
  // ❤️ FAVORITES
  // ============================================
  getFavorites: async () => {
    try {
      const { data } = await axios.get('/users/favorites');
      return data;
    } catch (err) {
      console.error('Get favorites error:', err);
      return [];
    }
  },

  addFavorite: async (bookId) => {
    const { data } = await axios.post('/users/favorites', { book_id: bookId });
    return data;
  },

  removeFavorite: async (bookId) => {
    const { data } = await axios.delete(`/users/favorites/${bookId}`);
    return data;
  },
};

export default api;