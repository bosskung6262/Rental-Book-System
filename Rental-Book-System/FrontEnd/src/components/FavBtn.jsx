// import React, { useState, useEffect } from 'react';
// import { Heart } from 'lucide-react';

// const FavBtn = ({ book }) => {
//   const [isLiked, setIsLiked] = useState(false);

//   useEffect(() => {
//     // Check if book is already in favorites
//     const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
//     const isFavorite = favorites.some(fav => fav.id === book.id);
//     setIsLiked(isFavorite);
//   }, [book.id]);

//   const toggleFavorite = (e) => {
//     e.preventDefault(); // Prevent link navigation
//     e.stopPropagation();

//     const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
//     let newFavorites;

//     if (isLiked) {
//       // Remove from favorites
//       newFavorites = favorites.filter(fav => fav.id !== book.id);
//     } else {
//       // Add to favorites
//       newFavorites = [...favorites, book];
//     }

//     localStorage.setItem('favorites', JSON.stringify(newFavorites));
//     setIsLiked(!isLiked);

//     // Dispatch a custom event so other components (like Favbooks) can update if needed
//     window.dispatchEvent(new Event('favoritesUpdated'));
//   };

//   return (
//     <button
//       onClick={toggleFavorite}
//       className={`p-2 rounded-full transition-colors ${isLiked
//           ? 'bg-red-50 text-red-500 hover:bg-red-100'
//           : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-400'
//         }`}
//       aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
//     >
//       <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
//     </button>
//   );
// };

// export default FavBtn;

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast'; // 🆕

const FavBtn = ({ book, className = '', size = 'default' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Size variants
  const sizes = {
    small: 'w-10 h-10',
    default: 'w-12 h-12',
    large: 'w-14 h-14'
  };

  const iconSizes = {
    small: 'w-5 h-5',
    default: 'w-6 h-6',
    large: 'w-7 h-7'
  };

  useEffect(() => {
    checkFavoriteStatus();
  }, [book.id]);

  useEffect(() => {
    const handleFavoritesUpdate = () => {
      checkFavoriteStatus();
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
  }, [book.id]);

  const checkFavoriteStatus = () => {
    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const exists = favorites.some(fav => fav.id === book.id);
      setIsFavorite(exists);
    } catch (err) {
      console.error('Error checking favorite status:', err);
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const exists = favorites.find(fav => fav.id === book.id);

      let updatedFavorites;

      if (exists) {
        // Remove
        updatedFavorites = favorites.filter(fav => fav.id !== book.id);
        setIsFavorite(false);
        
        toast(
          <div className="flex items-center gap-2">
            <span>💔</span>
            <span className="font-medium">Removed from favorites</span>
          </div>,
          {
            duration: 2000,
            style: {
              background: '#374151',
              color: 'white',
            }
          }
        );
      } else {
        // Add with timestamp
        const bookWithTimestamp = {
          ...book,
          addedAt: Date.now()
        };
        updatedFavorites = [...favorites, bookWithTimestamp];
        setIsFavorite(true);

        // Animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);

        toast(
          <div className="flex items-center gap-2">
            <span>❤️</span>
            <div>
              <p className="font-bold">Added to favorites!</p>
              <p className="text-xs opacity-80">{book.title}</p>
            </div>
          </div>,
          {
            duration: 3000,
            style: {
              background: '#EF4444',
              color: 'white',
            }
          }
        );
      }

      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      window.dispatchEvent(new Event('favoritesUpdated'));

    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorites');
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      className={`
        group relative
        flex items-center justify-center
        ${sizes[size]}
        rounded-full
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${isFavorite 
          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
          : 'bg-white hover:bg-red-50 border-2 border-gray-200 hover:border-red-300'
        }
        ${isAnimating ? 'scale-125' : 'scale-100 hover:scale-110'}
        active:scale-95
        ${className}
      `}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`
          ${iconSizes[size]}
          transition-all duration-300
          ${isFavorite 
            ? 'fill-white text-white' 
            : 'text-gray-400 group-hover:text-red-500 group-hover:fill-red-100'
          }
        `}
      />

      {/* Particle Effect on Add */}
      {isAnimating && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
          <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-50"></span>
        </>
      )}
    </button>
  );
};

export default FavBtn;