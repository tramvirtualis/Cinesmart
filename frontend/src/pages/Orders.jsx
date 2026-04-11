import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import TicketModal from '../components/TicketModal.jsx';
import CancelOrderModal from '../components/CancelOrderModal.jsx';
import { getMyOrders, cancelOrder } from '../services/customer';
import { useNavigate } from 'react-router-dom';
import { cinemaComplexService } from '../services/cinemaComplexService';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cinemasList, setCinemasList] = useState([]);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'PAID', 'CANCELLED'
  const ordersPerPage = 5;

  // Load cinemas list
  useEffect(() => {
    const loadCinemas = async () => {
      try {
        const result = await cinemaComplexService.getAllCinemaComplexes();
        if (result.success && result.data) {
          setCinemasList(result.data);
        }
      } catch (error) {
        console.error('Error loading cinemas:', error);
      }
    };
    loadCinemas();
  }, []);

  const loadOrders = useCallback(async () => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ordersData = await getMyOrders();

      const mappedOrders = (ordersData || []).map(order => {
        const itemsByShowtime = {};
        (order.items || []).forEach(item => {
          const key = `${item.movieId}-${item.showtimeStart}`;
          if (!itemsByShowtime[key]) {
            itemsByShowtime[key] = {
              id: item.ticketId.toString(),
              movie: {
                movieId: item.movieId,
                id: item.movieId,
                title: item.movieTitle,
                poster: item.moviePoster || 'https://via.placeholder.com/300x450?text=No+Poster'
              },
              cinema: item.cinemaComplexName + (item.cinemaAddress ? ` (${item.cinemaAddress})` : ''),
              showtime: {
                showtimeId: item.showtimeId,
                date: new Date(item.showtimeStart).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                }),
                time: new Date(item.showtimeStart).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }),
                format: item.roomType || 'STANDARD',
                start: item.showtimeStart,
                startTime: item.showtimeStart
              },
              seats: [],
              price: 0,
              basePrice: 0
            };
          }
          itemsByShowtime[key].seats.push(item.seatId);
          itemsByShowtime[key].price += Number(item.price);
          itemsByShowtime[key].basePrice += Number(item.basePrice || item.price);
        });

        const foodItems = order.combos ? order.combos.map(combo => ({
          id: `f${combo.comboId}`,
          name: combo.comboName,
          quantity: combo.quantity,
          totalPrice: Number(combo.price),
          unitPrice: Number(combo.price) / (combo.quantity || 1),
          image: combo.comboImage || 'https://via.placeholder.com/300x300?text=Food'
        })) : [];

        const originalTotal = Object.values(itemsByShowtime).reduce((sum, item) => sum + item.price, 0) +
                              foodItems.reduce((sum, item) => sum + item.totalPrice, 0);

        const cinemaComplexId = order.cinemaComplexId || null;
        const cinema = cinemasList.find(c => c.complexId === cinemaComplexId);
        const cinemaName = cinema ? cinema.name : null;

        const displayId = `ORD-${order.orderId}`;
        const monthlyLimit = order.monthlyCancellationLimit ?? 2;
        const monthlyUsed = order.monthlyCancellationUsed ?? 0;
        const monthlyRemaining = order.monthlyCancellationRemaining ?? Math.max(0, monthlyLimit - monthlyUsed);

        return {
          rawOrderId: order.orderId,
          orderId: displayId,
          orderDate: order.orderDate,
          totalAmount: Number(order.totalAmount),
          originalTotal,
          voucherCode: order.voucherCode || null,
          status: order.status || 'PAID',
          cancellable: Boolean(order.cancellable),
          cancelledAt: order.cancelledAt,
          cancellationReason: order.cancellationReason,
          refundAmount: order.refundAmount ? Number(order.refundAmount) : null,
          refundedToWallet: order.refundedToWallet,
          monthlyCancellationLimit: monthlyLimit,
          monthlyCancellationUsed: monthlyUsed,
          monthlyCancellationRemaining: monthlyRemaining,
          items: Object.values(itemsByShowtime),
          foodItems: foodItems.length > 0 ? foodItems : undefined,
          paymentMethod: order.paymentMethod || 'Chưa xác định',
          cinemaComplexId,
          cinemaName,
          bookingDate: new Date(order.orderDate).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      });

      setOrders(mappedOrders);
    } catch (err) {
      console.error('Error loading orders:', err);
      setOrders([]);
      setError(err.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [navigate, cinemasList]);

  // Load orders from API
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Filter orders by status
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case 'CANCELLED':
        return { label: 'Đã hủy', style: { backgroundColor: 'rgba(244,67,54,0.12)', color: '#f87171', borderColor: '#f87171' } };
      case 'PENDING':
        return { label: 'Chờ thanh toán', style: { backgroundColor: 'rgba(255,193,7,0.12)', color: '#ffc107', borderColor: '#ffc107' } };
      default:
        return { label: 'Đã thanh toán', style: { backgroundColor: 'rgba(76,175,80,0.12)', color: '#4caf50', borderColor: '#4caf50' } };
    }
  };

  const handleCancelOrder = (order) => {
    if (!order.cancellable || order.status === 'CANCELLED') {
      return;
    }
    setOrderToCancel(order);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (reason) => {
    if (!orderToCancel) return;
    
    setCancellingOrderId(orderToCancel.rawOrderId);
    setFeedbackMessage({ type: '', text: '' });
    setShowCancelModal(false);
    
    try {
      await cancelOrder(orderToCancel.rawOrderId, reason);
      setFeedbackMessage({ type: 'success', text: 'Đơn hàng đã được hủy thành công và hoàn tiền vào Ví Cinesmart.' });
      await loadOrders();
      
      // Dispatch custom event to notify other pages (e.g., Events page, NotificationBell) to reload
      window.dispatchEvent(new CustomEvent('orderCancelled', { detail: { orderId: orderToCancel.rawOrderId } }));
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.' });
    } finally {
      setCancellingOrderId(null);
      setOrderToCancel(null);
    }
  };

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div className="flex items-center gap-3 mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ffd159]">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                <path d="M9 12h6M9 16h6"/>
              </svg>
              <h1 className="section__title text-[clamp(28px,4vw,36px)] m-0 font-extrabold tracking-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
                Đơn hàng
              </h1>
            </div>

            {/* Loading */}
            {loading && (
              <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                <p className="text-base m-0">Đang tải danh sách đơn hàng...</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="text-center py-[60px] px-5 text-[#f44336]">
                <p className="text-base m-0">{error}</p>
              </div>
            )}

            {feedbackMessage.text && (
              <div
                className="mb-6"
                style={{
                  backgroundColor: feedbackMessage.type === 'success' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)',
                  border: feedbackMessage.type === 'success' ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(244,67,54,0.4)',
                  color: feedbackMessage.type === 'success' ? '#4caf50' : '#f44336',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 600
                }}
              >
                {feedbackMessage.text}
              </div>
            )}

            {/* Status Filter Tabs */}
            {!loading && !error && orders.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setStatusFilter('all')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: statusFilter === 'all' ? '#e83b41' : 'rgba(255,255,255,0.2)',
                    background: statusFilter === 'all' 
                      ? 'linear-gradient(135deg, #e83b41 0%, #a10f14 100%)' 
                      : 'rgba(30, 24, 25, 0.7)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Tất cả ({orders.length})
                </button>
                <button
                  onClick={() => setStatusFilter('PAID')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: statusFilter === 'PAID' ? '#4caf50' : 'rgba(255,255,255,0.2)',
                    background: statusFilter === 'PAID' 
                      ? 'rgba(76,175,80,0.2)' 
                      : 'rgba(30, 24, 25, 0.7)',
                    color: statusFilter === 'PAID' ? '#4caf50' : '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Đã thanh toán ({orders.filter(o => o.status === 'PAID').length})
                </button>
                <button
                  onClick={() => setStatusFilter('CANCELLED')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: statusFilter === 'CANCELLED' ? '#f87171' : 'rgba(255,255,255,0.2)',
                    background: statusFilter === 'CANCELLED' 
                      ? 'rgba(244,67,54,0.2)' 
                      : 'rgba(30, 24, 25, 0.7)',
                    color: statusFilter === 'CANCELLED' ? '#f87171' : '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Đã hủy ({orders.filter(o => o.status === 'CANCELLED').length})
                </button>
              </div>
            )}

            {/* Orders List */}
            {!loading && !error && filteredOrders.length === 0 && (
              <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-5 opacity-50">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <p className="text-base m-0">
                  {statusFilter === 'all' 
                    ? 'Chưa có đơn hàng nào trong mục này'
                    : statusFilter === 'PAID'
                    ? 'Chưa có đơn hàng nào đã thanh toán'
                    : 'Chưa có đơn hàng nào đã hủy'}
                </p>
              </div>
            )}

            {!loading && !error && currentOrders.length > 0 && (
              <>
                <div className="orders-list">
                  {currentOrders.map((order) => {
                    const statusMeta = getStatusMeta(order.status);
                    return (
                  <div key={order.orderId} className="order-card">
                    <div className="order-card__header">
                      <div className="order-card__header-left">
                        <div className="order-card__id">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                          </svg>
                          {order.orderId}
                        </div>
                        <div className="order-card__date">
                          {formatDate(order.orderDate)}
                        </div>
                      </div>
                      <div className="order-card__header-right">
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            marginBottom: '6px',
                            border: statusMeta.style?.borderColor ? `1px solid ${statusMeta.style.borderColor}` : '1px solid transparent',
                            backgroundColor: statusMeta.style?.backgroundColor,
                            color: statusMeta.style?.color
                          }}
                        >
                          {statusMeta.label}
                        </span>
                        <div className="order-card__total" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                          {order.voucherCode && order.originalTotal && order.originalTotal > order.totalAmount ? (
                            <>
                              <span style={{ 
                                textDecoration: 'line-through', 
                                fontSize: '12px', 
                                color: '#c9c4c5',
                                fontWeight: 500
                              }}>
                                {formatPrice(order.originalTotal)}
                              </span>
                              <span style={{ 
                                color: '#ffd159', 
                                fontSize: '18px',
                                fontWeight: 700
                              }}>
                                {formatPrice(order.totalAmount)}
                              </span>
                            </>
                          ) : (
                            <span style={{ 
                              color: '#ffd159', 
                              fontSize: '18px',
                              fontWeight: 700
                            }}>
                              {formatPrice(order.totalAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {order.status === 'CANCELLED' && (
                      <div
                        style={{
                          backgroundColor: 'rgba(244,67,54,0.08)',
                          border: '1px dashed rgba(244,67,54,0.4)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          marginBottom: '12px',
                          color: '#f87171',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          Đã hủy lúc {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '--'}
                        </div>
                        {order.refundAmount && (
                          <div>Hoàn về Ví Cinesmart: {formatPrice(order.refundAmount)}</div>
                        )}
                        {order.cancellationReason && (
                          <div>Lý do: {order.cancellationReason}</div>
                        )}
                      </div>
                    )}

                    <div className="order-card__items">
                      {/* Movie Items */}
                      {order.items && order.items.map((item) => (
                        <div key={item.id} className="order-item">
                          <div className="order-item__poster">
                            <img src={item.movie.poster} alt={item.movie.title} />
                          </div>
                          <div className="order-item__content">
                            <h3 className="order-item__title">
                              <a 
                                href={`/movie/${item.movie.movieId || item.movie.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/movie/${item.movie.movieId || item.movie.id}`);
                                }}
                                style={{ color: '#ffd159', textDecoration: 'none' }}
                              >
                                {item.movie.title}
                              </a>
                            </h3>
                            <div className="order-item__details">
                              <div className="order-item__detail-row">
                                <span className="order-item__detail-label">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                  </svg>
                                  Rạp
                                </span>
                                <span className="order-item__detail-value">{item.cinema}</span>
                              </div>
                              <div className="order-item__detail-row">
                                <span className="order-item__detail-label">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                  Suất chiếu
                                </span>
                                <span className="order-item__detail-value">
                                  {item.showtime.date} • {item.showtime.time} • {item.showtime.format}
                                </span>
                              </div>
                              <div className="order-item__detail-row">
                                <span className="order-item__detail-label">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                  Ghế
                                </span>
                                <span className="order-item__detail-value">{item.seats.join(', ')}</span>
                              </div>
                              <div className="order-item__detail-row">
                                <span className="order-item__detail-label">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="1" x2="12" y2="23"/>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                  </svg>
                                  Giá
                                </span>
                                <span className="order-item__detail-value order-item__detail-value--price">
                                  {(() => {
                                    const showtimeDate = new Date(item.showtime.start);
                                    const dayOfWeek = showtimeDate.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    
                                    return (
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                                        {isWeekend && (
                                          <span style={{ textDecoration: 'line-through', fontSize: '11px', color: '#c9c4c5' }}>
                                            {formatPrice(item.basePrice)}
                                          </span>
                                        )}
                                        <span>{formatPrice(item.price)}</span>
                                        {isWeekend && (
                                          <span style={{ fontSize: '10px', color: '#4caf50', fontWeight: 600 }}>
                                            +30%
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Food Items */}
                      {order.foodItems && order.foodItems.map((foodItem) => (
                        <div key={foodItem.id} className="order-item order-item--food">
                          <div className="order-item__poster">
                            <img src={foodItem.image} alt={foodItem.name} />
                          </div>
                          <div className="order-item__content">
                            <h3 className="order-item__title">
                              {foodItem.name}
                            </h3>
                            <div className="order-item__details">
                              <div className="order-item__detail-row">
                                <span className="order-item__detail-label">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                  </svg>
                                  Số lượng
                                </span>
                                <span className="order-item__detail-value">x{foodItem.quantity}</span>
                              </div>
                              <div className="order-item__detail-row">
                                <span className="order-item__detail-label">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="1" x2="12" y2="23"/>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                  </svg>
                                  Giá
                                </span>
                                <span className="order-item__detail-value order-item__detail-value--price">
                                  {formatPrice(foodItem.totalPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="order-card__footer">
                      <div className="order-card__footer-info">
                        <div className="order-card__footer-item">
                          <span className="order-card__footer-label">Thời gian đặt:</span>
                          <span className="order-card__footer-value">{order.bookingDate}</span>
                        </div>
                      </div>
                      <div className="order-card__footer-actions" style={{ marginTop: '8px' }}>
                        {order.cancellable && order.status !== 'CANCELLED' && (
                          <button
                            className="btn btn--ghost"
                            style={{ fontSize: '13px', padding: '8px 16px', marginRight: '10px' }}
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancellingOrderId === order.rawOrderId}
                          >
                            {cancellingOrderId === order.rawOrderId ? 'Đang hủy...' : 'Hủy đơn'}
                          </button>
                        )}
                        <button
                          className="btn btn--primary"
                          style={{ fontSize: '13px', padding: '8px 16px' }}
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowTicketModal(true);
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                  })}
                </div>

                {/* Pagination */}
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
                    <div className="movie-reviews-pagination mt-8 justify-center" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

      {/* Ticket Modal */}
      <TicketModal
        order={selectedOrder}
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          setSelectedOrder(null);
        }}
      />

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setOrderToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        orderId={orderToCancel?.orderId || ''}
        isCancelling={cancellingOrderId === orderToCancel?.rawOrderId}
      />

      <Footer />
    </div>
  );
}

