import React, { useState, useMemo, useEffect } from 'react';
import { getAllOrdersManager } from '../../services/customer';
import { QRCodeSVG } from 'qrcode.react';

// Manager Booking Management Component (filtered by managerComplexIds)
function ManagerBookingManagement({ orders: initialOrders, cinemas, movies, managerComplexIds }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCinema, setFilterCinema] = useState('');
  const [filterMovie, setFilterMovie] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState('bookingId');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selected, setSelected] = useState(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL'); // ALL, TICKET, FOOD_ONLY
  
  // Load orders from backend
  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const ordersData = await getAllOrdersManager();
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
                status: 'PAID', // All orders in DB are successful
                paymentMethod: order.paymentMethod || 'UNKNOWN',
                combos: order.combos || [],
                orderDate: order.orderDate // For food-only QR code
              });
            });
          } else if (hasCombos) {
            // Food-only order (no tickets)
            // Với đơn hàng chỉ có đồ ăn, lấy cinemaComplexId từ order entity (đã được lưu khi tạo order)
            const comboTotal = order.combos.reduce((sum, c) => sum + (parseFloat(c.price) * (c.quantity || 1) || 0), 0);
            
            // Lấy cinemaComplexId từ order (backend đã lưu khi tạo order)
            const orderCinemaComplexId = order.cinemaComplexId || null;
            
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
              cinemaComplexId: orderCinemaComplexId, // Lấy từ order entity (đã được lưu khi tạo order)
              cinemaName: orderCinemaComplexId ? (cinemas?.find(c => c.complexId === orderCinemaComplexId)?.name || null) : null,
              roomId: null,
              roomName: null,
              showtime: order.orderDate, // Use order date for food-only orders
              seats: [],
              pricePerSeat: 0,
              totalAmount: parseFloat(order.totalAmount) || comboTotal,
              status: 'PAID',
              paymentMethod: order.paymentMethod || 'UNKNOWN',
              combos: order.combos || [],
              orderDate: order.orderDate // For food-only QR code
            });
          }
        });
        
        // Validation: Đảm bảo không có đơn hàng FOOD_ONLY nhưng lại có thông tin vé
        // Nếu phát hiện, tự động sửa lại orderType thành TICKET
        // LƯU Ý: Đơn đồ ăn có thể có cinemaComplexId và cinemaName (để biết rạp nào bán)
        // nhưng KHÔNG được có thông tin vé (movieId, movieTitle, seats, showtimeId, roomId, roomName)
        mappedOrders.forEach(order => {
          if (order.orderType === 'FOOD_ONLY') {
            // Kiểm tra xem có thông tin vé không (KHÔNG kiểm tra cinemaComplexId/cinemaName)
            if (order.movieId || order.movieTitle || (order.seats && order.seats.length > 0) || 
                order.showtimeId || order.roomId || order.roomName) {
              console.warn('Found FOOD_ONLY order with ticket info, fixing orderType to TICKET:', order.bookingId);
              order.orderType = 'TICKET';
            }
          }
        });
        
        console.log('Mapped orders:', mappedOrders);
        setOrders(mappedOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err.message || 'Không thể tải danh sách đơn hàng');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, []);

  const scopedCinemas = useMemo(() => {
    return (cinemas || []).filter(c => managerComplexIds.includes(c.complexId));
  }, [cinemas, managerComplexIds]);

  // Helper function to determine order status - đơn đồ ăn luôn là ACTIVE
  const derivedStatus = (order) => {
    if (order.orderType === 'FOOD_ONLY') {
      return 'ACTIVE'; // Food orders are always active
    }
    const orderDate = new Date(order.showtime);
    const now = new Date();
    return orderDate > now && order.status === 'PAID' ? 'ACTIVE' : 'EXPIRED';
  };

  const statusColor = (status) => status === 'ACTIVE' ? '#4caf50' : '#9e9e9e';

  const filteredOrders = useMemo(() => {
    console.log('=== Filtering orders ===');
    console.log('orders count:', orders?.length || 0);
    console.log('managerComplexIds:', managerComplexIds);
    console.log('managerComplexIds length:', managerComplexIds?.length || 0);
    
    if (!orders || orders.length === 0) {
      console.log('No orders to filter');
      return [];
    }
    
    return (orders || []).filter(order => {
      // If managerComplexIds is empty, show all orders (fallback)
      if (!managerComplexIds || managerComplexIds.length === 0) {
        console.warn('managerComplexIds is empty, showing all orders');
        // Continue with other filters below
      } else {
        // Check if order's cinemaComplexId matches any of manager's complexIds
        // Handle type conversion (string vs number)
        const orderComplexId = order.cinemaComplexId;
        const matches = managerComplexIds.some(id => 
          id == orderComplexId || 
          Number(id) === Number(orderComplexId) ||
          String(id) === String(orderComplexId)
        );
        
        if (!matches) {
          if (orders.indexOf(order) < 3) {
            console.log(`Order ${order.bookingId} filtered out: cinemaComplexId=${orderComplexId} not in managerComplexIds=${managerComplexIds}`);
          }
          return false;
        }
      }
      // Filter by order type
      if (orderTypeFilter === 'TICKET' && order.orderType !== 'TICKET') return false;
      // Đơn đồ ăn: Chỉ hiển thị đơn hàng KHÔNG có vé (không có bất kỳ thông tin vé nào)
      // LƯU Ý: Food-only orders CÓ THỂ có cinemaComplexId và cinemaName (để biết rạp nào bán)
      // nhưng KHÔNG được có thông tin vé (movieId, movieTitle, seats, showtimeId, roomId, roomName)
      if (orderTypeFilter === 'FOOD_ONLY') {
        // Phải là FOOD_ONLY
        if (order.orderType !== 'FOOD_ONLY') return false;
        // Kiểm tra kỹ: không được có bất kỳ thông tin vé nào (nhưng có thể có cinemaComplexId)
        if (order.movieId || 
            order.movieTitle || 
            (order.seats && order.seats.length > 0) || 
            order.showtimeId ||
            order.roomId ||
            order.roomName) {
          // Đơn hàng này có thông tin vé, không phải food-only
          return false;
        }
      }
      
      // Text search - chỉ áp dụng nếu có searchTerm
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches = 
          (order.user?.name || '').toLowerCase().includes(term) ||
          (order.user?.phone || '').includes(term) ||
          (order.movieTitle || '').toLowerCase().includes(term) ||
          (order.cinemaName || '').toLowerCase().includes(term) ||
          (order.orderType === 'FOOD_ONLY' && 'đồ ăn'.includes(term));
        if (!matches) return false;
      }
      
      // Cinema filter - áp dụng cho cả đơn có vé và đơn đồ ăn
      // Food-only orders cần có cinemaComplexId để biết rạp nào bán
      if (filterCinema) {
        if (!order.cinemaComplexId || order.cinemaComplexId !== Number(filterCinema)) {
          return false;
        }
      }
      
      // Movie filter - chỉ áp dụng cho đơn có vé, đơn đồ ăn luôn pass
      if (filterMovie) {
        if (!order.movieId || order.movieId !== Number(filterMovie)) {
          return false;
        }
      }
      
      // Status filter - sử dụng derivedStatus để xử lý đúng cho đơn đồ ăn
      if (filterStatus) {
        const orderStatus = derivedStatus(order);
        if (orderStatus !== filterStatus) return false;
      }
      
      // Date range filter - đơn đồ ăn dùng orderDate, đơn vé dùng showtime
      const dateToCheck = order.orderType === 'FOOD_ONLY' ? (order.orderDate || order.showtime) : order.showtime;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(dateToCheck) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(dateToCheck) > to) return false;
      }
      
      return true;
    });
  }, [orders, orderTypeFilter, searchTerm, filterCinema, filterMovie, filterStatus, dateFrom, dateTo, managerComplexIds]);
  
  // Debug logging after filtering
  useEffect(() => {
    console.log('=== After filtering ===');
    console.log('filteredOrders count:', filteredOrders?.length || 0);
    if (filteredOrders && filteredOrders.length > 0) {
      console.log('First few filtered orders:', filteredOrders.slice(0, 3));
    } else {
      console.log('No filtered orders!');
      console.log('Orders:', orders);
      console.log('managerComplexIds:', managerComplexIds);
    }
  }, [filteredOrders, orders, managerComplexIds]);

  const sorted = useMemo(() => {
    const sortedList = [...filteredOrders];
    sortedList.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'bookingId': aVal = a.bookingId; bVal = b.bookingId; break;
        case 'customer': aVal = a.user?.name || ''; bVal = b.user?.name || ''; break;
        case 'movie': aVal = a.movieTitle || ''; bVal = b.movieTitle || ''; break;
        case 'showtime': aVal = new Date(a.showtime).getTime(); bVal = new Date(b.showtime).getTime(); break;
        case 'amount': aVal = a.totalAmount || 0; bVal = b.totalAmount || 0; break;
        case 'status': 
          aVal = derivedStatus(a);
          bVal = derivedStatus(b);
          break;
        default: return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sortedList;
  }, [filteredOrders, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>↕</span>;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // Count orders by type - Phải dùng filteredOrders để nhất quán với danh sách hiển thị
  // Tạo một hàm helper để check xem order có pass các filter không (trừ orderTypeFilter)
  const passesOtherFiltersForCount = (o) => {
    // Check managerComplexIds filter
    if (managerComplexIds && managerComplexIds.length > 0) {
      const orderComplexId = o.cinemaComplexId;
      const matches = managerComplexIds.some(id => 
        id == orderComplexId || 
        Number(id) === Number(orderComplexId) ||
        String(id) === String(orderComplexId)
      );
      if (!matches) return false;
    }
    
    // Text search - chỉ áp dụng khi có searchTerm
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches = 
        (o.user?.name || '').toLowerCase().includes(term) ||
        (o.user?.phone || '').includes(term) ||
        (o.movieTitle || '').toLowerCase().includes(term) ||
        (o.cinemaName || '').toLowerCase().includes(term) ||
        (o.orderType === 'FOOD_ONLY' && 'đồ ăn'.includes(term));
      if (!matches) return false;
    }
    
    // Cinema filter - chỉ áp dụng cho đơn có vé, đơn đồ ăn luôn pass
    if (filterCinema) {
      if (!o.cinemaComplexId || o.cinemaComplexId !== Number(filterCinema)) {
        return false;
      }
    }
    
    // Movie filter - chỉ áp dụng cho đơn có vé, đơn đồ ăn luôn pass
    if (filterMovie) {
      if (!o.movieId || o.movieId !== Number(filterMovie)) {
        return false;
      }
    }
    
    // Status filter - sử dụng derivedStatus để xử lý đúng cho đơn đồ ăn
    if (filterStatus) {
      const orderStatus = derivedStatus(o);
      if (orderStatus !== filterStatus) return false;
    }
    
    // Date range filter - đơn đồ ăn dùng orderDate, đơn vé dùng showtime
    const dateToCheck = o.orderType === 'FOOD_ONLY' ? (o.orderDate || o.showtime) : o.showtime;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(dateToCheck) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(dateToCheck) > to) return false;
    }
    
    return true;
  };
  
  // Đếm đơn vé: CHỈ đếm đơn có orderType === 'TICKET'
  // Đơn FOOD_ONLY không bao giờ được đếm vào đây, dù có thông tin gì đi nữa
  const ticketOrdersCount = orders.filter(o => {
    if (!passesOtherFiltersForCount(o)) return false;
    // Chỉ đếm đơn có orderType === 'TICKET'
    return o.orderType === 'TICKET';
  }).length;
  
  // Đơn đồ ăn: orderType === 'FOOD_ONLY' VÀ không có thông tin vé (nhưng có thể có cinemaComplexId)
  const foodOrdersCount = orders.filter(o => {
    if (!passesOtherFiltersForCount(o)) return false;
    if (o.orderType !== 'FOOD_ONLY') return false;
    // Không được có bất kỳ thông tin vé nào (nhưng có thể có cinemaComplexId)
    if (o.movieId || o.movieTitle || (o.seats && o.seats.length > 0) || o.showtimeId || o.roomId || o.roomName) {
      return false;
    }
    return true;
  }).length;
  
  // Đếm tất cả: tất cả orders pass các filter (trừ orderTypeFilter)
  const allOrdersCount = orders.filter(o => passesOtherFiltersForCount(o)).length;

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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="movie-search" style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="movie-search__input" placeholder="Tìm tên KH, sđt, phim, rạp..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
          </div>
          {orderTypeFilter !== 'FOOD_ONLY' && (
            <>
              <select className="movie-filter" value={filterCinema} onChange={(e)=>setFilterCinema(e.target.value)} style={{ flex: '0 1 200px', minWidth: '150px' }}>
                <option value="">Tất cả rạp</option>
                {scopedCinemas.map(c => <option key={c.complexId} value={c.complexId}>#{c.complexId} - {c.name}</option>)}
              </select>
              <select className="movie-filter" value={filterMovie} onChange={(e)=>setFilterMovie(e.target.value)} style={{ flex: '0 1 200px', minWidth: '150px' }}>
                <option value="">Tất cả phim</option>
                {(movies || []).map(m => <option key={m.movieId} value={m.movieId}>{m.title}</option>)}
              </select>
            </>
          )}
          <select className="movie-filter" value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} style={{ flex: '0 1 180px', minWidth: '150px' }}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Còn hạn</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
          <input type="date" className="movie-filter" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} style={{ flex: '0 1 160px', minWidth: '140px' }} />
          <input type="date" className="movie-filter" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} style={{ flex: '0 1 160px', minWidth: '140px' }} />
        </div>
      </div>

      <div className="admin-card__content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: '#fff' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(232, 59, 65, 0.3)',
                borderTop: '4px solid #e83b41',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : error ? (
          <div className="movie-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ color: '#ff5757' }}>{error}</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="movie-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
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
                    Phim / Rạp / Phòng <SortIcon field="movie" />
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('showtime')}>
                    Suất <SortIcon field="showtime" />
                  </th>
                  <th>Ghế</th>
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
                {sorted.map(o => (
                  <tr key={o.bookingId}>
                    <td>#{o.bookingId}</td>
                    <td>
                      <div className="movie-table-title">{o.user?.name || 'Unknown'}</div>
                      <div className="movie-table-rating">{o.user?.email} • {o.user?.phone}</div>
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
                    <td>
                      {o.orderType === 'FOOD_ONLY' ? (
                        <div style={{ color: '#9e9e9e' }}>—</div>
                      ) : (
                        new Date(o.showtime).toLocaleString('vi-VN')
                      )}
                    </td>
                    <td>
                      {o.orderType === 'FOOD_ONLY' ? (
                        <div style={{ color: '#9e9e9e' }}>—</div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {o.seats.map(s => (
                            <span key={s} className="badge-rating" style={{ background: 'linear-gradient(180deg,#7b61ff,#4a1a5c)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="movie-table-title">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.totalAmount)}</div>
                      <div className="movie-table-rating">{o.paymentMethod}</div>
                    </td>
                    <td>
                      <span className="movie-status-badge" style={{ backgroundColor: statusColor(derivedStatus(o)) }}>
                        {derivedStatus(o) === 'ACTIVE' ? 'Còn hạn' : 'Hết hạn'}
                      </span>
                    </td>
                    <td>
                      <div className="movie-table-actions">
                        <button className="movie-action-btn" title="Chi tiết" onClick={()=>setSelected(o)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="movie-modal-overlay" onClick={()=>setSelected(null)}>
          <div className="movie-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="movie-modal__header">
              <h2>Chi tiết đơn #{selected.bookingId}</h2>
              <button className="movie-modal__close" onClick={()=>setSelected(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="movie-modal__content">
              <div className="admin-dashboard-grid">
                <div className="admin-card">
                  <div className="admin-card__header"><h3 className="admin-card__title">Thông tin</h3></div>
                  <div className="admin-card__content">
                    <div className="movie-table-title">{selected.user?.name}</div>
                    <div className="movie-table-rating">{selected.user?.email} • {selected.user?.phone}</div>
                    {selected.orderType === 'FOOD_ONLY' ? (
                      <div style={{ marginTop: 8 }}>
                        <strong>🍿 Đơn hàng đồ ăn</strong>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginTop: 8 }}>{selected.movieTitle} • {selected.cinemaName} • {selected.roomName}</div>
                        <div>Suất: {new Date(selected.showtime).toLocaleString('vi-VN')}</div>
                      </>
                    )}
                    <div style={{ marginTop: 8 }}>Ngày đặt: {new Date(selected.showtime).toLocaleString('vi-VN')}</div>
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
                              <div key={idx} style={{ marginBottom: 8, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                                <div style={{ fontWeight: 600 }}>{combo.comboName}</div>
                                <div style={{ fontSize: '14px', color: '#666' }}>
                                  Số lượng: {combo.quantity} × {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(combo.price / combo.quantity)} = {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(combo.price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: '#9e9e9e' }}>Không có thông tin đồ ăn</div>
                        )}
                        <div>Tổng: <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selected.totalAmount)}</strong> • {selected.paymentMethod}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {selected.seats.map(s => (
                            <span key={s} className="badge-rating" style={{ background: 'linear-gradient(180deg,#7b61ff,#4a1a5c)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
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
                      Trạng thái:{' '}
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
              <button className="btn btn--ghost" onClick={()=>setSelected(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerBookingManagement;


