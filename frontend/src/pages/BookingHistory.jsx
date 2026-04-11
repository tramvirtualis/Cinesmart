import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import ConfirmDeleteModal from '../components/Common/ConfirmDeleteModal.jsx';
import { QRCodeSVG } from 'qrcode.react';
import { getMyOrders } from '../services/customer';
import { reviewService } from '../services/reviewService';

export default function BookingHistory() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' hoặc 'completed'
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedMovieForReview, setSelectedMovieForReview] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageType, setSuccessMessageType] = useState('create'); // 'create' or 'delete'
  const [userReviews, setUserReviews] = useState([]); // Map movieId -> reviewId
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null); // { reviewId, movieTitle }

  // Load user reviews
  const loadUserReviews = async () => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!storedUser.userId) return;

    setLoadingReviews(true);
    try {
      const reviews = await reviewService.getReviewsByUser(storedUser.userId);
      // Create a map: movieId -> reviewId
      const reviewsMap = {};
      reviews.forEach(review => {
        reviewsMap[review.movieId] = review.reviewId;
      });
      setUserReviews(reviewsMap);
    } catch (err) {
      console.error('Error loading user reviews:', err);
      setUserReviews({});
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadUserReviews();
  }, []);

  // Load bookings from API
  useEffect(() => {
    const loadBookings = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        navigate('/login');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const ordersData = await getMyOrders();
        
        // Map orders to bookings format
        const mappedBookings = [];
        const now = new Date();
        
        ordersData.forEach(order => {
          // Skip cancelled orders
          if (order.status === 'CANCELLED' || order.status === 'Cancelled' || order.status === 'cancelled') {
            return;
          }
          // Group tickets by showtime
          const itemsByShowtime = {};
          order.items.forEach(item => {
            const showtimeStart = new Date(item.showtimeStart);
            const key = `${item.movieId}-${item.showtimeStart}`;
            
            if (!itemsByShowtime[key]) {
              itemsByShowtime[key] = {
                id: `${order.orderId}-${key}`,
                orderId: order.orderId,
                showtimeId: item.showtimeId, // Lưu showtimeId để tạo bookingId
                movie: {
                  movieId: item.movieId,
                  title: item.movieTitle,
                  poster: item.moviePoster || 'https://via.placeholder.com/300x450?text=No+Poster'
                },
                cinema: item.cinemaComplexName + (item.cinemaAddress ? ` (${item.cinemaAddress})` : ''),
                date: showtimeStart.toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }),
                time: showtimeStart.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }),
                format: (item.roomType || 'STANDARD').replace('TYPE_', ''), // Map roomType giống backend
                seats: [],
                price: 0,
                showtimeStart: showtimeStart,
                bookingDate: new Date(order.orderDate).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
              };
            }
            itemsByShowtime[key].seats.push(item.seatId);
            itemsByShowtime[key].price += Number(item.price);
          });

          // Convert to bookings array and determine status
          Object.values(itemsByShowtime).forEach(booking => {
            // Determine status based on showtime
            if (booking.showtimeStart > now) {
              booking.status = 'upcoming';
            } else {
              booking.status = 'completed';
            }
            mappedBookings.push(booking);
          });
        });

        // Sort by showtime (upcoming first, then by date)
        mappedBookings.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'upcoming' ? -1 : 1;
          }
          return b.showtimeStart - a.showtimeStart;
        });

        setBookings(mappedBookings);
      } catch (err) {
        console.error('Error loading bookings:', err);
        setError(err.message || 'Không thể tải danh sách vé');
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [navigate]);

  // Filter bookings theo tab
  const filteredBookings = bookings.filter((booking) => {
    if (booking.status === 'cancelled') return false;
    if (activeTab === 'upcoming') {
      return booking.status === 'upcoming';
    } else {
      return booking.status === 'completed';
    }
  });

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Đã xem';
      case 'upcoming':
        return 'Sắp chiếu';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'booking-status--completed';
      case 'upcoming':
        return 'booking-status--upcoming';
      case 'cancelled':
        return 'booking-status--cancelled';
      default:
        return '';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  // Map room type format (giống backend: roomType.name().replace("TYPE_", ""))
  const mapRoomType = (roomType) => {
    if (!roomType) return '2D';
    // Chuyển đổi từ TYPE_2D, TYPE_3D, etc. thành 2D, 3D (giống backend)
    return roomType.replace('TYPE_', '');
  };

  // Format date cho QR code (giống backend: dd/MM/yyyy)
  const formatDateForQR = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format time cho QR code (giống backend: HH:mm)
  const formatTimeForQR = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Tạo booking ID giống backend format: orderId-showtimeId-yyyy-MM-dd'T'HH:mm:ss
  const createBookingId = (orderId, showtimeId, showtimeStart) => {
    if (!showtimeStart || !showtimeId) {
      return `${orderId}-${showtimeId || 'unknown'}-${Date.now()}`;
    }
    const date = new Date(showtimeStart);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    return `${orderId}-${showtimeId}-${formattedDate}`;
  };

  // Tạo QR data với format giống backend (thứ tự: bookingId, orderId, movie, cinema, date, time, seats, format)
  const createQRData = (booking) => {
    // Tạo bookingId nếu chưa có hoặc không đúng format
    let bookingId = booking.id;
    if (booking.orderId && booking.showtimeId && booking.showtimeStart) {
      bookingId = createBookingId(booking.orderId, booking.showtimeId, booking.showtimeStart);
    }
    
    // Đảm bảo seats được sort (giống backend) và là array
    const sortedSeats = [...(booking.seats || [])].sort();
    
    // Tạo object với thứ tự CHÍNH XÁC giống backend
    // Thứ tự: bookingId, orderId, movie, cinema, date, time, seats, format
    const qrData = {};
    qrData.bookingId = String(bookingId || '');
    qrData.orderId = String(booking.orderId || '');
    qrData.movie = String(booking.movie?.title || '');
    qrData.cinema = String(booking.cinema || '');
    qrData.date = formatDateForQR(booking.showtimeStart);
    qrData.time = formatTimeForQR(booking.showtimeStart);
    qrData.seats = sortedSeats; // Array
    qrData.format = mapRoomType(booking.format);
    
    // Log để debug
    const jsonString = JSON.stringify(qrData);
    console.log('=== Frontend QR Code Data ===');
    console.log('JSON:', jsonString);
    console.log('============================');
    
    return qrData;
  };

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="flex items-center gap-3 mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ffd159]">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                <path d="M8 7h8M8 11h8M8 15h4"/>
              </svg>
              <h1 className="section__title text-[clamp(28px,4vw,36px)] m-0 font-extrabold tracking-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
                Vé của tôi
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-3 mb-6">
              <button
                className={`booking-filter-tab ${activeTab === 'upcoming' ? 'booking-filter-tab--active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Vé sắp chiếu
              </button>
              <button
                className={`booking-filter-tab ${activeTab === 'completed' ? 'booking-filter-tab--active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Vé đã xem
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd159] mb-5"></div>
                <p className="text-base m-0">Đang tải danh sách vé...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-[60px] px-5 text-[#e83b41]">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-5 opacity-50">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-base m-0">{error}</p>
              </div>
            )}

            {/* Bookings List */}
            {!loading && !error && filteredBookings.length === 0 && (
              <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-5 opacity-50">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <p className="text-base m-0">Chưa có vé nào trong mục này</p>
              </div>
            )}

            {!loading && !error && filteredBookings.length > 0 && (
              <div className="grid gap-5">
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-card__poster">
                      <img src={booking.movie.poster} alt={booking.movie.title} />
                    </div>
                    <div className="booking-card__content">
                      <div className="booking-card__header">
                        <div>
                          <h3 className="booking-card__title">
                            <a 
                              href={`/movie/${booking.movie.movieId}`}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/movie/${booking.movie.movieId}`);
                              }}
                              style={{ color: '#ffd159', textDecoration: 'none' }}
                            >
                              {booking.movie.title}
                            </a>
                          </h3>
                          <div className="booking-card__meta">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}>
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            {booking.cinema}
                          </div>
                        </div>
                        <span className={`booking-status ${getStatusClass(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </div>

                      <div className="booking-card__details">
                        <div className="booking-detail-item">
                          <span className="booking-detail-item__label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Ngày chiếu
                          </span>
                          <span className="booking-detail-item__value">{booking.date}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="booking-detail-item__label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Giờ chiếu
                          </span>
                          <span className="booking-detail-item__value">{booking.time}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="booking-detail-item__label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="4" width="20" height="16" rx="2"/>
                              <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/>
                            </svg>
                            Định dạng
                          </span>
                          <span className="booking-detail-item__value">{booking.format}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="booking-detail-item__label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Ghế
                          </span>
                          <span className="booking-detail-item__value">{booking.seats.join(', ')}</span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="booking-detail-item__label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="1" x2="12" y2="23"/>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            Tổng tiền
                          </span>
                          <span className="booking-detail-item__value booking-detail-item__value--price">
                            {formatPrice(booking.price)}
                          </span>
                        </div>
                        <div className="booking-detail-item">
                          <span className="booking-detail-item__label">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Ngày đặt
                          </span>
                          <span className="booking-detail-item__value">{booking.bookingDate}</span>
                        </div>
                      </div>


                      {booking.status === 'completed' && (() => {
                        const reviewId = userReviews[booking.movie.movieId];
                        const hasReview = !!reviewId;
                        
                        return (
                          <div className="booking-card__actions mt-4 flex gap-2.5">
                            {hasReview ? (
                              <button 
                                className="btn btn--primary" 
                                style={{ 
                                  fontSize: '14px', 
                                  padding: '10px 20px',
                                  backgroundColor: '#e83b41',
                                  opacity: deletingReviewId === reviewId ? 0.7 : 1
                                }}
                                onClick={() => {
                                  setReviewToDelete({
                                    reviewId: reviewId,
                                    movieTitle: booking.movie.title
                                  });
                                  setShowDeleteConfirm(true);
                                }}
                                disabled={deletingReviewId === reviewId}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                {deletingReviewId === reviewId ? 'Đang xóa...' : 'Xóa đánh giá'}
                              </button>
                            ) : (
                              <button 
                                className="btn btn--primary" 
                                style={{ fontSize: '14px', padding: '10px 20px' }}
                                onClick={() => {
                                  setSelectedMovieForReview({
                                    title: booking.movie.title,
                                    poster: booking.movie.poster,
                                    movieId: booking.movie.movieId
                                  });
                                  setShowReviewForm(true);
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                Viết đánh giá
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Ticket Modal */}
      {showTicketModal && selectedBooking && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTicketModal(false);
              setSelectedBooking(null);
            }
          }}
        >
          <div 
            className="ticket-modal"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ticket Header */}
            <div style={{
              background: 'linear-gradient(135deg, #e83b41 0%, #c92e33 100%)',
              padding: '24px',
              borderRadius: '16px 16px 0 0',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
                VÉ XEM PHIM
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Cinesmart Cinema
              </div>
            </div>

            {/* Ticket Content */}
            <div style={{ padding: '24px' }}>
              {/* Movie Info */}
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: 800, 
                  color: '#1a1415',
                  margin: '0 0 8px'
                }}>
                  {selectedBooking.movie.title}
                </h2>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '16px', fontWeight: 500 }}>
                  {selectedBooking.cinema}
                </div>
              </div>

              {/* Ticket Details Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '24px',
                padding: '20px',
                backgroundColor: '#fafafa',
                borderRadius: '12px',
                border: '1px solid #e0e0e0'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 600 }}>Ngày chiếu</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>{selectedBooking.date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 600 }}>Giờ chiếu</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>{selectedBooking.time}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 600 }}>Định dạng</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>{selectedBooking.format}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 600 }}>Ghế</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>{selectedBooking.seats.join(', ')}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 600 }}>Tổng tiền</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#e83b41' }}>
                    {formatPrice(selectedBooking.price)}
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div style={{
                textAlign: 'center',
                padding: '20px',
                backgroundColor: '#fff',
                border: '2px dashed #ddd',
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '14px', color: '#333', marginBottom: '12px', fontWeight: 600 }}>
                  Mã QR Code - Vui lòng quét tại rạp
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '16px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #eee'
                }}>
                  <QRCodeSVG
                    value={JSON.stringify(createQRData(selectedBooking))}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#555', marginTop: '12px', fontWeight: 500 }}>
                  Booking ID: {selectedBooking.id}
                </div>
              </div>

              {/* Booking Info */}
              <div style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#333',
                textAlign: 'center',
                fontWeight: 500
              }}>
                <div style={{ marginBottom: '4px' }}>
                  Ngày đặt: {selectedBooking.bookingDate}
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
                  Vui lòng đến rạp trước giờ chiếu 15 phút
                </div>
              </div>
            </div>

            {/* Ticket Footer */}
            <div 
              className="ticket-modal__footer"
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <button
                className="btn btn--primary"
                onClick={() => {
                  // Print ticket
                  window.print();
                }}
                style={{
                  fontSize: '14px',
                  padding: '10px 24px',
                  fontWeight: 600
                }}
              >
                In vé
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedBooking(null);
                }}
                style={{
                  fontSize: '14px',
                  padding: '10px 24px',
                  fontWeight: 600
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && selectedMovieForReview && (
        <ReviewForm
          movie={selectedMovieForReview}
          onClose={() => {
            setShowReviewForm(false);
            setSelectedMovieForReview(null);
          }}
          onSuccess={async (reviewData) => {
            // Reload user reviews to update UI
            await loadUserReviews();
            setSuccessMessageType('create');
            setShowSuccessMessage(true);
            setTimeout(() => {
              setShowSuccessMessage(false);
            }, 3000);
          }}
        />
      )}

      {/* Confirm Delete Review Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setReviewToDelete(null);
        }}
        onConfirm={async () => {
          if (!reviewToDelete) return;
          
          setDeletingReviewId(reviewToDelete.reviewId);
          try {
            await reviewService.deleteReview(reviewToDelete.reviewId);
            // Reload user reviews to update UI
            await loadUserReviews();
            setSuccessMessageType('delete');
            setShowSuccessMessage(true);
            setTimeout(() => {
              setShowSuccessMessage(false);
            }, 3000);
            setShowDeleteConfirm(false);
            setReviewToDelete(null);
          } catch (err) {
            alert(err.message || 'Có lỗi xảy ra khi xóa đánh giá');
          } finally {
            setDeletingReviewId(null);
          }
        }}
        title={reviewToDelete?.movieTitle || 'đánh giá này'}
        message="Bạn có chắc chắn muốn xóa đánh giá này?"
        confirmText="Xóa đánh giá"
        isDeleting={deletingReviewId === reviewToDelete?.reviewId}
      />

      {/* Success Notification */}
      {showSuccessMessage && (
        <div 
          className="review-success-notification"
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
              {successMessageType === 'delete' ? 'Xóa đánh giá thành công!' : 'Đánh giá thành công!'}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {successMessageType === 'delete' ? 'Đánh giá đã được xóa khỏi hệ thống.' : 'Cảm ơn bạn đã chia sẻ đánh giá về bộ phim.'}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

