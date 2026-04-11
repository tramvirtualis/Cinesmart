import React, { useState, useEffect } from 'react';
import { getAllOrdersAdmin, cancelOrderAdmin } from '../../services/customer';
import { QRCodeSVG } from 'qrcode.react';

// Booking Management Component
function BookingManagement({ orders: initialOrders, cinemas: cinemasList, movies: moviesList, onOrdersChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCinema, setFilterCinema] = useState('');
  const [filterMovie, setFilterMovie] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [sortField, setSortField] = useState('showtime');
  const [sortDirection, setSortDirection] = useState('desc');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL'); // ALL, TICKET, FOOD_ONLY
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const itemsPerPage = 10;

  // Load orders from backend
  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const ordersData = await getAllOrdersAdmin();
        console.log('Loaded orders from backend:', ordersData);

        // Map backend format to frontend format
        // Backend returns OrderResponseDTO with items (tickets) array and combos (food) array
        // Frontend expects one booking per ticket group OR one booking for food-only orders
        const mappedOrders = [];
        ordersData.forEach(order => {
          // Kiểm tra kỹ: items phải là array và có phần tử
          const hasTickets = Array.isArray(order.items) && order.items.length > 0;
          const hasCombos = Array.isArray(order.combos) && order.combos.length > 0;

          // Đảm bảo: Nếu có tickets, luôn là TICKET, không bao giờ là FOOD_ONLY
          if (hasTickets) {
            // Group tickets by showtime to create booking records
            const ticketsByShowtime = {};
            order.items.forEach(item => {
              const key = `${item.showtimeStart}_${item.cinemaComplexId}_${item.roomId}`;
              if (!ticketsByShowtime[key]) {
                ticketsByShowtime[key] = [];
              }
              ticketsByShowtime[key].push(item);
            });

            // Create a booking record for each showtime group
            Object.values(ticketsByShowtime).forEach(ticketGroup => {
              const firstTicket = ticketGroup[0];
              const seats = ticketGroup.map(t => t.seatId);
              const totalTicketPrice = ticketGroup.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);

              // Calculate total including combos
              const comboTotal = order.combos ? order.combos.reduce((sum, c) => sum + (parseFloat(c.price) * (c.quantity || 1) || 0), 0) : 0;
              const totalAmount = totalTicketPrice + comboTotal;

              mappedOrders.push({
                bookingId: order.orderId,
                orderType: 'TICKET', // TICKET or FOOD_ONLY
                user: {
                  name: order.userName || 'N/A',
                  email: order.userEmail || '',
                  phone: order.userPhone || ''
                },
                movieId: firstTicket.movieId,
                movieTitle: firstTicket.movieTitle,
                cinemaComplexId: firstTicket.cinemaComplexId,
                cinemaName: firstTicket.cinemaComplexName,
                roomId: firstTicket.roomId,
                roomName: firstTicket.roomName,
                showtime: firstTicket.showtimeStart,
                showtimeId: firstTicket.showtimeId, // For QR code
                roomType: firstTicket.roomType, // For QR code (2D, 3D, etc.)
                seats: seats,
                pricePerSeat: ticketGroup.length > 0 ? parseFloat(ticketGroup[0].price) || 0 : 0,
                totalAmount: parseFloat(order.totalAmount) || totalAmount,
                status: order.status || 'PAID',
                paymentMethod: order.paymentMethod || 'UNKNOWN',
                combos: order.combos || [],
                orderDate: order.orderDate // For food-only QR code
              });
            });
          } else if (hasCombos) {
            // Food-only order (no tickets)
            const comboTotal = order.combos.reduce((sum, c) => sum + (parseFloat(c.price) * (c.quantity || 1) || 0), 0);

            // Lấy cinemaComplexId từ order (backend đã map)
            const cinemaComplexId = order.cinemaComplexId || null;
            // Tìm tên cụm rạp từ danh sách
            const cinema = cinemasList.find(c => c.complexId === cinemaComplexId);
            const cinemaName = cinema ? cinema.name : null;

            mappedOrders.push({
              bookingId: order.orderId,
              orderType: 'FOOD_ONLY',
              user: {
                name: order.userName || 'N/A',
                email: order.userEmail || '',
                phone: order.userPhone || ''
              },
              movieId: null,
              movieTitle: null,
              cinemaComplexId: cinemaComplexId,
              cinemaName: cinemaName,
              roomId: null,
              roomName: null,
              showtime: order.orderDate, // Use order date for food-only orders
              seats: [],
              pricePerSeat: 0,
              totalAmount: parseFloat(order.totalAmount) || comboTotal,
              status: order.status || 'PAID',
              paymentMethod: order.paymentMethod || 'UNKNOWN',
              combos: order.combos || [],
              orderDate: order.orderDate // For food-only QR code
            });
          }
        });

        // Validation: Đảm bảo không có đơn hàng FOOD_ONLY nhưng lại có thông tin vé
        // Nếu phát hiện, tự động sửa lại orderType thành TICKET
        // LƯU Ý: cinemaComplexId và cinemaName có thể có ở đơn đồ ăn (food-only orders), không phải là thông tin vé
        mappedOrders.forEach(order => {
          if (order.orderType === 'FOOD_ONLY') {
            // Kiểm tra xem có thông tin vé không (KHÔNG bao gồm cinemaComplexId/cinemaName vì đơn đồ ăn cũng có)
            if (order.movieId || order.movieTitle || (order.seats && order.seats.length > 0) ||
              order.showtimeId || order.roomId || order.roomName) {
              console.warn('Found FOOD_ONLY order with ticket info, fixing orderType to TICKET:', order.bookingId);
              order.orderType = 'TICKET';
            }
          }
        });

        console.log('Mapped orders:', mappedOrders);
        console.log('Total mapped orders:', mappedOrders.length);
        setOrders(mappedOrders);
        if (onOrdersChange) onOrdersChange(mappedOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err.message || 'Không thể tải danh sách đơn hàng');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [onOrdersChange, refreshTrigger]);

  const withinRange = (dt) => {
    if (!dt) return true; // Nếu không có date, không filter
    const t = new Date(dt).getTime();
    if (isNaN(t)) return true; // Nếu date không hợp lệ, không filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (t < from.getTime()) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (t > to.getTime()) return false;
    }
    return true;
  };

  const isExpired = (o) => {
    if (o.orderType === 'FOOD_ONLY') {
      // Food orders don't expire based on showtime, they're always valid
      return false;
    }
    return new Date(o.showtime).getTime() < Date.now();
  };
  const derivedStatus = (o) => {
    if (o.status === 'CANCELLED') return 'CANCELLED';
    if (o.orderType === 'FOOD_ONLY') {
      return 'ACTIVE'; // Food orders are always active
    }
    return (isExpired(o) ? 'EXPIRED' : 'ACTIVE'); // Còn hạn / Hết hạn
  };

  const filtered = orders.filter(o => {
    // Filter by order type
    if (orderTypeFilter === 'TICKET') {
      if (o.orderType !== 'TICKET') return false;
    } else if (orderTypeFilter === 'FOOD_ONLY') {
      // Đơn đồ ăn: Phải là FOOD_ONLY và không có bất kỳ thông tin vé nào
      // LƯU Ý: cinemaComplexId và cinemaName có thể có ở đơn đồ ăn, không phải là thông tin vé
      if (o.orderType !== 'FOOD_ONLY') return false;
      if (o.movieId ||
        o.movieTitle ||
        (o.seats && o.seats.length > 0) ||
        o.showtimeId ||
        o.roomId ||
        o.roomName) {
        return false;
      }
    }
    // Nếu orderTypeFilter === 'ALL', không filter theo orderType

    // Text search - chỉ áp dụng nếu có searchTerm
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matches =
        o.user.name.toLowerCase().includes(term) ||
        o.user.phone.toLowerCase().includes(term) ||
        (o.movieTitle && o.movieTitle.toLowerCase().includes(term)) ||
        (o.cinemaName && o.cinemaName.toLowerCase().includes(term)) ||
        (o.orderType === 'FOOD_ONLY' && 'đồ ăn'.includes(term));
      if (!matches) return false;
    }

    // Cinema filter - áp dụng cho cả đơn vé (TICKET) và đơn đồ ăn (FOOD_ONLY) nếu có cinemaComplexId
    if (filterCinema && filterCinema !== '') {
      // Filter theo cụm rạp cho cả đơn vé và đơn đồ ăn
      if (!o.cinemaComplexId || String(o.cinemaComplexId) !== String(filterCinema)) {
        return false;
      }
    }

    // Movie filter - chỉ áp dụng khi có filterMovie
    if (filterMovie && filterMovie !== '') {
      if (!o.movieId || String(o.movieId) !== String(filterMovie)) {
        return false;
      }
    }

    // Status filter - chỉ áp dụng khi có filterStatus
    if (filterStatus && filterStatus !== '') {
      if (derivedStatus(o) !== filterStatus) {
        return false;
      }
    }

    // Date range filter - chỉ áp dụng khi có dateFrom hoặc dateTo
    if (dateFrom || dateTo) {
      const dateToCheck = o.orderType === 'FOOD_ONLY' ? (o.orderDate || o.showtime) : o.showtime;
      if (!withinRange(dateToCheck)) {
        return false;
      }
    }

    return true;
  });

  // Debug: Log filtered results
  useEffect(() => {
    console.log('=== Filter Debug ===');
    console.log('Total orders:', orders.length);
    console.log('Filtered orders:', filtered.length);
    console.log('OrderTypeFilter:', orderTypeFilter);
    console.log('SearchTerm:', searchTerm);
    console.log('FilterCinema:', filterCinema);
    console.log('FilterMovie:', filterMovie);
    console.log('FilterStatus:', filterStatus);
    console.log('DateFrom:', dateFrom);
    console.log('DateTo:', dateTo);
    if (filtered.length !== orders.length) {
      console.log('Some orders were filtered out. Filtered orders:', filtered.map(o => ({ id: o.bookingId, type: o.orderType })));
    }
  }, [orders, filtered, orderTypeFilter, searchTerm, filterCinema, filterMovie, filterStatus, dateFrom, dateTo]);

  const statusColor = (s) => ({ ACTIVE: '#4caf50', EXPIRED: '#9e9e9e', CANCELLED: '#e83b41' }[s] || '#9e9e9e');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'bookingId':
        aVal = a.bookingId;
        bVal = b.bookingId;
        break;
      case 'customer':
        aVal = a.user.name.toLowerCase();
        bVal = b.user.name.toLowerCase();
        break;
      case 'movie':
        aVal = a.movieTitle.toLowerCase();
        bVal = b.movieTitle.toLowerCase();
        break;
      case 'showtime':
        aVal = new Date(a.showtime).getTime();
        bVal = new Date(b.showtime).getTime();
        break;
      case 'amount':
        aVal = a.totalAmount;
        bVal = b.totalAmount;
        break;
      case 'status':
        aVal = derivedStatus(a);
        bVal = derivedStatus(b);
        break;
      default:
        aVal = new Date(a.showtime).getTime();
        bVal = new Date(b.showtime).getTime();
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
  });

  // Pagination calculation
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = sorted.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCinema, filterMovie, filterStatus, dateFrom, dateTo, orderTypeFilter]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.3, marginLeft: 4 }}>
          <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
        <path d="M8 9l4-4 4 4" />
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4 }}>
        <path d="M16 15l-4 4-4-4" />
      </svg>
    );
  };

  // Count orders by type - Phải dùng filtered để nhất quán với danh sách hiển thị
  // Tạo một hàm helper để check xem order có pass các filter không (trừ orderTypeFilter)
  const passesOtherFilters = (o) => {
    // Text search - chỉ áp dụng khi có searchTerm
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matches =
        o.user.name.toLowerCase().includes(term) ||
        o.user.phone.toLowerCase().includes(term) ||
        (o.movieTitle && o.movieTitle.toLowerCase().includes(term)) ||
        (o.cinemaName && o.cinemaName.toLowerCase().includes(term)) ||
        (o.orderType === 'FOOD_ONLY' && 'đồ ăn'.includes(term));
      if (!matches) return false;
    }

    // Cinema filter - QUAN TRỌNG: áp dụng cho cả đơn vé (TICKET) và đơn đồ ăn (FOOD_ONLY) nếu có cinemaComplexId
    if (filterCinema && filterCinema !== '') {
      // Filter theo cụm rạp cho cả đơn vé và đơn đồ ăn
      if (!o.cinemaComplexId || String(o.cinemaComplexId) !== String(filterCinema)) {
        return false;
      }
    }

    // Movie filter - chỉ áp dụng khi có filterMovie
    if (filterMovie && filterMovie !== '') {
      if (!o.movieId || String(o.movieId) !== String(filterMovie)) {
        return false;
      }
    }

    // Status filter - chỉ áp dụng khi có filterStatus
    if (filterStatus && filterStatus !== '') {
      if (derivedStatus(o) !== filterStatus) {
        return false;
      }
    }

    // Date range filter - chỉ áp dụng khi có dateFrom hoặc dateTo
    if (dateFrom || dateTo) {
      const dateToCheck = o.orderType === 'FOOD_ONLY' ? (o.orderDate || o.showtime) : o.showtime;
      if (!withinRange(dateToCheck)) {
        return false;
      }
    }

    return true;
  };

  // Đếm đơn vé: orderType === 'TICKET' HOẶC có thông tin vé (dù orderType là gì)
  // LƯU Ý: cinemaComplexId và cinemaName KHÔNG phải là thông tin vé (đơn đồ ăn cũng có)
  const ticketOrdersCount = orders.filter(o => {
    if (!passesOtherFilters(o)) return false;
    if (o.orderType === 'TICKET') return true;
    // Nếu có thông tin vé (KHÔNG bao gồm cinemaComplexId/cinemaName), tính là đơn vé
    if (o.movieId || o.movieTitle || (o.seats && o.seats.length > 0) || o.showtimeId || o.roomId || o.roomName) {
      return true;
    }
    return false;
  }).length;

  // Đếm đơn đồ ăn: orderType === 'FOOD_ONLY' VÀ không có thông tin vé
  // LƯU Ý: cinemaComplexId và cinemaName có thể có ở đơn đồ ăn, không phải là thông tin vé
  const foodOrdersCount = orders.filter(o => {
    if (!passesOtherFilters(o)) return false;
    if (o.orderType !== 'FOOD_ONLY') return false;
    // Không được có bất kỳ thông tin vé nào (KHÔNG bao gồm cinemaComplexId/cinemaName)
    if (o.movieId || o.movieTitle || (o.seats && o.seats.length > 0) || o.showtimeId || o.roomId || o.roomName) {
      return false;
    }
    return true;
  }).length;

  // Đếm tất cả: tất cả orders pass các filter (trừ orderTypeFilter)
  const allOrdersCount = orders.filter(o => passesOtherFilters(o)).length;

  const handleCancelOrder = async () => {
    if (!selected) return;

    // Check if already cancelled
    if (selected.status === 'CANCELLED') {
      alert('Đơn hàng này đã được hủy.');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${selected.bookingId} không? Hành động này sẽ hoàn tiền vào ví người dùng.`)) {
      return;
    }

    try {
      const reason = window.prompt("Nhập lý do hủy đơn (tùy chọn):", "Admin hủy đơn hàng");
      if (reason === null) return;

      setLoading(true);
      await cancelOrderAdmin(selected.bookingId, reason);
      alert('Hủy đơn hàng thành công!');
      setSelected(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert(err.message || 'Hủy đơn hàng thất bại');
      setLoading(false);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <h2 className="admin-card__title">Quản lý đặt vé & đồ ăn</h2>

        {/* Order Type Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: '2px solid #333',
          paddingBottom: '8px'
        }}>
          <button
            onClick={() => setOrderTypeFilter('ALL')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: orderTypeFilter === 'ALL' ? '#e83b41' : 'transparent',
              color: orderTypeFilter === 'ALL' ? '#fff' : '#9e9e9e',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: orderTypeFilter === 'ALL' ? 600 : 400,
              transition: 'all 0.2s',
              borderBottom: orderTypeFilter === 'ALL' ? '2px solid #e83b41' : '2px solid transparent',
              marginBottom: orderTypeFilter === 'ALL' ? '-2px' : '0'
            }}
          >
            Tất cả ({allOrdersCount})
          </button>
          <button
            onClick={() => setOrderTypeFilter('TICKET')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: orderTypeFilter === 'TICKET' ? '#e83b41' : 'transparent',
              color: orderTypeFilter === 'TICKET' ? '#fff' : '#9e9e9e',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: orderTypeFilter === 'TICKET' ? 600 : 400,
              transition: 'all 0.2s',
              borderBottom: orderTypeFilter === 'TICKET' ? '2px solid #e83b41' : '2px solid transparent',
              marginBottom: orderTypeFilter === 'TICKET' ? '-2px' : '0'
            }}
          >
            🎬 Đơn vé ({ticketOrdersCount})
          </button>
          <button
            onClick={() => setOrderTypeFilter('FOOD_ONLY')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: orderTypeFilter === 'FOOD_ONLY' ? '#e83b41' : 'transparent',
              color: orderTypeFilter === 'FOOD_ONLY' ? '#fff' : '#9e9e9e',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: orderTypeFilter === 'FOOD_ONLY' ? 600 : 400,
              transition: 'all 0.2s',
              borderBottom: orderTypeFilter === 'FOOD_ONLY' ? '2px solid #e83b41' : '2px solid transparent',
              marginBottom: orderTypeFilter === 'FOOD_ONLY' ? '-2px' : '0'
            }}
          >
            🍿 Đơn đồ ăn ({foodOrdersCount})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="movie-search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input className="movie-search__input" placeholder="Tìm tên KH, sđt, phim, rạp..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="movie-filter" value={filterCinema} onChange={(e) => setFilterCinema(e.target.value)}>
            <option value="">Tất cả rạp</option>
            {cinemasList.map(c => <option key={c.complexId} value={c.complexId}>#{c.complexId} - {c.name}</option>)}
          </select>
          {orderTypeFilter !== 'FOOD_ONLY' && (
            <select className="movie-filter" value={filterMovie} onChange={(e) => setFilterMovie(e.target.value)}>
              <option value="">Tất cả phim</option>
              {moviesList.map(m => <option key={m.movieId} value={m.movieId}>{m.title}</option>)}
            </select>
          )}
          <select className="movie-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Còn hạn</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
          <input type="date" className="movie-filter" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="movie-filter" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="admin-card__content">
        {loading ? (
          <div className="movie-empty">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#e83b41] mb-4"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="movie-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <p>{error}</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="movie-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            <p>
              {orderTypeFilter === 'TICKET' ? 'Không có đơn đặt vé' :
                orderTypeFilter === 'FOOD_ONLY' ? 'Không có đơn đồ ăn' :
                  'Không có đơn hàng nào'}
            </p>
          </div>
        ) : (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('bookingId')}>
                    Mã <SortIcon field="bookingId" />
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('customer')}>
                    Khách hàng <SortIcon field="customer" />
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('movie')}>
                    {orderTypeFilter === 'FOOD_ONLY' ? 'Sản phẩm' : 'Phim / Rạp / Phòng'} <SortIcon field="movie" />
                  </th>
                  {orderTypeFilter !== 'FOOD_ONLY' && (
                    <>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('showtime')}>
                        Suất <SortIcon field="showtime" />
                      </th>
                      <th>Ghế</th>
                    </>
                  )}
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('amount')}>
                    Thanh toán <SortIcon field="amount" />
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>
                    Trạng thái <SortIcon field="status" />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map(o => (
                  <tr key={o.bookingId}>
                    <td>#{o.bookingId}</td>
                    <td>
                      <div className="movie-table-title">{o.user.name}</div>
                      <div className="movie-table-rating">{o.user.phone}</div>
                    </td>
                    <td>
                      {o.orderType === 'FOOD_ONLY' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                            color: '#fff'
                          }}>🍿</span>
                          <div>
                            <div className="movie-table-title" style={{ color: '#fbbf24', fontWeight: 600 }}>Đơn hàng đồ ăn</div>
                            <div className="movie-table-rating">
                              {o.cinemaName ? `${o.cinemaName} • ` : ''}
                              {o.combos && o.combos.length > 0
                                ? `${o.combos.length} combo${o.combos.length > 1 ? 's' : ''} • ${o.combos.reduce((sum, c) => sum + (c.quantity || 0), 0)} sản phẩm`
                                : 'Không có thông tin'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="movie-table-title">{o.movieTitle}</div>
                          <div className="movie-table-rating">{o.cinemaName} • {o.roomName}</div>
                        </>
                      )}
                    </td>
                    {orderTypeFilter !== 'FOOD_ONLY' && (
                      <>
                        <td>
                          <>
                            <div className="movie-table-title">{new Date(o.showtime).toLocaleDateString('vi-VN')}</div>
                            <div className="movie-table-rating">{new Date(o.showtime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {o.seats.map(s => (
                              <span
                                key={s}
                                className="badge-rating"
                                style={{
                                  background: 'linear-gradient(180deg,#7b61ff,#4a1a5c)',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                      </>
                    )}
                    <td>
                      <div className="movie-table-title">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.totalAmount)}</div>
                      <div className="movie-table-rating">{o.paymentMethod}</div>
                    </td>
                    <td>
                      <span className="movie-status-badge" style={{ backgroundColor: statusColor(derivedStatus(o)) }}>
                        {derivedStatus(o) === 'ACTIVE' ? 'Còn hạn' : derivedStatus(o) === 'CANCELLED' ? 'Đã hủy' : 'Hết hạn'}
                      </span>
                    </td>
                    <td>
                      <div className="movie-table-actions">
                        <button className="movie-action-btn" title="Chi tiết" onClick={() => setSelected(o)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="8" /></svg>
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
        {sorted.length > 0 && totalPages > 1 && (() => {
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
      </div>

      {selected && (
        <div className="movie-modal-overlay" onClick={() => setSelected(null)}>
          <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
            <div className="movie-modal__header">
              <h2>Chi tiết đơn #{selected.bookingId}</h2>
              <button className="movie-modal__close" onClick={() => setSelected(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="movie-modal__content">
              <div className="admin-dashboard-grid">
                <div className="admin-card">
                  <div className="admin-card__header"><h3 className="admin-card__title">Thông tin</h3></div>
                  <div className="admin-card__content">
                    <div className="movie-table-title" style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{selected.user.name}</div>
                    <div className="movie-table-rating" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '12px' }}>{selected.user.email} • {selected.user.phone}</div>
                    {selected.orderType === 'FOOD_ONLY' ? (
                      <>
                        <div style={{ marginTop: 8, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px' }}>🍿</span>
                            <strong style={{ color: '#ffd159', fontSize: '15px', fontWeight: 600 }}>Đơn hàng đồ ăn</strong>
                          </div>
                          {selected.cinemaName && (
                            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginTop: '4px' }}>
                              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Cụm rạp:</span> {selected.cinemaName}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ marginTop: 8, color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginBottom: '4px' }}>{selected.movieTitle} • {selected.cinemaName} • {selected.roomName}</div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Suất: {new Date(selected.showtime).toLocaleString('vi-VN')}</div>
                      </>
                    )}
                    <div style={{ marginTop: 12, color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      Ngày đặt: {new Date(selected.showtime).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
                <div className="admin-card">
                  <div className="admin-card__header">
                    <h3 className="admin-card__title">
                      {selected.orderType === 'FOOD_ONLY' ? 'Đồ ăn & Thanh toán' : 'Ghế & Thanh toán'}
                    </h3>
                  </div>
                  <div className="admin-card__content">
                    {selected.orderType === 'FOOD_ONLY' ? (
                      <>
                        {selected.combos && selected.combos.length > 0 ? (
                          <div style={{ marginBottom: 12 }}>
                            {selected.combos.map((combo, idx) => (
                              <div key={idx} style={{ marginBottom: 8, padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px', marginBottom: '4px' }}>{combo.comboName}</div>
                                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                  Số lượng: {combo.quantity} × {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(combo.price / combo.quantity)} = <strong style={{ color: '#ffd159' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(combo.price)}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Không có thông tin đồ ăn</div>
                        )}
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginBottom: '4px' }}>Tổng tiền:</div>
                          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selected.totalAmount)}
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', marginTop: '4px' }}>Phương thức: {selected.paymentMethod}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {selected.seats.map(s => (
                            <span
                              key={s}
                              className="badge-rating"
                              style={{ background: 'linear-gradient(180deg,#7b61ff,#4a1a5c)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <div>Giá vé: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selected.pricePerSeat)} / ghế</div>
                        {selected.combos && selected.combos.length > 0 && (
                          <div style={{ marginTop: 8, marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>🍿 Đồ ăn kèm:</div>
                            {selected.combos.map((combo, idx) => (
                              <div key={idx} style={{ fontSize: '14px', color: '#666', marginLeft: 12 }}>
                                {combo.comboName} × {combo.quantity}
                              </div>
                            ))}
                          </div>
                        )}
                        <div>Tổng: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selected.totalAmount)}</strong> • {selected.paymentMethod}</div>
                      </>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <span className="movie-status-badge" style={{ backgroundColor: statusColor(derivedStatus(selected)) }}>
                        {derivedStatus(selected) === 'ACTIVE' ? 'Còn hạn' : 'Hết hạn'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* QR Code Card */}
                <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="admin-card__header">
                    <h3 className="admin-card__title">Mã QR Code</h3>
                  </div>
                  <div className="admin-card__content" style={{ textAlign: 'center', padding: '24px' }}>
                    {selected.orderType === 'FOOD_ONLY' ? (
                      <>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px', fontWeight: 500 }}>
                          Mã QR Code - Vui lòng quét tại rạp
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                          <QRCodeSVG
                            value={JSON.stringify({
                              orderId: String(selected.bookingId || '').replace('ORD-', ''),
                              type: 'FOOD_ORDER',
                              orderDate: (() => {
                                if (!selected.orderDate) return '';
                                const date = new Date(selected.orderDate);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              })(),
                              totalAmount: String(selected.totalAmount || '0'),
                              foodItems: (selected.combos || []).map(combo => ({
                                foodComboId: String(combo.foodComboId || combo.id || ''),
                                name: String(combo.comboName || ''),
                                quantity: combo.quantity || 0,
                                price: String(combo.price || '0')
                              }))
                            })}
                            size={200}
                            level="M"
                            includeMargin={true}
                          />
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', fontWeight: 500 }}>
                          Order ID: {selected.bookingId}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px', fontWeight: 500 }}>
                          Mã QR Code - Vui lòng quét tại rạp
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                          <QRCodeSVG
                            value={JSON.stringify((() => {
                              // Create bookingId: orderId-showtimeId-yyyy-MM-dd'T'HH:mm:ss
                              const orderIdNum = String(selected.bookingId || '').replace('ORD-', '');
                              const showtimeId = selected.showtimeId || '';
                              const showtimeStart = selected.showtime;

                              let bookingId = '';
                              if (showtimeStart && showtimeId) {
                                const date = new Date(showtimeStart);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                const seconds = String(date.getSeconds()).padStart(2, '0');
                                const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                                bookingId = `${orderIdNum}-${showtimeId}-${formattedDate}`;
                              } else {
                                bookingId = `${orderIdNum}-${Date.now()}`;
                              }

                              // Format date: dd/MM/yyyy
                              const formatDateForQR = (dateString) => {
                                if (!dateString) return '';
                                const date = new Date(dateString);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              };

                              // Format time: HH:mm
                              const formatTimeForQR = (dateString) => {
                                if (!dateString) return '';
                                const date = new Date(dateString);
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                return `${hours}:${minutes}`;
                              };

                              // Map room type (remove TYPE_ prefix if present)
                              const mapRoomType = (roomType) => {
                                if (!roomType) return '2D';
                                return String(roomType).replace('TYPE_', '');
                              };

                              // Sort seats
                              const sortedSeats = [...(selected.seats || [])].sort();

                              // Create QR data object with exact order
                              const qrData = {};
                              qrData.bookingId = String(bookingId || '');
                              qrData.orderId = String(orderIdNum || '');
                              qrData.movie = String(selected.movieTitle || '');
                              qrData.cinema = String(selected.cinemaName || '');
                              qrData.date = formatDateForQR(showtimeStart);
                              qrData.time = formatTimeForQR(showtimeStart);
                              qrData.seats = sortedSeats;
                              qrData.format = mapRoomType(selected.roomType);

                              return qrData;
                            })())}
                            size={200}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', fontWeight: 500 }}>
                          {(() => {
                            const orderIdNum = String(selected.bookingId || '').replace('ORD-', '');
                            const showtimeId = selected.showtimeId || '';
                            const showtimeStart = selected.showtime;

                            if (showtimeStart && showtimeId) {
                              const date = new Date(showtimeStart);
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const hours = String(date.getHours()).padStart(2, '0');
                              const minutes = String(date.getMinutes()).padStart(2, '0');
                              const seconds = String(date.getSeconds()).padStart(2, '0');
                              const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                              return `Booking ID: ${orderIdNum}-${showtimeId}-${formattedDate}`;
                            }
                            return `Order ID: ${orderIdNum}`;
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="movie-modal__footer">
              {selected.status !== 'CANCELLED' && (
                <button
                  className="btn"
                  style={{
                    backgroundColor: '#e83b41',
                    color: '#fff',
                    marginRight: 'auto'
                  }}
                  onClick={handleCancelOrder}
                >
                  Hủy đơn hàng
                </button>
              )}
              <button className="btn btn--ghost" onClick={() => setSelected(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingManagement;
