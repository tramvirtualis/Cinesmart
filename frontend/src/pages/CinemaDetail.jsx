import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import AgeConfirmationModal from '../components/AgeConfirmationModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { cinemaComplexService } from '../services/cinemaComplexService';
import scheduleService from '../services/scheduleService';
import { movieService } from '../services/movieService';
import { enumService } from '../services/enumService';

export default function CinemaDetail() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = useMemo(() => {
    return Object.fromEntries(searchParams.entries());
  }, [searchParams]);

  const cinemaName = decodeURIComponent(name || query.name || '');
  const province = decodeURIComponent(query.province || '');
  
  const [cinema, setCinema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [dateTabs, setDateTabs] = useState([]);
  const [availableDates, setAvailableDates] = useState(new Set());
  const [showAgeConfirmModal, setShowAgeConfirmModal] = useState(false);
  const [pendingShowtime, setPendingShowtime] = useState(null);
  const [pendingMovie, setPendingMovie] = useState(null);

  const openGoogleMap = (address) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };
  
  // Load cinema info
  useEffect(() => {
    const loadCinema = async () => {
      if (!cinemaName) {
        setError('Không tìm thấy tên rạp');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const cinemasResult = await cinemaComplexService.getAllCinemaComplexes();
        if (!cinemasResult.success || !cinemasResult.data) {
          throw new Error('Không thể tải danh sách rạp');
        }

        const foundCinema = cinemasResult.data.find(
          c => c.name === cinemaName && 
          (province ? c.addressProvince === province : true)
        );

        if (!foundCinema) {
          const foundByName = cinemasResult.data.find(c => c.name === cinemaName);
          if (foundByName) {
            setCinema(foundByName);
          } else {
            throw new Error(`Không tìm thấy rạp "${cinemaName}"`);
          }
        } else {
          setCinema(foundCinema);
            }
          } catch (err) {
        console.error('Error loading cinema data:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    loadCinema();
  }, [cinemaName, province]);

  // Load available dates and showtimes
  useEffect(() => {
    const loadAvailableDates = async () => {
      if (!cinema) return;

      try {
        // Get all showtimes (no date filter) to find available dates
        const allListings = await scheduleService.getListings({
          cinemaId: cinema.complexId,
          date: undefined
        });

        const listingsArray = Array.isArray(allListings) 
          ? allListings 
          : (allListings?.data || Object.values(allListings || {}).flat());

        const datesSet = new Set();
        const now = new Date();
        
        listingsArray.forEach(listing => {
                const startTime = listing.startTime || listing.startDateTime;
                if (startTime) {
                  const showtimeDate = new Date(startTime);
                  if (showtimeDate >= now) {
              const dateStr = showtimeDate.toISOString().split('T')[0];
              datesSet.add(dateStr);
                }
              }
            });

        setAvailableDates(datesSet);

        // Generate date tabs only for available dates
        const today = new Date();
        const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        const tabs = [];
        
        for (let i = 0; i < 14; i++) { // Check up to 14 days ahead
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (datesSet.has(dateStr)) {
            const dayName = i === 0 ? 'Hôm nay' : dayNames[date.getDay()];
            tabs.push({
              date: dateStr,
              label: i === 0 ? 'Hôm nay' : dayName,
              dayNumber: date.getDate(),
              month: date.getMonth() + 1,
              fullDate: date
            });
          }
        }
        
        setDateTabs(tabs);
        if (tabs.length > 0) {
          // Set selectedDate if not set or if current selectedDate is not available
          setSelectedDate(prev => {
            if (!prev || !datesSet.has(prev)) {
              return tabs[0].date;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error loading available dates:', err);
        setAvailableDates(new Set());
        setDateTabs([]);
      }
    };

    loadAvailableDates();
  }, [cinema]);

  // Load showtimes for selected date
  useEffect(() => {
    const loadShowtimes = async () => {
      if (!cinema || !selectedDate) return;

      setLoadingShowtimes(true);
      try {
        const listings = await scheduleService.getListings({
          cinemaId: cinema.complexId,
          date: selectedDate
        });

        // Process listings - group by movie
        const movieMap = new Map();
        const movieIds = new Set();
        
        const listingsArray = Array.isArray(listings) 
          ? listings 
          : (listings?.data || Object.values(listings || {}).flat());

        listingsArray.forEach(listing => {
          const movieId = listing.movieId || listing.movie?.movieId;
          if (!movieId) return;

          movieIds.add(Number(movieId));
          const movie = listing.movie || {};
          
          if (!movieMap.has(movieId)) {
            movieMap.set(movieId, {
              movieId: Number(movieId),
              showtimes: []
            });
          }

          const startTime = listing.startTime || listing.startDateTime;
          if (startTime) {
            const showtimeDate = new Date(startTime);
            const now = new Date();
            
            // Only show future showtimes
            if (showtimeDate >= now) {
              const timeStr = showtimeDate.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              
              movieMap.get(movieId).showtimes.push({
                showtimeId: listing.showtimeId,
                time: timeStr,
                format: listing.format || listing.roomType || '2D',
                language: listing.language || movie.languages?.[0] || 'Phụ đề',
                startTime: startTime
              });
            }
          }
        });

        // Load full movie details
        if (movieIds.size > 0) {
          try {
            const moviesResult = await movieService.getPublicMovies();
            if (moviesResult.success && moviesResult.data) {
              const moviesData = moviesResult.data.filter(m => movieIds.has(Number(m.movieId)));
              
              moviesData.forEach(movieData => {
                const movieId = Number(movieData.movieId);
                if (movieMap.has(movieId)) {
                  const movieInfo = movieMap.get(movieId);
                  movieInfo.movieTitle = movieData.title || 'Unknown';
                  movieInfo.moviePoster = movieData.poster || '';
                  movieInfo.ageRating = movieData.ageRating;
                  movieInfo.genre = movieData.genre;
                  movieInfo.duration = movieData.duration;
                  movieInfo.director = movieData.director;
                  movieInfo.description = movieData.description;
                  movieInfo.languages = movieData.languages;
                }
              });
            }
          } catch (err) {
            console.error('Error loading movie details:', err);
          }
        }

        // Convert to array and sort showtimes by time
        const moviesWithShowtimes = Array.from(movieMap.values())
          .filter(movie => movie.showtimes.length > 0)
          .map(movie => ({
            ...movie,
            showtimes: movie.showtimes.sort((a, b) => a.time.localeCompare(b.time))
          }));

        setShowtimes(moviesWithShowtimes);
      } catch (err) {
        console.error('Error loading showtimes:', err);
        setShowtimes([]);
      } finally {
        setLoadingShowtimes(false);
      }
    };

    loadShowtimes();
  }, [cinema, selectedDate]);

  const formatAgeRating = (ageRating) => {
    if (!ageRating) return 'P';
    const ratingStr = typeof ageRating === 'string' ? ageRating : ageRating.toString();
    return enumService.mapAgeRatingToDisplay(ratingStr) || 'P';
  };

  const formatLanguage = (language) => {
    if (!language) return 'Phụ đề';
    const langStr = typeof language === 'string' ? language : language.toString();
    return langStr.replace('LANGUAGE_', '').replace('Phụ đề', 'Phụ đề');
  };

  const formatGenres = (genres) => {
    if (!genres) return 'N/A';
    
    let genreArray = [];
    if (Array.isArray(genres)) {
      genreArray = genres.map(g => {
        const genreStr = typeof g === 'string' ? g : (g.value || g.name || g).toString();
        return genreStr.toUpperCase();
      });
    } else if (typeof genres === 'string') {
      if (genres.includes(',')) {
        genreArray = genres.split(',').map(g => g.trim().toUpperCase());
      } else {
        genreArray = [genres.toUpperCase()];
      }
    } else {
      const genreValue = (genres.value || genres.name || genres).toString().toUpperCase();
      genreArray = [genreValue];
    }
    
    return genreArray.map(g => enumService.mapGenreToVietnamese(g)).join(', ');
  };

  const getRatingDescription = (ageRating) => {
    const rating = formatAgeRating(ageRating);
    if (rating === 'P') {
      return 'P: Phim dành cho mọi lứa tuổi';
    } else if (rating === 'K') {
      return 'K: Phim dành cho khán giả dưới 13 tuổi, cần có ba mẹ đi cùng';
    } else if (rating === '13+') {
      return '13+: Phim dành cho khán giả từ đủ 13 tuổi trở lên';
    } else if (rating === '16+') {
      return '16+: Phim dành cho khán giả từ đủ 16 tuổi trở lên';
    } else if (rating === '18+') {
      return '18+: Phim dành cho khán giả từ đủ 18 tuổi trở lên';
    } else {
      return `${rating}: Phim dành cho khán giả từ đủ ${rating.replace(/[^0-9]/g, '')} tuổi trở lên`;
    }
  };

  const [showBlockedModal, setShowBlockedModal] = useState(false);
  
  const handleShowtimeClick = (showtime, movie) => {
    // Check if user is blocked
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.status === false) {
      setShowBlockedModal(true);
      return;
    }
    
    // Kiểm tra age rating - nếu là P thì không cần xác nhận
    const rating = formatAgeRating(movie.ageRating);
    
    if (rating === 'P') {
      // Phim P - điều hướng trực tiếp
      navigate(`/book-ticket?showtimeId=${showtime.showtimeId}`);
    } else {
      // Phim có độ tuổi giới hạn - hiển thị modal xác nhận
      setPendingShowtime(showtime);
      setPendingMovie(movie);
      setShowAgeConfirmModal(true);
    }
  };

  const handleConfirmAgeAndContinue = () => {
    if (!pendingShowtime) {
      return;
    }
    
    navigate(`/book-ticket?showtimeId=${pendingShowtime.showtimeId}`);
    setShowAgeConfirmModal(false);
    setPendingShowtime(null);
    setPendingMovie(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen cinema-mood">
        <Header />
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#c9c4c5' }}>
          Đang tải thông tin rạp...
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !cinema) {
    return (
      <div className="min-h-screen cinema-mood">
        <Header />
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#e83b41' }}>
          {error || 'Không tìm thấy rạp'}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      {/* Cinema Header */}
      <div className="cinema-header">
        <div className="container">
          <h1 className="cinema-header__title">
            CINESMART {cinema.name?.toUpperCase() || ''} ({cinema.addressProvince || ''})
          </h1>
          <p className="cinema-header__address">
            {cinema.fullAddress || 
            (cinema.addressDescription && cinema.addressProvince 
              ? `${cinema.addressDescription}, ${cinema.addressProvince}`
              : cinema.addressDescription || cinema.addressProvince || '')}
          </p>
          <button
            onClick={() =>
              openGoogleMap(
                cinema.fullAddress || 
                (cinema.addressDescription && cinema.addressProvince 
                  ? `${cinema.addressDescription}, ${cinema.addressProvince}`
                  : cinema.addressDescription || cinema.addressProvince || '')
              )
            }
            className="mt-2 inline-flex items-center gap-2 text-sm text-[#ffd159] hover:text-white transition-colors duration-200"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Xem đường đi
          </button>
        </div>
      </div>

      <main className="main">
        <section className="section">
          <div className="container">
            {/* Date Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '32px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'thin'
            }}>
              {dateTabs.map((tab) => (
                <button
                  key={tab.date}
                  onClick={() => setSelectedDate(tab.date)}
                  className={`schedule-date-btn ${selectedDate === tab.date ? 'schedule-date-btn--active' : ''}`}
                  style={{ flexShrink: 0 }}
                >
                  <div className="schedule-date-btn__date">{tab.dayNumber}/{tab.month}</div>
                  <div className="schedule-date-btn__day">{tab.label}</div>
                </button>
              ))}
            </div>

            {/* Showtimes List */}
            {loadingShowtimes ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#c9c4c5' }}>
                Đang tải lịch chiếu...
              </div>
            ) : showtimes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#c9c4c5' }}>
                Không có suất chiếu nào cho ngày này
                  </div>
                ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {showtimes.map((movie) => (
                  <div
                    key={movie.movieId}
                    style={{
                      background: 'rgba(30, 24, 25, 0.7)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      padding: '24px',
                      display: 'flex',
                      gap: '24px',
                      transition: 'all 300ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(40, 32, 33, 0.85)';
                      e.currentTarget.style.borderColor = 'rgba(232, 59, 65, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(30, 24, 25, 0.7)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    {/* Movie Poster */}
                    <div 
                      style={{ flexShrink: 0, cursor: 'pointer' }}
                      onClick={() => navigate(`/movie/${movie.movieId}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.transition = 'transform 0.2s ease';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <img
                        src={movie.moviePoster || 'https://via.placeholder.com/200x300?text=No+Poster'}
                        alt={movie.movieTitle}
                        style={{
                          width: '180px',
                          height: '260px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                          onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/200x300?text=No+Poster';
                          }}
                        />
                      </div>

                    {/* Movie Info and Showtimes */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <h3 
                            onClick={() => navigate(`/movie/${movie.movieId}`)}
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              color: '#fff',
                              margin: 0,
                              letterSpacing: '0.02em',
                              cursor: 'pointer',
                              transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.color = '#ffd159';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = '#fff';
                            }}
                          >
                            {movie.movieTitle} {movie.ageRating && `(${formatAgeRating(movie.ageRating)})`}
                          </h3>
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          flexWrap: 'wrap',
                          color: '#c9c4c5',
                          fontSize: '13px',
                          marginBottom: '12px'
                        }}>
                          {movie.genre && <span>{formatGenres(movie.genre)}</span>}
                          {movie.duration && <span>{movie.duration} phút</span>}
                          {movie.director && <span>{movie.director}</span>}
                        </div>
                        {movie.ageRating && (
                          <div style={{
                            padding: '8px 12px',
                            background: 'rgba(255, 209, 89, 0.15)',
                            border: '1px solid rgba(255, 209, 89, 0.3)',
                            borderRadius: '6px',
                            color: '#ffd159',
                            fontSize: '12px',
                            marginBottom: '12px'
                          }}>
                            {getRatingDescription(movie.ageRating)}
                        </div>
                        )}
                        {movie.description && (
                          <div style={{
                            marginTop: '12px',
                            color: '#c9c4c5',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            marginBottom: '16px'
                          }}>
                            {movie.description}
                          </div>
                        )}
                      </div>

                      {/* Showtimes */}
                      <div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px',
                          marginTop: '8px'
                        }}>
                          {movie.showtimes.map((showtime) => (
                          <button 
                              key={showtime.showtimeId}
                              onClick={() => handleShowtimeClick(showtime, movie)}
                              className="showtime-btn"
                            style={{ 
                                padding: '10px 18px',
                                background: 'rgba(45, 38, 39, 0.8)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '8px',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '14px',
                              cursor: 'pointer',
                                transition: 'all 250ms ease',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'linear-gradient(135deg, #e83b41 0%, #a10f14 100%)';
                                e.target.style.borderColor = '#e83b41';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(232, 59, 65, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(45, 38, 39, 0.8)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.15)';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '15px' }}>{showtime.time}</span>
                                <span style={{ fontSize: '11px', opacity: 0.9 }}>
                                  {showtime.format || '2D'} • {formatLanguage(showtime.language)}
                                </span>
                              </div>
                          </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Age Confirmation Modal */}
      <AgeConfirmationModal
        isOpen={showAgeConfirmModal}
        onClose={() => {
          setShowAgeConfirmModal(false);
          setPendingShowtime(null);
          setPendingMovie(null);
        }}
        onConfirm={handleConfirmAgeAndContinue}
        movieTitle={pendingMovie?.movieTitle}
        ageRating={pendingMovie?.ageRating}
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

      <Footer />
    </div>
  );
}




