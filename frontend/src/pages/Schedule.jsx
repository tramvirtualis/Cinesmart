import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import QuickBooking from '../components/QuickBooking.jsx';
import AgeConfirmationModal from '../components/AgeConfirmationModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import scheduleService from '../services/scheduleService.js';
import showtimeService from '../services/showtimeService.js';
import { enumService } from '../services/enumService.js';
import { movieService } from '../services/movieService.js';

const formatTime = (value) => {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatRoomType = (format) => {
  if (!format) return '';
  // Convert TYPE_2D -> 2D, TYPE_3D -> 3D, DELUXE -> DELUXE
  if (format.startsWith('TYPE_')) {
    return format.replace('TYPE_', '');
  }
  return format;
};

const formatAgeRating = (ageRating) => {
  if (!ageRating) return 'P';
  const ratingStr = typeof ageRating === 'string' ? ageRating : ageRating.toString();
  return enumService.mapAgeRatingToDisplay(ratingStr) || 'P';
};

const openGoogleMap = (address) => {
  if (!address) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  window.open(url, '_blank');
};


const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Schedule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Initialize from URL params if available
  const [date, setDate] = useState(() => {
    const dateParam = searchParams.get('date');
    return dateParam || '';
  });
  const [movie, setMovie] = useState(() => {
    return searchParams.get('movie') || '';
  });
  const [cinema, setCinema] = useState(() => {
    return searchParams.get('cinema') || '';
  });
  
  // Update state when URL params change
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const movieParam = searchParams.get('movie');
    const cinemaParam = searchParams.get('cinema');
    
    // Update or reset state based on URL params
    setDate(dateParam || '');
    setMovie(movieParam || '');
    setCinema(cinemaParam || '');
  }, [searchParams]);
  const [options, setOptions] = useState({ movies: [], cinemas: [] });
  const [listings, setListings] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDates, setSelectedDates] = useState(new Map()); // Map cinemaId -> selectedDate
  const [dateTabs, setDateTabs] = useState([]);
  const [movieDetails, setMovieDetails] = useState(new Map()); // Map movieId -> movie details
  
  // State for age confirmation modal
  const [showAgeConfirmModal, setShowAgeConfirmModal] = useState(false);
  const [pendingShowtimeId, setPendingShowtimeId] = useState(null);
  const [pendingMovieData, setPendingMovieData] = useState(null);
  const [loadingMovie, setLoadingMovie] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchOptions = async () => {
      setOptionsLoading(true);
      try {
        const data = await scheduleService.getOptions({ date: date || undefined });
        if (!mounted) return;

        const movies = data?.movies || [];
        const cinemas = data?.cinemas || [];
        setOptions({ movies, cinemas });

        if (movie && !movies.some((m) => String(m.movieId) === movie)) {
          setMovie('');
        }
        if (cinema && !cinemas.some((c) => String(c.cinemaId) === cinema)) {
          setCinema('');
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Không thể tải dữ liệu.');
        }
      } finally {
        if (mounted) {
          setOptionsLoading(false);
        }
      }
    };

    fetchOptions();
    return () => {
      mounted = false;
    };
  }, [date]);

  useEffect(() => {
    let mounted = true;
    const movieId = movie ? Number(movie) : undefined;
    const cinemaId = cinema ? Number(cinema) : undefined;

    const fetchListings = async () => {
      setListingsLoading(true);
      setError('');
      try {
        // If date filter is set, only fetch for that date; otherwise fetch for all dates
        const allListings = [];
        const today = new Date();
        
        // Check if we have a specific date filter
        const datesToFetch = date 
          ? [date] 
          : Array.from({ length: 7 }, (_, i) => {
              const dateObj = new Date(today);
              dateObj.setDate(today.getDate() + i);
              return dateObj.toISOString().split('T')[0];
            });
        
        for (const dateStr of datesToFetch) {
          try {
            const data = await scheduleService.getListings({
              date: dateStr,
              movieId,
              cinemaId,
            });
            if (Array.isArray(data)) {
              allListings.push(...data);
            }
          } catch (err) {
            console.error(`Error fetching listings for date ${dateStr}:`, err);
          }
        }
        
        if (!mounted) return;
        
        // Remove duplicates based on showtimeId
        const uniqueListings = [];
        const seenIds = new Set();
        allListings.forEach(item => {
          if (item.showtimeId && !seenIds.has(item.showtimeId)) {
            seenIds.add(item.showtimeId);
            uniqueListings.push(item);
          }
        });
        
        setListings(uniqueListings);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Không thể tải lịch chiếu.');
          setListings([]);
        }
      } finally {
        if (mounted) {
          setListingsLoading(false);
        }
      }
    };

    fetchListings();
    return () => {
      mounted = false;
    };
  }, [movie, cinema]);

  // Load movie details for movies that don't have ageRating
  useEffect(() => {
    const loadMovieDetails = async () => {
      const movieIds = new Set();
      listings.forEach(item => {
        if (item.movieId && !movieDetails.has(item.movieId)) {
          movieIds.add(item.movieId);
        }
      });

      if (movieIds.size === 0) return;

      const detailsMap = new Map(movieDetails);
      const promises = Array.from(movieIds).map(async (movieId) => {
        try {
          const result = await movieService.getPublicMovieById(movieId);
          if (result.success && result.data) {
            detailsMap.set(movieId, {
              ageRating: result.data.ageRating,
              title: result.data.title,
              poster: result.data.poster,
            });
          }
        } catch (err) {
          console.error(`Error loading movie ${movieId}:`, err);
        }
      });

      await Promise.all(promises);
      setMovieDetails(detailsMap);
    };

    loadMovieDetails();
  }, [listings]);

  // Generate date tabs (Today + next 6 days)
  useEffect(() => {
    const generateDateTabs = () => {
      const tabs = [];
      const today = new Date();
      const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
      
      for (let i = 0; i < 7; i++) {
        const dateObj = new Date(today);
        dateObj.setDate(today.getDate() + i);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayName = i === 0 ? 'Hôm nay' : dayNames[dateObj.getDay()];
        const dayNumber = dateObj.getDate();
        const month = dateObj.getMonth() + 1;
        
        tabs.push({
          date: dateStr,
          label: i === 0 ? 'Hôm nay' : dayName,
          dayNumber,
          month,
          fullDate: dateObj
        });
      }
      
      setDateTabs(tabs);
    };
    
    generateDateTabs();
  }, []);

  // Group by cinema instead of movie
  const cinemaGroups = useMemo(() => {
    const cinemaMap = new Map();
    const selectedMovieId = movie ? Number(movie) : null;

    listings.forEach((item) => {
      // If a movie filter is set, only process listings for that movie
      if (selectedMovieId && item.movieId !== selectedMovieId) {
        return;
      }

      const cinemaKey = item.cinemaId ?? `cinema-${item.showtimeId}`;
      const movieKey = item.movieId ?? `movie-${item.showtimeId}`;

      if (!cinemaMap.has(cinemaKey)) {
        cinemaMap.set(cinemaKey, {
          id: item.cinemaId,
          name: item.cinemaName,
          address: item.cinemaAddress,
          movies: new Map(),
        });
      }

      const cinema = cinemaMap.get(cinemaKey);
      
      if (!cinema.movies.has(movieKey)) {
        const movieDetail = movieDetails.get(item.movieId);
        cinema.movies.set(movieKey, {
          id: item.movieId,
          title: item.movieTitle || movieDetail?.title,
          poster: item.moviePoster || movieDetail?.poster,
          ageRating: item.ageRating || movieDetail?.ageRating,
          showtimes: [],
        });
      }

      const formatLabel = item.formatLabel || 'STANDARD';
      const formatParts = formatLabel.split(' • ');
      const roomTypePart = formatParts[0] || formatLabel;
      const languagePart = formatParts[1] || '';
      
      // Get showtime date
      const showtimeDate = item.startTime ? new Date(item.startTime).toISOString().split('T')[0] : null;
      
      cinema.movies.get(movieKey).showtimes.push({
        id: item.showtimeId,
        label: formatTime(item.startTime),
        format: formatRoomType(roomTypePart),
        language: languagePart ? showtimeService.mapLanguageFromBackend(languagePart) : '',
        room: item.cinemaRoomName,
        startTime: item.startTime,
        date: showtimeDate,
        cinemaId: item.cinemaId,
        movieId: item.movieId,
      });
    });

    // Convert to array and sort
    return Array.from(cinemaMap.values())
      .map((cinema) => ({
        ...cinema,
        movies: Array.from(cinema.movies.values())
          .map((movie) => ({
            ...movie,
            showtimes: movie.showtimes.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            ),
          }))
          .filter((movie) => movie.showtimes.length > 0),
      }))
      .filter((cinema) => cinema.movies.length > 0);
  }, [listings, movieDetails, movie]);

  const movieOptions = options.movies || [];
  const cinemaOptions = options.cinemas || [];
  const isLoading = optionsLoading || listingsLoading;
  const hasData = cinemaGroups.length > 0;
  const placeholderPoster = '/src/assets/images/drive-my-car.jpg';

  // Get selected date for a cinema (default to first available date or today)
  const getCinemaSelectedDate = (cinemaId) => {
    return selectedDates.get(cinemaId) || dateTabs[0]?.date || date;
  };

  // Set selected date for a cinema
  const setCinemaSelectedDate = (cinemaId, selectedDate) => {
    setSelectedDates(prev => {
      const newMap = new Map(prev);
      newMap.set(cinemaId, selectedDate);
      return newMap;
    });
  };

  // Filter showtimes by date for a cinema
  const getShowtimesForDate = (showtimes, selectedDate) => {
    if (!selectedDate) return showtimes;
    return showtimes.filter(st => st.date === selectedDate);
  };
  
  // Handle showtime click - check age rating and show confirmation if needed
  const handleShowtimeClick = async (showtime, movie) => {
    // Get age rating from movie or movieDetails
    let ageRating = movie.ageRating;
    let movieTitle = movie.title;
    
    // If ageRating is not available, try to get from movieDetails
    if (!ageRating && movie.id && movieDetails.has(movie.id)) {
      const details = movieDetails.get(movie.id);
      ageRating = details.ageRating;
      movieTitle = details.title || movieTitle;
    }
    
    // Format age rating for display
    const ratingDisplay = ageRating ? formatAgeRating(ageRating) : null;
    
    // Check if user is blocked
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.status === false) {
      setShowBlockedModal(true);
      return;
    }
    
    // If movie age rating is 'P' or null/undefined (assume safe), navigate directly
    if (ratingDisplay === 'P' || !ratingDisplay) {
      navigate(`/book-ticket?showtimeId=${showtime.id}`);
      return;
    }
    
    // For non-P movies, show age confirmation modal
    setPendingShowtimeId(showtime.id);
    setLoadingMovie(true);
    
    try {
      // Load full movie details if not already loaded or if ageRating is missing
      if (!movieDetails.has(movie.id) || !ageRating) {
        const result = await movieService.getPublicMovieById(movie.id);
        if (result.success && result.data) {
          const detailsMap = new Map(movieDetails);
          detailsMap.set(movie.id, {
            ageRating: result.data.ageRating,
            title: result.data.title,
            poster: result.data.poster,
          });
          setMovieDetails(detailsMap);
          setPendingMovieData(result.data);
        } else {
          setPendingMovieData({
            ageRating: ageRating || movie.ageRating,
            title: movieTitle || movie.title
          });
        }
      } else {
        const details = movieDetails.get(movie.id);
        setPendingMovieData({
          ageRating: details.ageRating || ageRating,
          title: details.title || movieTitle || movie.title
        });
      }
    } catch (err) {
      console.error('Error loading movie data:', err);
      setPendingMovieData({
        ageRating: ageRating || movie.ageRating,
        title: movieTitle || movie.title
      });
    } finally {
      setLoadingMovie(false);
    }
    
    setShowAgeConfirmModal(true);
  };
  
  // Handle age confirmation - navigate to book ticket
  const handleConfirmAgeAndContinue = () => {
    if (pendingShowtimeId) {
      navigate(`/book-ticket?showtimeId=${pendingShowtimeId}`);
      setShowAgeConfirmModal(false);
      setPendingShowtimeId(null);
      setPendingMovieData(null);
    }
  };

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        {/* Quick Booking Section */}
        <QuickBooking 
          horizontal={true}
          hideTitle={true}
          initialFilters={{
            cinemaId: cinema ? Number(cinema) : undefined,
            movieId: movie ? Number(movie) : undefined,
            date: date || undefined
          }}
          onFilterChange={(filters) => {
          // Update URL params to reflect filters
          const params = new URLSearchParams();
          if (filters.cinemaId) params.set('cinema', String(filters.cinemaId));
          if (filters.movieId) params.set('movie', String(filters.movieId));
          if (filters.date) params.set('date', filters.date);
          
          // Update URL without reloading page
          const queryString = params.toString();
          if (queryString) {
            navigate(`/schedule?${queryString}`, { replace: true });
          } else {
            // If no params, navigate to clean URL
            navigate('/schedule', { replace: true });
          }
          
          // Update state
          if (filters.cinemaId !== undefined) {
            setCinema(filters.cinemaId ? String(filters.cinemaId) : '');
          }
          if (filters.movieId !== undefined) {
            setMovie(filters.movieId ? String(filters.movieId) : '');
          }
          if (filters.date !== undefined) {
            setDate(filters.date || '');
          }
        }} />

        <section id="schedule-section" className="section">
          <div className="container">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2 flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ffd159]">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Lịch chiếu phim
              </h1>
              <p className="text-[#c9c4c5] text-sm">Tìm và đặt vé xem phim yêu thích của bạn</p>
            </div>

            {/* Content Section */}
            <div className="space-y-6">
              {error && (
                <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {isLoading && (
                <div className="bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-xl p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#ffd159] border-t-transparent mb-4"></div>
                  <p className="text-[#c9c4c5]">Đang tải dữ liệu...</p>
                </div>
              )}

              {!isLoading && !error && !hasData && (
                <div className="bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-xl p-12 text-center">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#4a3f41] mx-auto mb-4">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-[#c9c4c5] text-lg mb-2">Không tìm thấy lịch chiếu phù hợp</p>
                  <p className="text-[#7a6f71] text-sm">Vui lòng thử bộ lọc khác hoặc chọn ngày khác</p>
                </div>
              )}

              {!isLoading && !error && hasData && cinemaGroups.map((cinemaGroup) => {
                // Get all available dates for this cinema and sort them
                const availableDates = new Set();
                cinemaGroup.movies.forEach(movie => {
                  movie.showtimes.forEach(st => {
                    if (st.date) availableDates.add(st.date);
                  });
                });
                const sortedDates = Array.from(availableDates).sort();
                const cinemaDateTabs = dateTabs.filter(tab => availableDates.has(tab.date)).sort((a, b) => 
                  new Date(a.date) - new Date(b.date)
                );
                
                return (
                  <div 
                    key={cinemaGroup.id || cinemaGroup.name} 
                    className="bg-gradient-to-br from-[#1f1a1b] to-[#151011] border border-[#6A1B9A]/40 rounded-xl p-4 hover:border-[#9C27B0]/60 transition-all duration-300 shadow-lg mb-4"
                  >
                    {/* Cinema Header - Compact */}
                    <div className="mb-3 pb-3 border-b border-[#6A1B9A]/30">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white">
                          {cinemaGroup.name || 'Rạp đang cập nhật'}
                        </h3>
                        <button
                          onClick={() => openGoogleMap(cinemaGroup.address)}
                          className="inline-flex items-center gap-1 text-xs text-[#AB47BC] hover:text-[#CE93D8] transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          Xem đường đi
                        </button>
                      </div>
                    </div>

                    {/* Table Layout with all dates as columns */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        borderSpacing: 0
                      }}>
                        <thead>
                          <tr style={{ 
                            background: 'linear-gradient(135deg, #6A1B9A 0%, #7B1FA2 100%)',
                            color: '#fff',
                            borderBottom: '2px solid rgba(156, 39, 176, 0.3)'
                          }}>
                            <th style={{ 
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontWeight: 700,
                              fontSize: '13px',
                              borderBottom: '1px solid rgba(156, 39, 176, 0.2)',
                              position: 'sticky',
                              left: 0,
                              background: 'linear-gradient(135deg, #6A1B9A 0%, #7B1FA2 100%)',
                              zIndex: 10
                            }}>
                              Phim
                            </th>
                            {cinemaDateTabs.map((tab) => (
                              <th key={tab.date} style={{ 
                                padding: '8px 12px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                borderBottom: '1px solid rgba(156, 39, 176, 0.2)',
                                minWidth: '150px'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '12px' }}>{tab.dayNumber}/{tab.month}</span>
                                  <span style={{ fontSize: '10px', opacity: 0.9 }}>{tab.label}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cinemaGroup.movies.map((movie) => {
                            // Check if movie has any showtimes across all dates
                            const hasAnyShowtimes = cinemaDateTabs.some(tab => {
                              const showtimesForDate = getShowtimesForDate(movie.showtimes, tab.date);
                              return showtimesForDate.length > 0;
                            });
                            
                            if (!hasAnyShowtimes) return null;

                            return (
                              <tr 
                                key={movie.id || movie.title}
                                style={{
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'background-color 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(156, 39, 176, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {/* Movie Info Column */}
                                <td style={{ 
                                  padding: '10px 12px',
                                  verticalAlign: 'top',
                                  width: '250px',
                                  minWidth: '200px',
                                  position: 'sticky',
                                  left: 0,
                                  background: 'inherit',
                                  zIndex: 5
                                }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <Link 
                                        to={movie.id ? `/movie/${movie.id}` : '#'}
                                        style={{
                                          textDecoration: 'none',
                                          color: '#ffd159',
                                          fontSize: '14px',
                                          fontWeight: 700,
                                          transition: 'color 0.2s ease',
                                          lineHeight: '1.3'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = '#fff';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = '#ffd159';
                                        }}
                                      >
                                        {movie.title || 'Đang cập nhật'}
                                      </Link>
                                      {movie.ageRating && (
                                        <span style={{
                                          padding: '2px 6px',
                                          borderRadius: '3px',
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          backgroundColor: formatAgeRating(movie.ageRating) === 'P' || formatAgeRating(movie.ageRating) === 'K' 
                                            ? 'rgba(76, 175, 80, 0.2)' 
                                            : formatAgeRating(movie.ageRating) === '13+' || formatAgeRating(movie.ageRating) === '16+'
                                            ? 'rgba(255, 193, 7, 0.2)'
                                            : 'rgba(244, 67, 54, 0.2)',
                                          color: formatAgeRating(movie.ageRating) === 'P' || formatAgeRating(movie.ageRating) === 'K'
                                            ? '#4caf50'
                                            : formatAgeRating(movie.ageRating) === '13+' || formatAgeRating(movie.ageRating) === '16+'
                                            ? '#ffc107'
                                            : '#f44336',
                                          border: `1px solid ${formatAgeRating(movie.ageRating) === 'P' || formatAgeRating(movie.ageRating) === 'K'
                                            ? 'rgba(76, 175, 80, 0.4)'
                                            : formatAgeRating(movie.ageRating) === '13+' || formatAgeRating(movie.ageRating) === '16+'
                                            ? 'rgba(255, 193, 7, 0.4)'
                                            : 'rgba(244, 67, 54, 0.4)'}`
                                        }}>
                                          {formatAgeRating(movie.ageRating)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Showtimes for each date */}
                                {cinemaDateTabs.map((tab) => {
                                  const showtimesForDate = getShowtimesForDate(movie.showtimes, tab.date);
                                  
                                  return (
                                    <td key={tab.date} style={{ 
                                      padding: '10px 12px',
                                      verticalAlign: 'top'
                                    }}>
                                      {showtimesForDate.length > 0 ? (
                                        <div style={{ 
                                          display: 'flex', 
                                          flexWrap: 'wrap', 
                                          gap: '6px',
                                          alignItems: 'flex-start',
                                          justifyContent: 'center'
                                        }}>
                                          {showtimesForDate.map((showtime) => (
                                            <button
                                              key={showtime.id}
                                              onClick={() => handleShowtimeClick(showtime, movie)}
                                              style={{
                                                padding: '6px 10px',
                                                background: 'rgba(255, 193, 7, 0.12)',
                                                border: '1px solid rgba(255, 193, 7, 0.35)',
                                                borderRadius: '4px',
                                                color: '#ffc107',
                                                fontWeight: 600,
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 250ms ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '2px',
                                                textAlign: 'center',
                                                minWidth: '60px',
                                                minHeight: '45px',
                                                justifyContent: 'center',
                                                whiteSpace: 'nowrap'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.target.style.background = 'rgba(255, 193, 7, 0.22)';
                                                e.target.style.borderColor = 'rgba(255, 193, 7, 0.55)';
                                                e.target.style.color = '#ffd159';
                                                e.target.style.transform = 'translateY(-1px)';
                                                e.target.style.boxShadow = '0 2px 8px rgba(255, 193, 7, 0.25)';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.background = 'rgba(255, 193, 7, 0.12)';
                                                e.target.style.borderColor = 'rgba(255, 193, 7, 0.35)';
                                                e.target.style.color = '#ffc107';
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = 'none';
                                              }}
                                              title={showtime.room ? `Phòng: ${showtime.room}` : undefined}
                                            >
                                              <span style={{ fontWeight: 700, fontSize: '13px', lineHeight: '1.2' }}>
                                                {showtime.label}
                                              </span>
                                              <span style={{ fontSize: '9px', opacity: 0.95, lineHeight: '1.2' }}>
                                                {showtime.format}{showtime.language ? ` • ${showtime.language}` : ''}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <div style={{ 
                                          color: '#7a6f71', 
                                          fontSize: '11px', 
                                          textAlign: 'center',
                                          padding: '10px 0'
                                        }}>
                                          -
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>
      </main>

      <Footer />
      
      {/* Age Confirmation Modal */}
      <AgeConfirmationModal
        isOpen={showAgeConfirmModal}
        onClose={() => {
          setShowAgeConfirmModal(false);
          setPendingShowtimeId(null);
          setPendingMovieData(null);
        }}
        onConfirm={handleConfirmAgeAndContinue}
        movieTitle={pendingMovieData?.title || movie?.title}
        ageRating={pendingMovieData?.ageRating || movie?.ageRating}
        loading={loadingMovie}
      />

      <ConfirmModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        onConfirm={() => setShowBlockedModal(false)}
        title="Tài khoản bị chặn"
        message="Tài khoản của bạn đã bị chặn. Bạn không thể đặt vé. Vui lòng liên hệ quản trị viên để được hỗ trợ."
        confirmText="Đã hiểu"
        type="alert"
        confirmButtonStyle="primary"
      />
    </div>
  );
}
