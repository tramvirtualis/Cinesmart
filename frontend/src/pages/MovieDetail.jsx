import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import BookingModal from '../components/BookingModal.jsx';
import AgeConfirmationModal from '../components/AgeConfirmationModal.jsx';
import { Toast } from '../components/AdminDashboard/NotificationSystem.jsx';
import { movieService } from '../services/movieService';
import { reviewService } from '../services/reviewService';
import { enumService } from '../services/enumService';
import { favoriteService } from '../services/favoriteService';
import { cinemaComplexService } from '../services/cinemaComplexService';
import scheduleService from '../services/scheduleService';

export default function MovieDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = useMemo(() => {
    return Object.fromEntries(searchParams.entries());
  }, [searchParams]);

  // State for movie data
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [showBooking, setShowBooking] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 4;
  const [showAgeConfirmModal, setShowAgeConfirmModal] = useState(false);
  const [pendingBookingUrl, setPendingBookingUrl] = useState(null);
  const [bookingOptions, setBookingOptions] = useState({
    movieId: null,
    cinemas: [],
    formats: ['Tất cả'], // Default to "Tất cả", will be updated when showtimes are loaded
    showtimes: {}
  });
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [hasShowtimes, setHasShowtimes] = useState(false);
  
  // Set movieId in bookingOptions when movie is loaded
  useEffect(() => {
    if (movie && movie.movieId) {
      setBookingOptions(prev => ({
        ...prev,
        movieId: movie.movieId
      }));
      // Check if movie has showtimes
      checkMovieShowtimes(movie.movieId);
    }
  }, [movie]);

  // Check if movie has available showtimes
  const checkMovieShowtimes = async (movieId) => {
    if (!movieId) {
      setHasShowtimes(false);
      return;
    }

    try {
      const listings = await scheduleService.getListings({
        date: undefined, // Get all showtimes
        movieId: movieId,
        cinemaId: undefined
      });

      if (Array.isArray(listings) && listings.length > 0) {
        // Check if there are any future showtimes
        const now = new Date();
        const hasFutureShowtime = listings.some(item => {
          const startTime = item.startTime || item.startDateTime;
          if (!startTime) return false;
          const showtimeDate = new Date(startTime);
          return showtimeDate >= now;
        });
        setHasShowtimes(hasFutureShowtime);
      } else {
        setHasShowtimes(false);
      }
    } catch (err) {
      console.error('[MovieDetail] Error checking showtimes:', err);
      setHasShowtimes(false);
    }
  };

  // Load movie data from API
  useEffect(() => {
    const loadMovie = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Check if id is a number (movieId) or string (title)
        const movieId = parseInt(id, 10);
        
        if (!isNaN(movieId)) {
          // id is a number, use it directly
          const result = await movieService.getPublicMovieById(movieId);
          if (result.success && result.data) {
            const mappedMovie = mapMovieFromBackend(result.data);
            setMovie(mappedMovie);
            
            // Load reviews and favorite status after movie is loaded
            loadReviews(movieId);
            checkFavoriteStatus(movieId);
            // Load booking data (cinemas) - showtimes will be loaded when modal opens
            loadBookingData(movieId);
          } else {
            setError(result.error || 'Không tìm thấy phim');
          }
        } else {
          // id is a string (title), need to search for movie by title
          const title = decodeURIComponent(id);
          const allMoviesResult = await movieService.getPublicMovies();
          
          if (allMoviesResult.success && allMoviesResult.data) {
            // Map movies from backend format
            const mappedMovies = allMoviesResult.data.map(m => movieService.mapMovieFromBackend(m));
            const foundMovie = mappedMovies.find(
              m => m.originalTitle && m.originalTitle.toLowerCase() === title.toLowerCase()
            );
            
            if (foundMovie) {
              setMovie(foundMovie);
              loadReviews(foundMovie.movieId);
              checkFavoriteStatus(foundMovie.movieId);
              loadBookingData(foundMovie.movieId);
            } else {
              setError('Không tìm thấy phim');
            }
          } else {
            setError('Không thể tải danh sách phim');
          }
        }
      } catch (err) {
        console.error('Error loading movie:', err);
        setError(err.message || 'Không thể tải thông tin phim');
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [id]);

  // Check favorite status
  const checkFavoriteStatus = async (movieId) => {
    if (!movieId) return;

    try {
      const result = await favoriteService.checkFavorite(movieId);
      if (result.success) {
        setIsFavorite(result.hasFavorite);
      } else {
        // Nếu lỗi (có thể do chưa đăng nhập), mặc định là false
        setIsFavorite(false);
      }
    } catch (err) {
      console.error('Error checking favorite status:', err);
      setIsFavorite(false);
    }
  };

  // Load booking data (cinemas)
  const loadBookingData = async (movieId) => {
    if (!movieId) return;
    
    try {
      // Load cinemas
      const cinemasResult = await cinemaComplexService.getAllCinemaComplexes();
      if (!cinemasResult.success) {
        console.error('Failed to load cinemas:', cinemasResult.error);
        return;
      }
      
      const cinemas = (cinemasResult.data || []).map(c => ({
        id: c.complexId.toString(),
        name: c.name,
        province: c.addressProvince || ''
      }));
      
      setBookingOptions(prev => ({
        ...prev,
        movieId: movieId,
        cinemas: cinemas
      }));
    } catch (err) {
      console.error('Error loading booking data:', err);
    }
  };
  
  // Map formatLabel to display format - giống như Schedule.jsx
  const formatRoomType = useCallback((formatLabel) => {
    if (!formatLabel) return '';
    // Convert TYPE_2D -> 2D, TYPE_3D -> 3D, DELUXE -> DELUXE
    // formatLabel có thể là "TYPE_2D • VIETSUB" hoặc chỉ "TYPE_2D"
    const parts = formatLabel.split(' • ');
    const roomTypePart = parts[0];
    if (roomTypePart.startsWith('TYPE_')) {
      return roomTypePart.replace('TYPE_', '');
    }
    return roomTypePart;
  }, []);

  // Extract language from formatLabel and map to Vietnamese
  const extractLanguage = useCallback((formatLabel) => {
    if (!formatLabel) return '';
    // formatLabel có thể là "TYPE_2D • VIETSUB" hoặc chỉ "TYPE_2D"
    const parts = formatLabel.split(' • ');
    if (parts.length > 1) {
      const languagePart = parts[1];
      // Map language enum to Vietnamese
      const languageMapping = {
        'VIETSUB': 'Phụ đề',
        'VIETDUB': 'Lồng tiếng',
        'VIETNAMESE': 'Tiếng Việt',
      };
      return languageMapping[languagePart] || languagePart;
    }
    return '';
  }, []);

  // Load showtimes when filters change - sử dụng scheduleService giống như Schedule.jsx
  const loadShowtimes = useCallback(async (movieId, province, date) => {
    if (!movieId) {
      return;
    }
    
    // Ensure date is in YYYY-MM-DD format (if provided)
    let formattedDate = null;
    if (date) {
      if (date instanceof Date) {
        formattedDate = date.toISOString().slice(0, 10);
      } else if (typeof date === 'string' && date.trim() !== '') {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().slice(0, 10);
        }
      }
    }
    
    setLoadingShowtimes(true);
    try {
      // Sử dụng scheduleService.getListings() giống như Schedule.jsx
      // Pass date nếu có, null nếu "Tất cả"
      console.log('[MovieDetail] Loading showtimes with params:', { movieId, province, date: formattedDate || 'ALL' });
      const listings = await scheduleService.getListings({
        date: formattedDate || undefined, // Pass date nếu có, undefined nếu "Tất cả"
        movieId: movieId,
        cinemaId: undefined // Không filter theo cinema, sẽ filter theo province sau
      });
      console.log('[MovieDetail] Received listings:', listings);
      
      if (Array.isArray(listings) && listings.length > 0) {
        // Filter by province nếu có (null = "Tất cả" = không filter)
        let filteredListings = listings;
        if (province && province.trim() !== '') {
          filteredListings = listings.filter(item => {
            if (!item.cinemaAddress) return false;
            return item.cinemaAddress.toLowerCase().includes(province.toLowerCase());
          });
        }
        
        if (filteredListings.length > 0) {
          // Group showtimes by cinema and format - giống như Schedule.jsx
          const showtimesByCinema = {};
          const formatsSet = new Set();
          
          filteredListings.forEach(item => {
            const cinemaId = item.cinemaId?.toString();
            if (!cinemaId || !item.formatLabel) {
              return;
            }
            
            // Map formatLabel to format - giống như Schedule.jsx
            const format = formatRoomType(item.formatLabel);
            if (!format) {
              return;
            }
            formatsSet.add(format);
            
            if (!showtimesByCinema[cinemaId]) {
              showtimesByCinema[cinemaId] = {};
            }
            if (!showtimesByCinema[cinemaId][format]) {
              showtimesByCinema[cinemaId][format] = [];
            }
            
            // Format time as HH:mm - giống như Schedule.jsx
            const startTime = item.startTime ? new Date(item.startTime) : null;
            const time = startTime
              ? startTime.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              : '';
            
            // Get date in YYYY-MM-DD format for grouping
            const dateKey = startTime ? startTime.toISOString().slice(0, 10) : null;
            
            // Store as object with time, showtimeId, date, and language
            if (time) {
              const language = extractLanguage(item.formatLabel);
              const showtimeData = {
                time: time,
                showtimeId: item.showtimeId,
                date: dateKey, // Store date for grouping when "Tất cả" is selected
                startTime: item.startTime, // Keep original startTime for date formatting
                language: language // Store language for display
              };
              // Check if time already exists for this date
              const existingIndex = showtimesByCinema[cinemaId][format].findIndex(
                st => st.time === time && st.date === dateKey
              );
              if (existingIndex === -1) {
                showtimesByCinema[cinemaId][format].push(showtimeData);
              }
            }
          });
          
          // Sort times in each format (by time string)
          Object.keys(showtimesByCinema).forEach(cinemaId => {
            Object.keys(showtimesByCinema[cinemaId]).forEach(format => {
              showtimesByCinema[cinemaId][format].sort((a, b) => a.time.localeCompare(b.time));
            });
          });
          
          // Convert formats set to array and sort, add "Tất cả" at the beginning
          const formats = Array.from(formatsSet).sort();
          const formatsWithAll = ['Tất cả', ...formats];
          
          setBookingOptions(prev => ({
            ...prev,
            showtimes: showtimesByCinema,
            formats: formatsWithAll.length > 1 ? formatsWithAll : ['Tất cả']
          }));
        } else {
          // No showtimes after province filter
          setBookingOptions(prev => ({
            ...prev,
            showtimes: {},
            formats: ['Tất cả']
          }));
        }
      } else {
        // No showtimes data
        console.log('[MovieDetail] No showtimes found in API response');
        setBookingOptions(prev => ({
          ...prev,
          showtimes: {},
          formats: ['Tất cả']
        }));
      }
    } catch (err) {
      console.error('[MovieDetail] Error loading showtimes:', err);
      setBookingOptions(prev => ({
        ...prev,
        showtimes: {},
        formats: ['Tất cả']
      }));
    } finally {
      setLoadingShowtimes(false);
    }
  }, [formatRoomType]);

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!movie || !movie.movieId) return;

    const token = localStorage.getItem('jwt');
    if (!token) {
      setToast({ message: 'Vui lòng đăng nhập để thêm phim vào yêu thích', type: 'warning' });
      return;
    }

    setLoadingFavorite(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const result = await favoriteService.removeFavorite(movie.movieId);
        if (result.success) {
          setIsFavorite(false);
          setToast({ message: 'Đã xóa phim khỏi yêu thích', type: 'success' });
        } else {
          setToast({ message: result.error || 'Không thể xóa phim khỏi yêu thích', type: 'error' });
        }
      } else {
        // Add to favorites
        const result = await favoriteService.addFavorite(movie.movieId);
        if (result.success) {
          setIsFavorite(true);
          setToast({ message: 'Đã thêm phim vào yêu thích', type: 'success' });
        } else {
          setToast({ message: result.error || 'Không thể thêm phim vào yêu thích', type: 'error' });
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setToast({ message: err.message || 'Có lỗi xảy ra', type: 'error' });
    } finally {
      setLoadingFavorite(false);
    }
  };

  // Handle open report modal
  const handleOpenReportModal = (reviewId) => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      setToast({ message: 'Bạn cần đăng nhập để báo cáo đánh giá', type: 'warning' });
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      return;
    }
    setSelectedReviewId(reviewId);
    setReportReason('');
    setShowReportModal(true);
  };

  // Handle submit report
  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      return;
    }

    setReportingReviewId(selectedReviewId);
    try {
      await reviewService.reportReview(selectedReviewId, reportReason.trim());
      setShowReportModal(false);
      setReportReason('');
      setSelectedReviewId(null);
      setShowReportSuccess(true);
      setTimeout(() => {
        setShowReportSuccess(false);
      }, 3000);
    } catch (err) {
      setToast({ message: err.message || 'Có lỗi xảy ra khi báo cáo đánh giá', type: 'error' });
    } finally {
      setReportingReviewId(null);
    }
  };

  // Load reviews
  const loadReviews = async (movieId) => {
    if (!movieId) return;

    setLoadingReviews(true);
    try {
      const reviewsData = await reviewService.getReviewsByMovie(movieId);
      const mappedReviews = reviewsData.map(review => ({
        id: review.reviewId,
        userId: review.userId,
        userName: review.username || review.userName || review.user?.name || 'Người dùng',
        avatar: review.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.username || review.userName || 'User')}&background=e83b41&color=fff&size=128`,
        rating: review.rating || 0,
        reviewText: review.context || review.reviewText || '',
        reviewDate: review.createdAt || review.createdUpdate || new Date().toISOString().split('T')[0]
      }));
      setReviews(mappedReviews);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Map movie from backend format to frontend format
  const mapMovieFromBackend = (movieData) => {
    if (!movieData) return null;

    console.log('=== mapMovieFromBackend DEBUG ===');
    console.log('movieData.ageRating:', movieData.ageRating, typeof movieData.ageRating);
    console.log('movieData.genre:', movieData.genre, typeof movieData.genre, Array.isArray(movieData.genre));

    // Map age rating - hiển thị đúng format: 13+, 16+, 18+, P, K
    const ageRatingDisplay = enumService.mapAgeRatingToDisplay(movieData.ageRating);
    console.log('ageRatingDisplay after map:', ageRatingDisplay);
    // Giữ nguyên format từ enumService (13+, 16+, 18+, P, K), không thêm prefix "T"
    const ratingBadge = ageRatingDisplay || 'P';
    console.log('ratingBadge final:', ratingBadge);

    // Map formats
    const formats = movieService.mapFormatsFromBackend(movieData.formats || []);

    // Map genres to Vietnamese string - handle both array and string formats
    let genreString = '';
    if (movieData.genre) {
      if (Array.isArray(movieData.genre)) {
        // If it's an array, map each genre to Vietnamese
        console.log('Processing genre as array:', movieData.genre);
        genreString = movieData.genre.map(g => {
          // Handle if genre is already an object with a property, or just a string
          let genreValue = typeof g === 'string' ? g : (g.value || g.name || g);
          // Convert to uppercase to match enum values
          genreValue = genreValue.toUpperCase();
          const mapped = enumService.mapGenreToVietnamese(genreValue);
          console.log(`  Genre "${g}" -> "${genreValue}" -> "${mapped}"`);
          return mapped;
        }).filter(g => g && g !== 'N/A').join(', ');
      } else if (typeof movieData.genre === 'string') {
        // If it's a string, check if it's comma-separated or single value
        console.log('Processing genre as string:', movieData.genre);
        if (movieData.genre.includes(',')) {
          // Comma-separated string like "SCI_FI, ADVENTURE" or "ANIMATION, ADVENTURE, COMEDY"
          genreString = movieData.genre.split(',').map(g => {
            const trimmed = g.trim().toUpperCase();
            const mapped = enumService.mapGenreToVietnamese(trimmed);
            console.log(`  Genre "${g.trim()}" -> "${trimmed}" -> "${mapped}"`);
            return mapped;
          }).filter(g => g && g !== 'N/A').join(', ');
        } else {
          // Single genre string
          const upperGenre = movieData.genre.toUpperCase();
          genreString = enumService.mapGenreToVietnamese(upperGenre);
          console.log(`Single genre "${movieData.genre}" -> "${upperGenre}" -> "${genreString}"`);
        }
      } else {
        // If it's an object, try to extract the value
        const genreValue = (movieData.genre.value || movieData.genre.name || movieData.genre).toString().toUpperCase();
        genreString = enumService.mapGenreToVietnamese(genreValue);
        console.log(`Genre object -> "${genreString}"`);
      }
    }
    console.log('genreString final:', genreString);
    console.log('=== END DEBUG ===');

    // Map languages
    const languages = movieData.languages || [];
    const languageDisplay = languages.length > 0 
      ? languages.map(lang => {
          const langMap = {
            'VIETSUB': 'Phụ đề',
            'VIETNAMESE': 'Tiếng Việt',
            'VIETDUB': 'Lồng tiếng'
          };
          return langMap[lang] || lang;
        }).join(', ')
      : 'Khác';

    // Format release date
    const releaseDate = movieData.releaseDate 
      ? new Date(movieData.releaseDate).toLocaleDateString('vi-VN', {
          weekday: 'long',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      : '';

    // Extract YouTube ID from trailerURL
    const trailerUrl = movieData.trailerURL || '';
    let trailerYoutubeId = '';
    if (trailerUrl) {
      const match = trailerUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      if (match) {
        trailerYoutubeId = match[1];
      }
    }

    return {
      movieId: movieData.movieId,
      id: movieData.movieId,
      title: movieData.title || '', // Title without rating badge
      originalTitle: movieData.title,
      duration: movieData.duration || 0,
      genre: genreString,
      genres: movieData.genre || [],
      formats: formats,
      language: languageDisplay,
      languages: languages,
      rating: ratingBadge,
      ageRating: movieData.ageRating,
      status: movieData.status || 'NOW_SHOWING',
      desc: movieData.description || '',
      director: movieData.director || '',
      cast: movieData.actor || '',
      poster: movieData.poster || '',
      release: releaseDate,
      releaseDate: movieData.releaseDate,
      trailerURL: trailerUrl,
      trailerYoutubeId: trailerYoutubeId
    };
  };


  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;
  const totalReviews = reviews.length;
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const endIndex = startIndex + reviewsPerPage;
  const currentReviews = reviews.slice(startIndex, endIndex);

  const toggleReview = (reviewId) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const isReviewExpanded = (reviewId) => {
    return expandedReviews.has(reviewId);
  };

  const shouldTruncate = (text, maxLength = 200) => {
    return text && text.length > maxLength;
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderStars = (rating, showHalfStar = false) => {
    const numRating = parseFloat(rating);
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    
    return Array.from({ length: 5 }, (_, i) => {
      const isFullStar = i < fullStars;
      const isHalfStar = i === fullStars && hasHalfStar && showHalfStar;
      
      return (
        <span key={i} style={{ position: 'relative', display: 'inline-block', width: '20px', height: '20px' }}>
          {/* Background star (always empty outline) */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ 
              color: 'rgba(255, 255, 255, 0.3)',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          
          {/* Foreground star (filled) */}
          {isFullStar && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ 
                color: '#ffd159',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1
              }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          
          {/* Half star */}
          {isHalfStar && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '10px',
              height: '20px',
              overflow: 'hidden',
              zIndex: 1
            }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ 
                  color: '#ffd159',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          )}
        </span>
      );
    });
  };

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen cinema-mood">
        <Header />
        <main className="main">
          <section className="section">
            <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.6)' }}>Đang tải thông tin phim...</div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error || !movie) {
    return (
      <div className="min-h-screen cinema-mood">
        <Header />
        <main className="main">
          <section className="section">
            <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '18px', color: '#e83b41', marginBottom: '16px' }}>
                {error || 'Không tìm thấy phim'}
              </div>
              <button 
                className="btn btn--primary"
                onClick={() => navigate('/')}
                style={{ padding: '12px 24px' }}
              >
                Về trang chủ
              </button>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // YouTube video ID từ trailerURL
  const trailerYoutubeId = movie.trailerYoutubeId || '8hP9D6kZseM';

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        <section className="section">
          <div className="container" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
            <div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {movie.poster ? (
                  <img src={movie.poster} alt={movie.title} className="card__img" />
                ) : (
                  <div className="card__img" style={{ display: 'grid', placeItems: 'center', background: '#251e1f' }}>Không có poster</div>
                )}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <h1 className="section__title" style={{ fontSize: 'clamp(24px, 3vw, 32px)', margin: 0, fontWeight: 900 }}>{movie.title || movie.originalTitle || ''}</h1>
                {movie.rating && (
                  <span className="badge-rating" title="Độ tuổi khuyến nghị">{movie.rating}</span>
                )}
                {Array.isArray(movie.formats) && movie.formats.length > 0 && movie.formats.map((f) => (
                  <span key={f} className="badge-format" title="Định dạng">{f}</span>
                ))}
                <button
                  className={`favorite-btn ${isFavorite ? 'favorite-btn--active' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={loadingFavorite}
                  aria-label={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                  title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>

              {/* Movie Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div className="movie-info-card">
                  <div className="movie-info-card__icon" style={{ color: '#ffd159' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd159" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159', stroke: '#ffd159' }}>
                      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#ffd159"/>
                      <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20" stroke="#ffd159"/>
                    </svg>
                  </div>
                  <div>
                    <div className="movie-info-card__label">Thể loại</div>
                    <div className="movie-info-card__value">{movie.genre || 'N/A'}</div>
                  </div>
                </div>
                <div className="movie-info-card">
                  <div className="movie-info-card__icon" style={{ color: '#ffd159' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd159" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159', stroke: '#ffd159' }}>
                      <circle cx="12" cy="12" r="10" stroke="#ffd159"/>
                      <polyline points="12 6 12 12 16 14" stroke="#ffd159"/>
                    </svg>
                  </div>
                  <div>
                    <div className="movie-info-card__label">Thời lượng</div>
                    <div className="movie-info-card__value">{movie.duration || 0} phút</div>
                  </div>
                </div>
                <div className="movie-info-card">
                  <div className="movie-info-card__icon" style={{ color: '#ffd159' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd159" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159', stroke: '#ffd159' }}>
                      <circle cx="12" cy="12" r="10" stroke="#ffd159"/>
                      <line x1="2" y1="12" x2="22" y2="12" stroke="#ffd159"/>
                      <line x1="12" y1="2" x2="12" y2="22" stroke="#ffd159"/>
                    </svg>
                  </div>
                  <div>
                    <div className="movie-info-card__label">Ngôn ngữ</div>
                    <div className="movie-info-card__value">{movie.language || 'Khác'}</div>
                  </div>
                </div>
                <div className="movie-info-card">
                  <div className="movie-info-card__icon" style={{ color: '#ffd159' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd159" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159', stroke: '#ffd159' }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#ffd159"/>
                      <line x1="16" y1="2" x2="16" y2="6" stroke="#ffd159"/>
                      <line x1="8" y1="2" x2="8" y2="6" stroke="#ffd159"/>
                      <line x1="3" y1="10" x2="21" y2="10" stroke="#ffd159"/>
                    </svg>
                  </div>
                  <div>
                    <div className="movie-info-card__label">Ngày phát hành</div>
                    <div className="movie-info-card__value">{movie.release || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Director & Cast Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="movie-detail-section">
                  <div className="movie-detail-section__header">
                    <span className="movie-detail-section__icon" style={{ color: '#ffd159' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd159" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159', stroke: '#ffd159' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="#ffd159"/>
                        <line x1="9" y1="3" x2="9" y2="21" stroke="#ffd159"/>
                        <line x1="3" y1="9" x2="21" y2="9" stroke="#ffd159"/>
                      </svg>
                    </span>
                    <span className="movie-detail-section__title">Đạo diễn</span>
                  </div>
                  <div className="movie-detail-section__content">{movie.director || 'N/A'}</div>
                </div>
                <div className="movie-detail-section">
                  <div className="movie-detail-section__header">
                    <span className="movie-detail-section__icon" style={{ color: '#ffd159' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd159" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159', stroke: '#ffd159' }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#ffd159"/>
                        <circle cx="12" cy="7" r="4" stroke="#ffd159"/>
                      </svg>
                    </span>
                    <span className="movie-detail-section__title">Diễn viên</span>
                  </div>
                  <div className="movie-detail-section__content">{movie.cast || 'N/A'}</div>
                </div>
              </div>

              {/* Synopsis Section */}
              <div className="movie-synopsis">
                <div className="movie-synopsis__header">
                  <span className="movie-synopsis__icon" style={{ color: '#ffd159' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffd159" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159', stroke: '#ffd159' }}>
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#ffd159"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#ffd159"/>
                    </svg>
                  </span>
                  <span className="movie-synopsis__title">Nội dung</span>
                </div>
                <p className="movie-synopsis__text">{movie.desc || 'Chưa có mô tả'}</p>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                {movie.status !== 'ENDED' && hasShowtimes && (
                  <button className="btn btn--primary" onClick={() => setShowBooking(true)} style={{ fontSize: '16px', padding: '14px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9z"/>
                      <path d="M6 9v6M18 9v6"/>
                    </svg>
                    Mua vé
                  </button>
                )}
                {movie.trailerURL && (
                <button className="btn btn--ghost" onClick={() => setShowTrailer(true)} style={{ fontSize: '16px', padding: '14px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Xem Trailer
                </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159' }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <h2 className="section__title" style={{ margin: 0 }}>Đánh giá</h2>
              </div>
              {totalReviews > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {renderStars(parseFloat(averageRating), true)}
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffd159' }}>
                      {averageRating}
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                    ({totalReviews} đánh giá)
                  </span>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.4 }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <p style={{ margin: 0, fontSize: '16px' }}>Chưa có đánh giá nào</p>
              </div>
            ) : (
              <>
                <div className="movie-reviews-list">
                  {currentReviews.map((review) => {
                    const isExpanded = isReviewExpanded(review.id);
                    const hasLongReview = shouldTruncate(review.reviewText);
                    const displayText = isExpanded || !hasLongReview 
                      ? review.reviewText 
                      : truncateText(review.reviewText);
                    
                    return (
                      <div key={review.id} className="movie-review-card">
                        <div className="movie-review-card__avatar">
                          <img src={review.avatar} alt={review.userName} />
                        </div>
                        <div className="movie-review-card__content">
                          <div className="movie-review-card__header">
                            <div className="movie-review-card__user-info">
                              <h4 className="movie-review-card__user-name">{review.userName}</h4>
                              <div className="movie-review-card__rating">
                                <div className="movie-review-card__stars">
                                  {renderStars(review.rating)}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="movie-review-card__date">
                                {formatShortDate(review.reviewDate)}
                              </div>
                              {(() => {
                                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                                const isOwnReview = review.userId && currentUser.userId && review.userId === currentUser.userId;
                                
                                if (isOwnReview) {
                                  return null; // Ẩn nút report cho review của chính mình
                                }
                                
                                return (
                                  <button
                                    onClick={() => handleOpenReportModal(review.id)}
                                    disabled={reportingReviewId === review.id}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: reportingReviewId === review.id ? 'wait' : 'pointer',
                                      padding: '4px 8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      color: 'rgba(255,255,255,0.6)',
                                      transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (reportingReviewId !== review.id) {
                                        e.target.style.color = '#e83b41';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (reportingReviewId !== review.id) {
                                        e.target.style.color = 'rgba(255,255,255,0.6)';
                                      }
                                    }}
                                    title="Báo cáo đánh giá này"
                                  >
                                    <svg 
                                      width="18" 
                                      height="18" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2"
                                    >
                                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                                      <line x1="4" y1="22" x2="4" y2="15"></line>
                                    </svg>
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="movie-review-card__review">
                            <p className="movie-review-card__review-text">
                              {displayText}
                            </p>
                            {hasLongReview && (
                              <button
                                className="movie-review-card__expand"
                                onClick={() => toggleReview(review.id)}
                              >
                                <span>{isExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
                                <svg 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2"
                                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 300ms ease' }}
                                >
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (() => {
                  // Tính toán các trang cần hiển thị
                  const getPageNumbers = () => {
                    const pages = [];
                    const maxVisible = 7; // Số trang tối đa hiển thị
                    
                    if (totalPages <= maxVisible) {
                      // Nếu tổng số trang <= 7, hiển thị tất cả
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Luôn hiển thị trang đầu
                      pages.push(1);
                      
                      if (currentPage <= 4) {
                        // Gần đầu: 1, 2, 3, 4, 5, ..., totalPages
                        for (let i = 2; i <= 5; i++) {
                          pages.push(i);
                        }
                        pages.push('ellipsis-end');
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 3) {
                        // Gần cuối: 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
                        pages.push('ellipsis-start');
                        for (let i = totalPages - 4; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Ở giữa: 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
                        pages.push('ellipsis-start');
                        pages.push(currentPage - 1);
                        pages.push(currentPage);
                        pages.push(currentPage + 1);
                        pages.push('ellipsis-end');
                        pages.push(totalPages);
                      }
                    }
                    
                    return pages;
                  };
                  
                  const pageNumbers = getPageNumbers();
                  
                  return (
                    <div className="movie-reviews-pagination" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        className="movie-reviews-pagination__btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                      {pageNumbers.map((page, index) => {
                        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              style={{
                                padding: '8px 4px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '14px',
                                userSelect: 'none'
                              }}
                            >
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={page}
                            className={`movie-reviews-pagination__btn movie-reviews-pagination__btn--number ${currentPage === page ? 'movie-reviews-pagination__btn--active' : ''}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        className="movie-reviews-pagination__btn"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </section>
      </main>

      <BookingModal
        isOpen={showBooking}
        onClose={() => {
          console.log('[MovieDetail] Closing booking modal');
          setShowBooking(false);
        }}
        movieTitle={movie.title || movie.originalTitle || ''}
        onShowtimeClick={(bookingUrl) => {
          console.log('[MovieDetail] Showtime clicked, booking URL:', bookingUrl);
          // Nếu phim là P (mọi độ tuổi), bỏ qua modal xác nhận độ tuổi
          if (movie.rating === 'P') {
            // Convert hash URL (#booking?params) to path URL (/booking?params)
            let bookingPath = bookingUrl;
            if (bookingPath.startsWith('#')) {
              bookingPath = bookingPath.replace('#', '');
            }
            if (bookingPath.startsWith('booking')) {
              bookingPath = '/' + bookingPath;
            }
            navigate(bookingPath);
            setShowBooking(false); // Đóng modal chọn suất
          } else {
            // Phim có độ tuổi giới hạn, cần xác nhận
            setPendingBookingUrl(bookingUrl);
            setShowAgeConfirmModal(true);
            setShowBooking(false); // Đóng modal chọn suất
          }
        }}
        onFiltersChange={loadShowtimes}
        options={{
          ...bookingOptions,
          movieId: movie.movieId || Number(id)
        }}
      />

      {/* Age Confirmation Modal */}
      <AgeConfirmationModal
        isOpen={showAgeConfirmModal}
        onClose={() => {
          setShowAgeConfirmModal(false);
          setPendingBookingUrl(null);
        }}
        onConfirm={() => {
          if (!pendingBookingUrl) return;
          // Convert hash URL (#booking?params) to path URL (/booking?params)
          let bookingPath = pendingBookingUrl;
          if (bookingPath.startsWith('#')) {
            bookingPath = bookingPath.replace('#', '');
          }
          if (bookingPath.startsWith('booking')) {
            bookingPath = '/' + bookingPath;
          }
          navigate(bookingPath);
          setShowAgeConfirmModal(false);
          setPendingBookingUrl(null);
        }}
        movieTitle={movie?.originalTitle || movie?.title?.replace(/\s*\(T\d+\)\s*/g, '')}
        ageRating={movie?.ageRating}
      />

      {/* Trailer Overlay */}
      {showTrailer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowTrailer(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1200px',
              aspectRatio: '16/9'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailer(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '32px',
                cursor: 'pointer',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerYoutubeId}?autoplay=1`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: '8px' }}
            />
          </div>
        </div>
      )}

      {/* Report Review Modal */}
      {showReportModal && (
        <div 
          className="movie-modal-overlay"
          onClick={() => {
            setShowReportModal(false);
            setReportReason('');
            setSelectedReviewId(null);
          }}
        >
          <div 
            className="movie-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="movie-modal__header">
              <h2>Báo cáo đánh giá</h2>
              <button 
                className="movie-modal__close" 
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setSelectedReviewId(null);
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="movie-modal__content">
              <div className="movie-form">
                <div className="movie-form__group">
                  <label>Vui lòng nhập lý do báo cáo đánh giá này <span className="required">*</span></label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Nhập lý do báo cáo..."
                    rows="5"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: '100px'
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="movie-modal__footer">
              <button 
                className="btn btn--ghost" 
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setSelectedReviewId(null);
                }}
              >
                Hủy
              </button>
              <button 
                className="btn btn--primary" 
                onClick={handleSubmitReport}
                disabled={!reportReason.trim() || reportingReviewId === selectedReviewId}
              >
                {reportingReviewId === selectedReviewId ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Success Notification */}
      {showReportSuccess && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.95) 0%, rgba(56, 142, 60, 0.95) 100%)',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideInRight 0.3s ease-out',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
              Báo cáo thành công!
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Cảm ơn bạn đã góp ý.
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}