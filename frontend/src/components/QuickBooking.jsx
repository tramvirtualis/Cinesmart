import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import scheduleService from '../services/scheduleService';
import { movieService } from '../services/movieService';
import { enumService } from '../services/enumService';
import showtimeService from '../services/showtimeService';
import AgeConfirmationModal from './AgeConfirmationModal.jsx';

const QuickBooking = ({ onFilterChange, horizontal = false, hideTitle = false, initialFilters = null }) => {
  const navigate = useNavigate();
  
  // Initialize from props if provided (from URL params)
  const [selectedCinemaId, setSelectedCinemaId] = useState(() => {
    return initialFilters?.cinemaId ? String(initialFilters.cinemaId) : '';
  });
  const [selectedMovieId, setSelectedMovieId] = useState(() => {
    return initialFilters?.movieId ? String(initialFilters.movieId) : '';
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    return initialFilters?.date || '';
  });
  
  // Update when initialFilters change
  useEffect(() => {
    if (initialFilters) {
      // Check if all values are undefined (reset case)
      const allUndefined = initialFilters.cinemaId === undefined && 
                          initialFilters.movieId === undefined && 
                          initialFilters.date === undefined;
      
      if (allUndefined) {
        // Reset all fields
        setSelectedCinemaId('');
        setSelectedMovieId('');
        setSelectedDate('');
      } else {
        // Update individual fields
        if (initialFilters.cinemaId !== undefined) {
          setSelectedCinemaId(initialFilters.cinemaId ? String(initialFilters.cinemaId) : '');
        }
        if (initialFilters.movieId !== undefined) {
          setSelectedMovieId(initialFilters.movieId ? String(initialFilters.movieId) : '');
        }
        if (initialFilters.date !== undefined) {
          setSelectedDate(initialFilters.date || '');
        }
      }
    } else {
      // Reset when initialFilters is null/undefined
      setSelectedCinemaId('');
      setSelectedMovieId('');
      setSelectedDate('');
    }
  }, [initialFilters]);
  
  // State cho options
  const [cinemas, setCinemas] = useState([]);
  const [movies, setMovies] = useState([]);
  const [dateTimeOptions, setDateTimeOptions] = useState([]);
  
  // State cho loading và error
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState(null);
  
  // State cho age confirmation modal
  const [showAgeConfirmModal, setShowAgeConfirmModal] = useState(false);
  const [pendingShowtime, setPendingShowtime] = useState(null);
  const [movieData, setMovieData] = useState(null);
  const [loadingMovie, setLoadingMovie] = useState(false);
  
  // Load tất cả options khi component mount
  useEffect(() => {
    const loadAllOptions = async () => {
      setLoadingOptions(true);
      try {
        // Load cinemas và movies từ scheduleService
        const options = await scheduleService.getOptions({});
        
        if (options) {
          setCinemas(options.cinemas || []);
          setMovies(options.movies || []);
        }
        
        // Load available dates (today + next 6 days)
            const today = new Date();
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          dates.push({
            value: date.toISOString().split('T')[0],
            label: formatDateLabel(date, i)
          });
        }
        setDateTimeOptions(dates);
      } catch (err) {
        console.error('Error loading options:', err);
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoadingOptions(false);
      }
    };
    
    loadAllOptions();
  }, []);
  
  // Format date label
  const formatDateLabel = (date, index) => {
    const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    
    if (index === 0) {
      return `Hôm nay - ${day}/${month}`;
    } else if (index === 1) {
      return `Ngày mai - ${day}/${month}`;
    } else {
      return `${dayNames[date.getDay()]} ${day}/${month}`;
    }
  };
  
  // Handle cinema change - update movies and date/time options
  const handleCinemaChange = async (cinemaId) => {
    setSelectedCinemaId(cinemaId);
    setError(null);
    
    // Clear date if cinema changes (unless movie is also selected, then we'll filter dates)
    if (!selectedMovieId) {
      setSelectedDate('');
    }
    
    if (!cinemaId) {
      // Reset to all movies and dates if no cinema selected
      const options = await scheduleService.getOptions({});
      setMovies(options?.movies || []);
      // Reset to all dates
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push({
          value: date.toISOString().split('T')[0],
          label: formatDateLabel(date, i)
        });
      }
      setDateTimeOptions(dates);
      return;
    }
    
    try {
    setLoading(true);
      const cinemaIdNum = Number(cinemaId);
      
      // If a movie is already selected, filter by both cinema and movie
      if (selectedMovieId) {
        const movieIdNum = Number(selectedMovieId);
        
        // Get available dates for this cinema + movie combination
        const availableDates = new Set();
            const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const listings = await scheduleService.getListings({
              cinemaId: cinemaIdNum,
              movieId: movieIdNum,
              date: dateStr
            });
            
            if (listings && listings.length > 0) {
              availableDates.add(dateStr);
            }
      } catch (err) {
            // Skip if error
          }
        }
        
        // Update dates
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (availableDates.has(dateStr)) {
            dates.push({
              value: dateStr,
              label: formatDateLabel(date, i)
            });
          }
        }
        setDateTimeOptions(dates);
        
        // If date is already selected, verify it's still valid
        if (selectedDate && !availableDates.has(selectedDate)) {
          setSelectedDate('');
        }
      }
      // If a date is already selected, filter movies for this cinema + date
      else if (selectedDate) {
        const availableMovies = new Set();
        
        try {
          const listings = await scheduleService.getListings({
            cinemaId: cinemaIdNum,
            date: selectedDate
          });
          
          if (listings && listings.length > 0) {
            listings.forEach(listing => {
              if (listing.movieId) {
                availableMovies.add(listing.movieId);
              }
            });
          }
        } catch (err) {
          console.error('Error loading movies for cinema + date:', err);
        }
        
        // Filter movies list
        const allMovies = movies.length > 0 ? movies : (await scheduleService.getOptions({ cinemaId: cinemaIdNum }))?.movies || [];
        const filteredMovies = allMovies.filter(m => availableMovies.has(m.movieId));
        setMovies(filteredMovies);
        
        // Clear selected movie if it's not in filtered list
        if (selectedMovieId && !filteredMovies.find(m => m.movieId === Number(selectedMovieId))) {
          setSelectedMovieId('');
        }
        
        // Get available dates for this cinema
        const availableDates = new Set();
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const listings = await scheduleService.getListings({
              cinemaId: cinemaIdNum,
              date: dateStr
            });
            
            if (listings && listings.length > 0) {
              availableDates.add(dateStr);
            }
          } catch (err) {
            // Skip if error
          }
        }
        
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (availableDates.has(dateStr)) {
            dates.push({
              value: dateStr,
              label: formatDateLabel(date, i)
            });
          }
        }
        setDateTimeOptions(dates);
      } else {
        // No movie and no date selected, just get dates for this cinema
        const availableDates = new Set();
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const listings = await scheduleService.getListings({
              cinemaId: cinemaIdNum,
              date: dateStr
            });
            
            if (listings && listings.length > 0) {
              availableDates.add(dateStr);
      }
    } catch (err) {
            // Skip if error
          }
        }
        
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (availableDates.has(dateStr)) {
            dates.push({
              value: dateStr,
              label: formatDateLabel(date, i)
            });
          }
        }
        setDateTimeOptions(dates);
        
        // Get movies for this cinema
        const options = await scheduleService.getOptions({ cinemaId: cinemaIdNum });
        const cinemaMovies = options?.movies || [];
        
        // If selected movie is still in the list, keep it; otherwise clear it
        if (selectedMovieId && !cinemaMovies.find(m => m.movieId === Number(selectedMovieId))) {
          setSelectedMovieId('');
        }
        
        setMovies(cinemaMovies);
      }
    } catch (err) {
      console.error('Error loading data for cinema:', err);
      setError('Không thể tải dữ liệu cho rạp này.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle movie change - update cinemas and date/time options
  const handleMovieChange = async (movieId) => {
    setSelectedMovieId(movieId);
    setError(null);
    
    // Don't clear date if it's already selected - we'll filter based on movie + date
    // Only clear date if no cinema is selected AND no date is selected (but this shouldn't happen)
    
    if (!movieId) {
      // Reset to all cinemas and dates if no movie selected
      const options = await scheduleService.getOptions({});
      setCinemas(options?.cinemas || []);
      // Reset to all dates
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push({
          value: date.toISOString().split('T')[0],
          label: formatDateLabel(date, i)
        });
      }
      setDateTimeOptions(dates);
      return;
    }
    
    try {
      setLoading(true);
      const movieIdNum = Number(movieId);
      
      // If a cinema is already selected, filter by both cinema and movie
      if (selectedCinemaId) {
        const cinemaIdNum = Number(selectedCinemaId);
        
        // Get available dates for this cinema + movie combination
        const availableDates = new Set();
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const listings = await scheduleService.getListings({
              cinemaId: cinemaIdNum,
              movieId: movieIdNum,
              date: dateStr
            });
            
            if (listings && listings.length > 0) {
              availableDates.add(dateStr);
            }
          } catch (err) {
            // Skip if error
          }
        }
        
        // Update dates
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (availableDates.has(dateStr)) {
            dates.push({
              value: dateStr,
              label: formatDateLabel(date, i)
            });
          }
        }
        setDateTimeOptions(dates);
        
        // If date is already selected, verify it's still valid
        if (selectedDate && !availableDates.has(selectedDate)) {
          setSelectedDate('');
        }
      }
      // If a date is already selected, filter cinemas for this movie + date
      else if (selectedDate) {
        const availableCinemas = new Set();
        
        try {
          const listings = await scheduleService.getListings({
            movieId: movieIdNum,
            date: selectedDate
          });
          
          if (listings && listings.length > 0) {
            listings.forEach(listing => {
              if (listing.cinemaId) {
                availableCinemas.add(listing.cinemaId);
              }
            });
          }
        } catch (err) {
          console.error('Error loading cinemas for movie + date:', err);
        }
        
        // Filter cinemas list
        const allCinemas = cinemas.length > 0 ? cinemas : (await scheduleService.getOptions({ movieId: movieIdNum }))?.cinemas || [];
        const filteredCinemas = allCinemas.filter(c => availableCinemas.has(c.cinemaId));
        setCinemas(filteredCinemas);
        
        // Clear selected cinema if it's not in filtered list
        if (selectedCinemaId && !filteredCinemas.find(c => c.cinemaId === Number(selectedCinemaId))) {
          setSelectedCinemaId('');
        }
        
        // Get available dates for this movie
        const availableDates = new Set();
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const listings = await scheduleService.getListings({
              movieId: movieIdNum,
              date: dateStr
            });
            
            if (listings && listings.length > 0) {
              availableDates.add(dateStr);
            }
          } catch (err) {
            // Skip if error
          }
        }
        
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (availableDates.has(dateStr)) {
            dates.push({
              value: dateStr,
              label: formatDateLabel(date, i)
            });
          }
        }
        setDateTimeOptions(dates);
        
        // If date is already selected, verify it's still valid for this movie
        if (selectedDate && !availableDates.has(selectedDate)) {
          setSelectedDate('');
        }
      } else {
        // No cinema and no date selected, get cinemas and dates for this movie
        const availableDates = new Set();
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          try {
            const listings = await scheduleService.getListings({
              movieId: movieIdNum,
              date: dateStr
            });
            
            if (listings && listings.length > 0) {
              availableDates.add(dateStr);
      }
    } catch (err) {
            // Skip if error
          }
        }
        
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (availableDates.has(dateStr)) {
            dates.push({
              value: dateStr,
              label: formatDateLabel(date, i)
            });
          }
        }
        setDateTimeOptions(dates);
        
        // Get cinemas for this movie
        const options = await scheduleService.getOptions({ movieId: movieIdNum });
        const movieCinemas = options?.cinemas || [];
        
        // If selected cinema is still in the list, keep it; otherwise clear it
        if (selectedCinemaId && !movieCinemas.find(c => c.cinemaId === Number(selectedCinemaId))) {
          setSelectedCinemaId('');
        }
        
        setCinemas(movieCinemas);
      }
    } catch (err) {
      console.error('Error loading data for movie:', err);
      setError('Không thể tải dữ liệu cho phim này.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle date change - update cinemas and movies if other filters are selected
  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setError(null);
    
    if (!date) {
      return;
    }
    
    // If both cinema and movie are selected, no need to update
    if (selectedCinemaId && selectedMovieId) {
      return;
    }
    
    try {
      setLoading(true);
      const dateStr = date;
      
      // If cinema is selected but not movie, filter movies for this cinema + date
      if (selectedCinemaId && !selectedMovieId) {
        const cinemaIdNum = Number(selectedCinemaId);
        const availableMovies = new Set();
        
        try {
          const listings = await scheduleService.getListings({
            cinemaId: cinemaIdNum,
            date: dateStr
          });
          
          if (listings && listings.length > 0) {
            listings.forEach(listing => {
              if (listing.movieId) {
                availableMovies.add(listing.movieId);
              }
            });
          }
        } catch (err) {
          console.error('Error loading movies for cinema + date:', err);
        }
        
        // Load all movies first, then filter by available movies for this cinema + date
        const allMoviesOptions = await scheduleService.getOptions({ cinemaId: cinemaIdNum });
        const allMovies = allMoviesOptions?.movies || [];
        const filteredMovies = allMovies.filter(m => availableMovies.has(m.movieId));
        setMovies(filteredMovies);
        
        // Clear selected movie if it's not in filtered list
        if (selectedMovieId && !filteredMovies.find(m => m.movieId === Number(selectedMovieId))) {
          setSelectedMovieId('');
        }
      }
      // If movie is selected but not cinema, filter cinemas for this movie + date
      else if (selectedMovieId && !selectedCinemaId) {
        const movieIdNum = Number(selectedMovieId);
        const availableCinemas = new Set();
        
        try {
          const listings = await scheduleService.getListings({
            movieId: movieIdNum,
            date: dateStr
          });
          
          if (listings && listings.length > 0) {
            listings.forEach(listing => {
              if (listing.cinemaId) {
                availableCinemas.add(listing.cinemaId);
              }
            });
          }
        } catch (err) {
          console.error('Error loading cinemas for movie + date:', err);
        }
        
        // Filter cinemas list to only show available cinemas
        const filteredCinemas = cinemas.filter(c => availableCinemas.has(c.cinemaId));
        setCinemas(filteredCinemas);
        
        // Clear selected cinema if it's not in filtered list
        if (selectedCinemaId && !filteredCinemas.find(c => c.cinemaId === Number(selectedCinemaId))) {
          setSelectedCinemaId('');
        }
      }
      // If neither is selected, load options for this date
      else {
        const options = await scheduleService.getOptions({ date: dateStr });
        if (options) {
          if (!selectedCinemaId) {
            setCinemas(options.cinemas || []);
          }
          if (!selectedMovieId) {
            setMovies(options.movies || []);
          }
        }
      }
    } catch (err) {
      console.error('Error loading data for date:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Go button - filter schedule
  const handleGo = () => {
    // Check if at least one filter is selected
    if (!selectedCinemaId && !selectedMovieId && !selectedDate) {
      setError('Vui lòng chọn ít nhất một tiêu chí: Rạp, Phim hoặc Ngày & Giờ');
      return;
    }
    
    setError(null);
    
    // Notify parent component (Schedule page) to filter
    if (onFilterChange) {
      onFilterChange({
        cinemaId: selectedCinemaId ? Number(selectedCinemaId) : undefined,
        movieId: selectedMovieId ? Number(selectedMovieId) : undefined,
        date: selectedDate || undefined
      });
    }
    
    // Scroll to schedule section
    setTimeout(() => {
      const scheduleSection = document.getElementById('schedule-section');
      if (scheduleSection) {
        scheduleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  
  // Handle showtime selection - check age rating and navigate
  const handleShowtimeSelect = async (showtime) => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.status === false) {
      setError('Tài khoản của bạn đã bị chặn. Bạn không thể đặt vé. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
      return;
    }
    
    setPendingShowtime(showtime);
    setLoadingMovie(true);
    setError(null);
    
    try {
      // Get movie info for age rating check
      if (showtime.movieId) {
        const movieResult = await movieService.getPublicMovieById(showtime.movieId);
        if (movieResult.success && movieResult.data) {
          const movie = movieResult.data;
          setMovieData(movie);
          
          // Check age rating - if "P", navigate directly
          const ageRating = movie.ageRating;
          const ratingDisplay = enumService.mapAgeRatingToDisplay(ageRating);
          
          if (ratingDisplay === 'P') {
            setLoadingMovie(false);
            navigate(`/book-ticket?showtimeId=${showtime.showtimeId}`);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error loading movie data:', err);
    } finally {
      setLoadingMovie(false);
    }
    
    // Show age confirmation modal if not P
    setShowAgeConfirmModal(true);
  };
  
  // Handle age confirmation
  const handleConfirmAgeAndContinue = () => {
    if (!pendingShowtime) {
      return;
    }
    
    navigate(`/book-ticket?showtimeId=${pendingShowtime.showtimeId}`);
    setShowAgeConfirmModal(false);
    setPendingShowtime(null);
    setMovieData(null);
  };
  
  // Handle Reset button
  const handleReset = () => {
    setSelectedCinemaId('');
    setSelectedMovieId('');
    setSelectedDate('');
    setError(null);
    
    // Reset date options to all 7 days
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: formatDateLabel(date, i)
      });
    }
    setDateTimeOptions(dates);
    
    // Notify parent component to reset filters and URL
    if (onFilterChange) {
      onFilterChange({
        cinemaId: undefined,
        movieId: undefined,
        date: undefined
      });
    }
    
    // Reload all options
    const loadAllOptions = async () => {
      try {
        const options = await scheduleService.getOptions({});
        setCinemas(options?.cinemas || []);
        setMovies(options?.movies || []);
      } catch (err) {
        console.error('Error reloading options:', err);
      }
    };
    
    loadAllOptions();
  };
  
  return (
    <section className="section" id="quick-booking" style={{ marginBottom: horizontal ? '20px' : '60px' }}>
      <div className="container">
        {!hideTitle && (
        <div className="section__head">
          <h2 className="section__title">Đặt Vé Nhanh</h2>
        </div>
        )}
        
        <div className={`quick-booking-wrapper ${horizontal ? 'quick-booking-horizontal' : ''}`}>
          {error && (
            <div className="quick-booking-error">
              <p>{error}</p>
            </div>
          )}
          
          {loadingOptions ? (
            <div className="quick-booking-loading">
              <div className="loading-spinner"></div>
              <p>Đang tải...</p>
            </div>
          ) : (
            <div className="quick-booking-form">
              <div className="form-group">
                <label className="form-label">Chọn Rạp</label>
                <select
                  className="form-select"
                  value={selectedCinemaId}
                  onChange={(e) => handleCinemaChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Chọn Rạp --</option>
                  {cinemas.map((cinema) => (
                    <option key={cinema.cinemaId} value={cinema.cinemaId}>
                      {cinema.name}
                    </option>
                  ))}
                </select>
                </div>
              
              <div className="form-group">
                <label className="form-label">Chọn Phim</label>
                <select
                  className="form-select"
                  value={selectedMovieId}
                  onChange={(e) => handleMovieChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Chọn Phim --</option>
                  {movies.map((movie) => (
                    <option key={movie.movieId} value={movie.movieId}>
                      {movie.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Chọn Ngày</label>
                <select
                  className="form-select"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Chọn Ngày --</option>
                  {dateTimeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-actions">
                <button
                  className="btn-reset"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Reset
                </button>
                      <button
                  className="btn-go"
                  onClick={handleGo}
                  disabled={loading || (!selectedCinemaId && !selectedMovieId && !selectedDate)}
                >
                  Go
                      </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Age Confirmation Modal */}
      <AgeConfirmationModal
        isOpen={showAgeConfirmModal}
        onClose={() => {
              setShowAgeConfirmModal(false);
              setPendingShowtime(null);
              setMovieData(null);
        }}
        onConfirm={handleConfirmAgeAndContinue}
        movieTitle={movieData?.title || pendingShowtime?.movieTitle}
        ageRating={movieData?.ageRating}
        loading={loadingMovie}
      />
      
      <style>{`
        .quick-booking-wrapper {
          background: linear-gradient(135deg, #2a2627 0%, #1a1415 100%);
          border-radius: 16px;
          padding: 40px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .quick-booking-error {
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        
        .quick-booking-error p {
          color: #ff5252;
          margin: 0;
          font-size: 14px;
        }
        
        .quick-booking-loading {
          text-align: center;
          padding: 60px 20px;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: #9C27B0;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .quick-booking-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .quick-booking-horizontal .quick-booking-form {
          flex-direction: row;
          align-items: flex-end;
          gap: 16px;
        }
        
        .quick-booking-horizontal .form-group {
          flex: 1;
        }
        
        .quick-booking-horizontal .form-actions {
          margin-top: 0;
          flex-shrink: 0;
        }
        
        .quick-booking-horizontal .quick-booking-wrapper {
          padding: 24px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-label {
          font-weight: 700;
          font-size: 14px;
          color: #fff;
          margin: 0;
        }
        
        .form-select {
          width: 100%;
          padding: 12px 16px;
          background: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          font-size: 14px;
          color: #000;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .form-select:focus {
          outline: none;
          border-color: #9C27B0;
          box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
        }
        
        .form-select:hover:not(:disabled) {
          border-color: rgba(156, 39, 176, 0.3);
        }
        
        .form-select:disabled {
          background: #e0e0e0;
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .form-select option {
          color: #000;
          background: #fff;
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        
        .btn-reset,
        .btn-go {
          flex: 1;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-reset {
          background: #757575;
          color: #fff;
        }
        
        .btn-reset:hover:not(:disabled) {
          background: #616161;
        }
        
        .btn-go {
          background: #9C27B0;
          color: #fff;
        }
        
        .btn-go:hover:not(:disabled) {
          background: #7B1FA2;
        }
        
        .btn-reset:disabled,
        .btn-go:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          .quick-booking-wrapper {
            padding: 24px;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
};

export default QuickBooking;
