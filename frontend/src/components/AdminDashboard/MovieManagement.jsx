import React, { useState, useEffect } from 'react';
import { movieService } from '../../services/movieService';
import { useEnums } from '../../hooks/useEnums';
import { enumService } from '../../services/enumService';
import cloudinaryService from '../../services/cloudinaryService';
import ConfirmDeleteModal from '../Common/ConfirmDeleteModal';

// Movie Management Component
function MovieManagement({ movies: initialMoviesList, onMoviesChange }) {
  const { enums, loading: enumsLoading } = useEnums();
  const [movies, setMovies] = useState(initialMoviesList);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showModal, setShowModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    genre: [], // Changed to array for multiple genres
    duration: '',
    releaseDate: '',
    ageRating: '',
    actor: '',
    director: '',
    description: '',
    trailerURL: '',
    poster: '',
    posterFile: null,
    status: '', // Chỉ dùng để đánh dấu ENDED thủ công, COMING_SOON và NOW_SHOWING tự động tính
    languages: [],
    formats: []
  });
  const [posterPreview, setPosterPreview] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [notification, setNotification] = useState(null);

  // Notification component
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    // Hiển thị lâu hơn cho lỗi để người dùng có thời gian đọc
    const duration = type === 'error' ? 6000 : 3000;
    setTimeout(() => {
      setNotification(null);
    }, duration);
  };

  // Use mapping functions from movieService
  const {
    mapAgeRatingFromBackend,
    mapAgeRatingToBackend,
    mapFormatsFromBackend,
    extractFormatsAndLanguages,
    mapMoviesFromBackend,
    mapMovieFromBackend,
    mapMovieToBackend
  } = movieService;

  // Load movies from API on mount
  useEffect(() => {
    const loadMovies = async () => {
      // Kiểm tra token trước
      const token = localStorage.getItem('jwt');
      if (!token) {
        setError('Vui lòng đăng nhập để tiếp tục');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await movieService.getAllMovies();
        if (result.success) {
          // Map movies from backend format to frontend format
          const mappedMovies = mapMoviesFromBackend(result.data || []);
          setMovies(mappedMovies);
          if (onMoviesChange) {
            onMoviesChange(mappedMovies);
          }
        } else {
          setError(result.error);
          // Nếu lỗi là về authentication, có thể cần redirect
          if (result.error.includes('đăng nhập') || result.error.includes('hết hạn')) {
            setTimeout(() => {
              window.location.href = '/signin';
            }, 2000);
          }
        }
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách phim');
      } finally {
        setLoading(false);
      }
    };
    loadMovies();
  }, []); // Only run on mount

  // Sync with parent movies when they change (for backward compatibility)
  useEffect(() => {
    if (initialMoviesList && initialMoviesList.length > 0 && movies.length === 0) {
      setMovies(initialMoviesList);
    }
  }, [initialMoviesList]);

  // Update parent when movies change
  useEffect(() => {
    if (onMoviesChange) {
      onMoviesChange(movies);
    }
  }, [movies, onMoviesChange]);

  // Filter movies
  const filteredMovies = movies.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movie.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movie.actor.toLowerCase().includes(searchTerm.toLowerCase());
    // Support both single genre (string) and multiple genres (array)
    const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre];
    const matchesGenre = !filterGenre || movieGenres.includes(filterGenre);
    const matchesStatus = !filterStatus || movie.status === filterStatus;
    return matchesSearch && matchesGenre && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMovies = filteredMovies.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGenre, filterStatus]);

  // Handle poster file upload
  const handlePosterUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification('Vui lòng chọn file hình ảnh', 'error');
        return;
      }
      // Tăng giới hạn file size lên 10MB để hỗ trợ ảnh chất lượng cao
      if (file.size > 10 * 1024 * 1024) {
        showNotification('Kích thước file không được vượt quá 10MB', 'error');
        return;
      }
      
      // Show loading state
      setLoading(true);
      
      try {
        // Upload to Cloudinary
        const result = await cloudinaryService.uploadSingle(file);
        
        if (result.success && result.url) {
          setFormData({ ...formData, posterFile: file, poster: result.url });
          setPosterPreview(result.url);
          showNotification('Upload poster thành công', 'success');
        } else {
          const errorMsg = result.error || 'Upload poster thất bại';
          showNotification(errorMsg, 'error');
          console.error('Upload failed:', result);
        }
      } catch (error) {
        console.error('Upload error:', error);
        showNotification(error.message || 'Có lỗi xảy ra khi upload poster', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Remove poster
  const handleRemovePoster = () => {
    setFormData({ ...formData, posterFile: null, poster: '' });
    setPosterPreview('');
  };

  // Open add movie modal
  const handleAddMovie = () => {
    setEditingMovie(null);
    setFormData({
      title: '',
      genre: [], // Changed to array
      duration: '',
      releaseDate: '',
      ageRating: '',
      actor: '',
      director: '',
      description: '',
      trailerURL: '',
      poster: '',
      posterFile: null,
      status: 'COMING_SOON',
      languages: [],
      formats: []
    });
    setPosterPreview('');
    setValidationErrors({}); // Clear validation errors
    setShowModal(true);
  };

  // Open edit movie modal
  const handleEditMovie = (movie) => {
    setEditingMovie(movie);
    // Map movie to frontend format first
    const mappedMovie = mapMovieFromBackend(movie);
    // Extract formats và languages từ movie
    const { formats, languages } = extractFormatsAndLanguages(movie);
    // Handle genre: convert to array if it's a string (backward compatibility)
    const movieGenres = Array.isArray(movie.genre) ? movie.genre : (movie.genre ? [movie.genre] : []);
    
    setFormData({
      title: movie.title,
      genre: movieGenres, // Always array
      duration: movie.duration.toString(),
      releaseDate: movie.releaseDate,
      ageRating: mappedMovie.ageRating, // Đã được map từ backend format
      actor: movie.actor,
      director: movie.director,
      description: movie.description,
      trailerURL: movie.trailerURL,
      poster: movie.poster,
      posterFile: null,
      status: movie.status || '', // Lưu status hiện tại để có thể đánh dấu ENDED
      languages: languages,
      formats: formats
    });
    setPosterPreview(movie.poster || '');
    setValidationErrors({}); // Clear validation errors
    setShowModal(true);
  };

  // Save movie
  const handleSaveMovie = async () => {
    // Basic client-side validation chỉ để UX tốt hơn (không duplicate business rules)
    // Backend DTO đã có validation đầy đủ, sẽ trả về lỗi nếu có
    const errors = {};
    
    // Chỉ validate những trường cơ bản nhất để tránh gọi API không cần thiết
    if (!formData.title || formData.title.trim() === '') {
      errors.title = 'Tên phim không được để trống';
    }
    if (!formData.genre || formData.genre.length === 0) {
      errors.genre = 'Vui lòng chọn ít nhất 1 thể loại';
    }
    if (!formData.poster || formData.poster.trim() === '') {
      errors.poster = 'Vui lòng upload poster';
    }
    // Định dạng: yêu cầu chọn ít nhất 1 định dạng chiếu
    if (!formData.formats || formData.formats.length === 0) {
      errors.formats = 'Vui lòng chọn ít nhất 1 định dạng chiếu';
    }
    // Ngôn ngữ: yêu cầu chọn ít nhất 1 ngôn ngữ
    if (!formData.languages || formData.languages.length === 0) {
      errors.languages = 'Vui lòng chọn ít nhất 1 ngôn ngữ';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Scroll to top của modal để người dùng thấy lỗi
      const modalContent = document.querySelector('.movie-modal__content');
      if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    setLoading(true);
    setError(null);

    try {
      // Use poster URL from Cloudinary
      const posterValue = formData.poster;

      // Prepare movie data for API (map to backend format)
      const movieData = mapMovieToBackend({
        title: formData.title,
        genre: formData.genre, // Already an array
        duration: parseInt(formData.duration),
        releaseDate: formData.releaseDate,
        ageRating: formData.ageRating,
        actor: formData.actor || '',
        director: formData.director || '',
        description: formData.description || '',
        trailerURL: formData.trailerURL || '',
        poster: posterValue, // Có thể là URL dài hoặc base64
        // Chỉ gửi status nếu là ENDED (đánh dấu thủ công), còn lại để backend tự tính
        status: formData.status === 'ENDED' ? 'ENDED' : undefined,
        formats: formData.formats,
        languages: formData.languages // Languages đã đúng format (VIETSUB, VIETNAMESE, VIETDUB)
      });

      let result;
      if (editingMovie) {
        // Update existing movie
        result = await movieService.updateMovie(editingMovie.movieId, movieData);
      } else {
        // Create new movie
        result = await movieService.createMovie(movieData);
      }

      if (result.success) {
        // Reload movies from API
        const moviesResult = await movieService.getAllMovies();
        if (moviesResult.success) {
          const mappedMovies = mapMoviesFromBackend(moviesResult.data || []);
          setMovies(mappedMovies);
          if (onMoviesChange) {
            onMoviesChange(mappedMovies);
          }
        }
        setShowModal(false);
        setEditingMovie(null);
        setPosterPreview('');
        showNotification(result.message || (editingMovie ? 'Cập nhật phim thành công' : 'Tạo phim thành công'), 'success');
      } else {
        // Backend validation errors sẽ được trả về trong result.error hoặc result.validationErrors
        const errorMessage = result.error || 'Có lỗi xảy ra';
        let hasValidationErrors = false;
        
        // Nếu có validationErrors object từ backend (nếu backend trả về errors object)
        if (result.validationErrors && typeof result.validationErrors === 'object') {
          setValidationErrors(result.validationErrors);
          hasValidationErrors = Object.keys(result.validationErrors).length > 0;
        }
        // Nếu error message chứa validation errors từ backend (format: "field: message, field2: message2")
        else if (errorMessage.includes(':')) {
          const backendErrors = {};
          const errorParts = errorMessage.split(',');
          errorParts.forEach(part => {
            const [field, message] = part.split(':').map(s => s.trim());
            if (field && message) {
              // Map backend field names to frontend field names if needed
              const frontendField = field; // Usually same, but can map if different
              backendErrors[frontendField] = message;
            }
          });
          
          if (Object.keys(backendErrors).length > 0) {
            setValidationErrors(backendErrors);
            hasValidationErrors = true;
          }
        }
        
        // Scroll to top để người dùng thấy lỗi nếu có validation errors
        if (hasValidationErrors) {
          const modalContent = document.querySelector('.movie-modal__content');
          if (modalContent) {
            modalContent.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
        
        // Kiểm tra xem có phải lỗi về suất chiếu trong tương lai không (đã hiển thị trong modal)
        const isShowtimeError = errorMessage.includes('suất chiếu trong tương lai') || 
                                errorMessage.includes('vé đã được đặt cho các suất chiếu');
        
        // Chỉ hiển thị notification nếu không có validation errors và không phải lỗi showtime
        // (validation errors và showtime errors đã hiển thị trong modal)
        if (!hasValidationErrors && !isShowtimeError) {
          setError(errorMessage);
          showNotification(errorMessage, 'error');
        } else {
          // Nếu có validation errors hoặc showtime error, chỉ set error state, không hiển thị notification (để tránh duplicate)
          if (isShowtimeError) {
            setError(errorMessage);
          } else {
            setError(null);
          }
        }
      }
    } catch (err) {
      // Chỉ hiển thị notification trong catch nếu không phải là lỗi từ result.success === false
      // (vì lỗi đó đã được xử lý ở else block trên)
      const errorMessage = err.message || 'Có lỗi xảy ra';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete movie
  const handleDeleteMovie = async (movieId) => {
    setLoading(true);
    setError(null);

    try {
      const result = await movieService.deleteMovie(movieId);
      if (result.success) {
        // Reload movies from API
        const moviesResult = await movieService.getAllMovies();
        if (moviesResult.success) {
          const mappedMovies = mapMoviesFromBackend(moviesResult.data || []);
          setMovies(mappedMovies);
          if (onMoviesChange) {
            onMoviesChange(mappedMovies);
          }
        }
        setDeleteConfirm(null);
        showNotification(result.message || 'Xóa phim thành công', 'success');
      } else {
        setDeleteConfirm(null); // Đóng modal khi xóa thất bại
        setError(result.error);
        showNotification(result.error || 'Có lỗi xảy ra', 'error');
      }
    } catch (err) {
      setDeleteConfirm(null); // Đóng modal khi có lỗi
      setError(err.message || 'Có lỗi xảy ra');
      showNotification(err.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Format genre for display - Map to Vietnamese
  const formatGenre = (genre) => {
    if (!genre) return '';
    return enumService.mapGenreToVietnamese(genre);
  };

  // Format status for display
  const formatStatus = (status) => {
    const statusMap = {
      'COMING_SOON': 'Sắp chiếu',
      'NOW_SHOWING': 'Đang chiếu',
      'ENDED': 'Đã kết thúc'
    };
    return statusMap[status] || status;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colorMap = {
      'COMING_SOON': '#ff9800',
      'NOW_SHOWING': '#4caf50',
      'ENDED': '#9e9e9e'
    };
    return colorMap[status] || '#9e9e9e';
  };

  return (
    <>
      {/* Notification Toast - Hiển thị bên ngoài modal (sau khi modal đóng) */}
      {notification && !showModal && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          borderRadius: '12px',
          background: notification.type === 'success' 
            ? 'rgba(76, 175, 80, 0.95)' 
            : 'rgba(244, 67, 54, 0.95)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          maxWidth: '500px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {notification.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </div>
          <span style={{ flex: 1, fontSize: '15px', fontWeight: 500, lineHeight: '1.5' }}>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideInDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    <div className="movie-management">
      {/* Error Modal Popup - Only show when form modal is NOT open */}
      {error && !showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setError(null)}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, #e83b41 0%, #c62828 100%)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              animation: 'slideUp 0.3s ease-out',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setError(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              title="Đóng"
            >
              ×
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ 
                  margin: 0, 
                  marginBottom: '12px', 
                  fontSize: '20px', 
                  fontWeight: 700, 
                  color: '#fff' 
                }}>
                  Lỗi
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  color: '#fff', 
                  lineHeight: '1.6',
                  wordBreak: 'break-word'
                }}>
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                style={{
                  padding: '12px 32px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator - Improved UI */}
      {loading && (
        <div style={{ 
          padding: '16px 20px', 
          background: 'rgba(123, 97, 255, 0.1)', 
          borderRadius: '12px', 
          marginBottom: '20px',
          textAlign: 'center',
          color: '#c9c4c5',
          border: '1px solid rgba(123, 97, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ 
              animation: 'spin 1s linear infinite',
              transformOrigin: 'center'
            }}
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 500 }}>Đang tải dữ liệu...</span>
        </div>
      )}

      {/* Header with actions */}
      <div className="movie-management__header">
        <div className="movie-management__filters">
          <div className="movie-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm phim, đạo diễn, diễn viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="movie-search__input"
            />
          </div>
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="movie-filter"
          >
            <option value="">Tất cả thể loại</option>
            {enums.genres?.map(genre => (
              <option key={genre} value={genre}>{formatGenre(genre)}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="movie-filter"
          >
            <option value="">Tất cả trạng thái</option>
            {enums.movieStatuses?.map(status => (
              <option key={status} value={status}>{formatStatus(status)}</option>
            ))}
          </select>
        </div>
        <div className="movie-management__actions">
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Xem dạng lưới"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Xem dạng bảng"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
              </svg>
            </button>
          </div>
          <button className="btn btn--primary" onClick={handleAddMovie}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Thêm phim mới
          </button>
        </div>
      </div>

      {/* Movies count */}
      <div className="movie-management__info">
        <span className="movie-count">Tìm thấy {filteredMovies.length} phim</span>
      </div>

      {/* Movies list */}
      {viewMode === 'grid' ? (
        <div className="movie-grid">
          {currentMovies.map(movie => (
            <div key={movie.movieId} className="movie-card">
              <div className="movie-card__poster">
                <img src={movie.poster || 'https://via.placeholder.com/300x450'} alt={movie.title} />
                <div className="movie-card__overlay">
                  <button
                    className="movie-card__action"
                    onClick={() => handleEditMovie(movie)}
                    title="Chỉnh sửa"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className="movie-card__action movie-card__action--delete"
                    onClick={() => setDeleteConfirm(movie)}
                    title="Xóa"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
                <div className="movie-card__status" style={{ backgroundColor: getStatusColor(movie.status) }}>
                  {formatStatus(movie.status)}
                </div>
              </div>
              <div className="movie-card__content">
                <h3 className="movie-card__title">{movie.title}</h3>
                <div className="movie-card__meta">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                    {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).slice(0, 3).map(g => (
                      <span key={g} className="movie-card__genre">{formatGenre(g)}</span>
                    ))}
                    {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).length > 3 && (
                      <span className="movie-card__genre" style={{ opacity: 0.7 }}>
                        +{(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).length - 3}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="movie-card__rating">{movie.ageRating}</span>
                    <span className="movie-card__duration">{movie.duration} phút</span>
                    {(movie.formats || []).slice(0,2).map(f => (
                      <span key={f} className="movie-card__rating">{f}</span>
                    ))}
                    {(movie.languages || []).slice(0,2).map(l => (
                      <span key={l} className="movie-card__rating">{l}</span>
                    ))}
                  </div>
                </div>
                <div className="movie-card__director">Đạo diễn: {movie.director}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Poster</th>
                <th>Tên phim</th>
                <th>Thể loại</th>
                <th>Đạo diễn</th>
                <th>Thời lượng</th>
                <th>Định dạng</th>
                <th>Ngôn ngữ</th>
                <th>Ngày phát hành</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentMovies.map(movie => (
                <tr key={movie.movieId}>
                  <td>
                    <img src={movie.poster || 'https://via.placeholder.com/60x90'} alt={movie.title} className="movie-table-poster" />
                  </td>
                  <td>
                    <div className="movie-table-title">{movie.title}</div>
                    <div className="movie-table-rating">{movie.ageRating}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map(g => (
                        <span key={g} style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(123, 97, 255, 0.2)',
                          color: '#fff',
                          fontSize: '12px'
                        }}>
                          {formatGenre(g)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{movie.director}</td>
                  <td>{movie.duration} phút</td>
                  <td>{(movie.formats || []).join(', ')}</td>
                  <td>{(movie.languages || []).join(', ')}</td>
                  <td>{new Date(movie.releaseDate).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <span className="movie-status-badge" style={{ backgroundColor: getStatusColor(movie.status) }}>
                      {formatStatus(movie.status)}
                    </span>
                  </td>
                  <td>
                    <div className="movie-table-actions">
                      <button
                        className="movie-action-btn"
                        onClick={() => handleEditMovie(movie)}
                        title="Chỉnh sửa"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="movie-action-btn movie-action-btn--delete"
                        onClick={() => setDeleteConfirm(movie)}
                        title="Xóa"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredMovies.length > 0 && totalPages > 1 && (() => {
        const getPageNumbers = () => {
          const pages = [];
          const maxVisible = 7;
          
          if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
            }
          } else {
            pages.push(1);
            
            if (currentPage <= 4) {
              for (let i = 2; i <= 5; i++) {
                pages.push(i);
              }
              pages.push('ellipsis-end');
              pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
              pages.push('ellipsis-start');
              for (let i = totalPages - 4; i <= totalPages; i++) {
                pages.push(i);
              }
            } else {
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
          <div className="movie-reviews-pagination mt-8 justify-center" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
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

      {/* Empty state - Improved UI */}
      {!loading && filteredMovies.length === 0 && (
        <div className="movie-empty" style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#c9c4c5'
        }}>
          <svg 
            width="80" 
            height="80" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
            style={{ 
              marginBottom: '20px',
              opacity: 0.5,
              color: '#7b61ff'
            }}
          >
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/>
          </svg>
          <p style={{ 
            fontSize: '16px', 
            fontWeight: 500, 
            marginBottom: '8px',
            color: '#e6e1e2'
          }}>
            {searchTerm || filterGenre || filterStatus 
              ? 'Không tìm thấy phim nào phù hợp với bộ lọc' 
              : 'Chưa có phim nào trong hệ thống'}
          </p>
          {!searchTerm && !filterGenre && !filterStatus && (
            <button 
              className="btn btn--primary" 
              onClick={handleAddMovie}
              style={{ marginTop: '16px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Thêm phim đầu tiên
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Movie Modal */}
      {showModal && (
        <div className="movie-modal-overlay" onClick={() => {
          setShowModal(false);
          setPosterPreview('');
        }}>
          <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
            <div className="movie-modal__header">
              <h2>{editingMovie ? 'Chỉnh sửa phim' : 'Thêm phim mới'}</h2>
              <button className="movie-modal__close" onClick={() => {
                setShowModal(false);
                setPosterPreview('');
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="movie-modal__content" style={{ position: 'relative' }}>
              {/* Error Overlay - Hiển thị chồng lên form */}
              {error && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10001,
                    borderRadius: '8px',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                  onClick={() => setError(null)}
                >
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, #e83b41 0%, #c62828 100%)',
                      borderRadius: '16px',
                      padding: '32px',
                      maxWidth: '500px',
                      width: '90%',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      animation: 'slideUp 0.3s ease-out',
                      position: 'relative'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setError(null)}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                      title="Đóng"
                    >
                      ×
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <h3 style={{ 
                          margin: 0, 
                          marginBottom: '12px', 
                          fontSize: '20px', 
                          fontWeight: 700, 
                          color: '#fff' 
                        }}>
                          Lỗi
                        </h3>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '16px', 
                          color: '#fff', 
                          lineHeight: '1.6',
                          wordBreak: 'break-word'
                        }}>
                          {error}
                        </p>
                      </div>
                      <button
                        onClick={() => setError(null)}
                        style={{
                          padding: '12px 32px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Notification Toast - Hiển thị trong modal (chỉ cho lỗi, tránh trùng với toast bên ngoài) */}
              {notification && notification.type === 'error' && (
                <div style={{
                  position: 'sticky',
                  top: '0',
                  zIndex: 1000,
                  padding: '16px 20px',
                  marginBottom: '20px',
                  borderRadius: '12px',
                  background: notification.type === 'success' 
                    ? 'rgba(76, 175, 80, 0.98)' 
                    : 'rgba(244, 67, 54, 0.98)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  border: `2px solid ${notification.type === 'success' ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'}`,
                  animation: 'slideInDown 0.3s ease-out'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {notification.type === 'success' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: '15px', fontWeight: 500, lineHeight: '1.5' }}>
                    {notification.message}
                  </div>
                  <button
                    onClick={() => setNotification(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.8
                    }}
                    onMouseOver={(e) => e.target.style.opacity = '1'}
                    onMouseOut={(e) => e.target.style.opacity = '0.8'}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}
              {enumsLoading ? (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center',
                  color: '#c9c4c5'
                }}>
                  <svg 
                    width="40" 
                    height="40" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{ 
                      animation: 'spin 1s linear infinite',
                      transformOrigin: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                  <p>Đang tải dữ liệu...</p>
                </div>
              ) : (
              <div className="movie-form">
                {/* Validation errors summary */}
                {Object.keys(validationErrors).length > 0 && (
                  <div style={{
                    padding: '12px 16px',
                    marginBottom: '20px',
                    backgroundColor: 'rgba(255, 87, 87, 0.1)',
                    border: '1px solid rgba(255, 87, 87, 0.3)',
                    borderRadius: '8px',
                    color: '#ff5757',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>Vui lòng kiểm tra các trường sau:</div>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {Object.values(validationErrors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Tên phim <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        if (validationErrors.title) {
                          setValidationErrors({ ...validationErrors, title: null });
                        }
                      }}
                      placeholder="Nhập tên phim"
                      style={{
                        borderColor: validationErrors.title ? '#ff5757' : undefined
                      }}
                    />
                    {validationErrors.title && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.title}
                      </div>
                    )}
                  </div>
                  <div className="movie-form__group" style={{ gridColumn: '1 / -1' }}>
                    <label>Thể loại <span className="required">*</span></label>
                    <div style={{
                      border: `1px solid ${validationErrors.genre ? '#ff5757' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: 'rgba(20, 15, 16, 0.5)',
                      minHeight: '120px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '10px'
                      }}>
                        {enums.genres && enums.genres.length > 0 ? enums.genres.map(genre => {
                          const isSelected = formData.genre.includes(genre);
                          return (
                            <label
                              key={genre}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? 'rgba(123, 97, 255, 0.2)' : 'transparent',
                                border: `1px solid ${isSelected ? 'rgba(123, 97, 255, 0.5)' : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.2s',
                                userSelect: 'none'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newGenres = e.target.checked
                                    ? [...formData.genre, genre]
                                    : formData.genre.filter(g => g !== genre);
                                  setFormData({ ...formData, genre: newGenres });
                                  if (validationErrors.genre) {
                                    setValidationErrors({ ...validationErrors, genre: null });
                                  }
                                }}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#7b61ff'
                                }}
                              />
                              <span style={{
                                fontSize: '14px',
                                color: isSelected ? '#fff' : 'rgba(255,255,255,0.8)',
                                fontWeight: isSelected ? 500 : 400
                              }}>
                                {formatGenre(genre)}
                              </span>
                            </label>
                          );
                        }) : (
                          <div style={{ 
                            padding: '20px', 
                            textAlign: 'center', 
                            color: '#c9c4c5',
                            gridColumn: '1 / -1'
                          }}>
                            {enumsLoading ? 'Đang tải...' : 'Không có thể loại nào'}
                          </div>
                        )}
                      </div>
                    </div>
                    {validationErrors.genre && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.genre}
                      </div>
                    )}
                    {formData.genre.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4"/>
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                        Đã chọn {formData.genre.length} thể loại: {formData.genre.map(g => formatGenre(g)).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Thời lượng (phút) <span className="required">*</span></label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => {
                        setFormData({ ...formData, duration: e.target.value });
                        if (validationErrors.duration) {
                          setValidationErrors({ ...validationErrors, duration: null });
                        }
                      }}
                      placeholder="VD: 120"
                      min="1"
                      style={{
                        borderColor: validationErrors.duration ? '#ff5757' : undefined
                      }}
                    />
                    {validationErrors.duration && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.duration}
                      </div>
                    )}
                  </div>
                  <div className="movie-form__group">
                    <label>Ngày phát hành <span className="required">*</span></label>
                    <input
                      type="date"
                      value={formData.releaseDate}
                      onChange={(e) => {
                        setFormData({ ...formData, releaseDate: e.target.value });
                        if (validationErrors.releaseDate) {
                          setValidationErrors({ ...validationErrors, releaseDate: null });
                        }
                      }}
                      style={{
                        borderColor: validationErrors.releaseDate ? '#ff5757' : undefined
                      }}
                    />
                    {validationErrors.releaseDate && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.releaseDate}
                      </div>
                    )}
                  </div>
                </div>
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Độ tuổi <span className="required">*</span></label>
                    <select
                      value={formData.ageRating}
                      onChange={(e) => {
                        setFormData({ ...formData, ageRating: e.target.value });
                        if (validationErrors.ageRating) {
                          setValidationErrors({ ...validationErrors, ageRating: null });
                        }
                      }}
                      style={{
                        borderColor: validationErrors.ageRating ? '#ff5757' : undefined
                      }}
                    >
                      <option value="">Chọn độ tuổi</option>
                      {enums.ageRatings && enums.ageRatings.length > 0 ? enums.ageRatings.map(rating => {
                        const displayValue = enumService.mapAgeRatingToDisplay(rating);
                        return (
                          <option key={rating} value={displayValue}>{displayValue}</option>
                        );
                      }) : (
                        <option value="" disabled>Đang tải...</option>
                      )}
                    </select>
                    {validationErrors.ageRating && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.ageRating}
                      </div>
                    )}
                  </div>
                  <div className="movie-form__group">
                    <label>Đánh dấu kết thúc</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <input
                          type="checkbox"
                          checked={formData.status === 'ENDED'}
                          onChange={(e) => {
                            setFormData({ 
                              ...formData, 
                              status: e.target.checked ? 'ENDED' : '' 
                            });
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #e11b22)' }}
                        />
                        <span>Đánh dấu phim đã kết thúc</span>
                      </label>
                    </div>
                    {formData.status === 'ENDED' && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        Phim sẽ được đánh dấu là đã kết thúc
                      </div>
                    )}
                  </div>
                </div>
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Định dạng <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {enums.roomTypes && enums.roomTypes.length > 0 ? enums.roomTypes.map(roomType => {
                        const displayFmt = enumService.mapRoomTypeToDisplay(roomType);
                        const active = formData.formats.includes(displayFmt);
                        return (
                          <button
                            type="button"
                            key={roomType}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const exists = formData.formats.includes(displayFmt);
                              setFormData({
                                ...formData,
                                formats: exists ? formData.formats.filter(f => f !== displayFmt) : [...formData.formats, displayFmt]
                              });
                              if (validationErrors.formats) {
                                setValidationErrors({ ...validationErrors, formats: null });
                              }
                            }}
                            style={{
                              padding: '10px 16px',
                              borderRadius: '8px',
                              border: `2px solid ${active ? '#7b61ff' : 'rgba(255, 255, 255, 0.2)'}`,
                              background: active ? 'rgba(123, 97, 255, 0.2)' : 'rgba(20, 15, 16, 0.8)',
                              color: active ? '#fff' : '#c9c4c5',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: active ? 600 : 400,
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onMouseOver={(e) => {
                              if (!active) {
                                e.target.style.background = 'rgba(123, 97, 255, 0.1)';
                                e.target.style.borderColor = 'rgba(123, 97, 255, 0.5)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!active) {
                                e.target.style.background = 'rgba(20, 15, 16, 0.8)';
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                              }
                            }}
                          >
                            {displayFmt}
                          </button>
                        );
                      }) : (
                        <div style={{ 
                          padding: '20px', 
                          textAlign: 'center', 
                          color: '#c9c4c5',
                          width: '100%'
                        }}>
                          {enumsLoading ? 'Đang tải...' : 'Không có định dạng nào'}
                        </div>
                      )}
                    </div>
                    {validationErrors.formats && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '8px' }}>
                        {validationErrors.formats}
                      </div>
                    )}
                  </div>
                  <div className="movie-form__group">
                    <label>Ngôn ngữ <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {enums.languages && enums.languages.length > 0 ? enums.languages.map(lang => {
                        const active = formData.languages.includes(lang);
                        return (
                          <button
                            type="button"
                            key={lang}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const exists = formData.languages.includes(lang);
                              setFormData({
                                ...formData,
                                languages: exists ? formData.languages.filter(l => l !== lang) : [...formData.languages, lang]
                              });
                              if (validationErrors.languages) {
                                setValidationErrors({ ...validationErrors, languages: null });
                              }
                            }}
                            style={{
                              padding: '10px 16px',
                              borderRadius: '8px',
                              border: `2px solid ${active ? '#7b61ff' : 'rgba(255, 255, 255, 0.2)'}`,
                              background: active ? 'rgba(123, 97, 255, 0.2)' : 'rgba(20, 15, 16, 0.8)',
                              color: active ? '#fff' : '#c9c4c5',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: active ? 600 : 400,
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onMouseOver={(e) => {
                              if (!active) {
                                e.target.style.background = 'rgba(123, 97, 255, 0.1)';
                                e.target.style.borderColor = 'rgba(123, 97, 255, 0.5)';
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!active) {
                                e.target.style.background = 'rgba(20, 15, 16, 0.8)';
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                              }
                            }}
                          >
                            {lang}
                          </button>
                        );
                      }) : (
                        <div style={{ 
                          padding: '20px', 
                          textAlign: 'center', 
                          color: '#c9c4c5',
                          width: '100%'
                        }}>
                          {enumsLoading ? 'Đang tải...' : 'Không có ngôn ngữ nào'}
                        </div>
                      )}
                    </div>
                    {validationErrors.languages && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '8px' }}>
                        {validationErrors.languages}
                      </div>
                    )}
                  </div>
                </div>
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Đạo diễn <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.director}
                      onChange={(e) => {
                        setFormData({ ...formData, director: e.target.value });
                        if (validationErrors.director) {
                          setValidationErrors({ ...validationErrors, director: null });
                        }
                      }}
                      placeholder="Nhập tên đạo diễn"
                      style={{
                        borderColor: validationErrors.director ? '#ff5757' : undefined
                      }}
                    />
                    {validationErrors.director && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.director}
                      </div>
                    )}
                  </div>
                  <div className="movie-form__group">
                    <label>Diễn viên <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.actor}
                      onChange={(e) => {
                        setFormData({ ...formData, actor: e.target.value });
                        if (validationErrors.actor) {
                          setValidationErrors({ ...validationErrors, actor: null });
                        }
                      }}
                      placeholder="Nhập tên diễn viên (phân cách bằng dấu phẩy)"
                      style={{
                        borderColor: validationErrors.actor ? '#ff5757' : undefined
                      }}
                    />
                    {validationErrors.actor && (
                      <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '4px' }}>
                        {validationErrors.actor}
                      </div>
                    )}
                  </div>
                </div>
                <div className="movie-form__group">
                  <label>Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Nhập mô tả phim"
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#1a1a1a',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7b61ff'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                  />
                </div>
                <div className="movie-form__group">
                  <label>Poster <span className="required">*</span></label>
                  <div className="movie-poster-upload">
                    <div className="movie-poster-upload__options">
                      <label className="movie-poster-upload__btn">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            handlePosterUpload(e);
                            if (validationErrors.poster) {
                              setValidationErrors({ ...validationErrors, poster: null });
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Upload từ máy
                      </label>
                    </div>
                    {formData.poster && (
                      <div className="movie-poster-upload__preview">
                        <img 
                          src={formData.poster} 
                          alt="Poster preview" 
                          className="movie-form__poster-preview" 
                        />
                        <button
                          type="button"
                          className="movie-poster-upload__remove"
                          onClick={handleRemovePoster}
                          title="Xóa poster"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {validationErrors.poster && (
                    <div style={{ color: '#ff5757', fontSize: '12px', marginTop: '8px' }}>
                      {validationErrors.poster}
                    </div>
                  )}
                </div>
                <div className="movie-form__group">
                  <label>URL Trailer (YouTube)</label>
                  <input
                    type="url"
                    value={formData.trailerURL}
                    onChange={(e) => setFormData({ ...formData, trailerURL: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>
              )}
            </div>
            <div className="movie-modal__footer">
              <button className="btn btn--ghost" onClick={() => {
                setShowModal(false);
                setPosterPreview('');
              }}>
                Hủy
              </button>
              <button 
                className="btn btn--primary" 
                onClick={handleSaveMovie}
                disabled={enumsLoading}
              >
                {editingMovie ? 'Cập nhật' : 'Thêm phim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => handleDeleteMovie(deleteConfirm?.movieId)}
        title={deleteConfirm?.title}
        message={deleteConfirm ? `Bạn có chắc chắn muốn xóa phim "${deleteConfirm.title}"?` : ''}
        confirmText="Xóa phim"
        isDeleting={loading}
      />
    </div>
    </>
  );
}

export default MovieManagement;

