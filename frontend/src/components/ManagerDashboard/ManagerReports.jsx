import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getAllOrdersManager } from '../../services/customer';
import showtimeService from '../../services/showtimeService';

// Manager Reports Component (for single cinema complex)
function ManagerReports({ orders: initialOrders, movies, cinemas, managerComplexIds }) {
  const [timeRange, setTimeRange] = useState('30');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allShowtimes, setAllShowtimes] = useState([]);
  
  // Load orders from backend
  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        const ordersData = await getAllOrdersManager();
        console.log('ManagerReports: Loaded orders from backend:', ordersData);
        
        // Map backend format to frontend format (same as ManagerBookingManagement)
        const mappedOrders = [];
        ordersData.forEach(order => {
          const hasTickets = order.items && order.items.length > 0;
          const hasCombos = order.combos && order.combos.length > 0;
          
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
                orderId: order.orderId,
                orderType: 'TICKET',
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
                theaterName: firstTicket.roomName, // For revenueByTheater
                theaterId: firstTicket.roomId, // For revenueByTheater
                showtime: firstTicket.showtimeStart,
                seats: seats,
                pricePerSeat: ticketGroup.length > 0 ? parseFloat(ticketGroup[0].price) || 0 : 0,
                ticketAmount: totalTicketPrice,
                comboAmount: comboTotal,
                totalAmount: parseFloat(order.totalAmount) || totalAmount,
                combos: order.combos || [],
                orderDate: order.orderDate || order.createdAt || new Date().toISOString(),
                status: order.status || 'PAID',
                paymentMethod: order.paymentMethod || 'UNKNOWN',
                isTopUp: order.isTopUp || false,
                refundAmount: order.refundAmount || 0
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
              orderId: order.orderId,
              orderType: 'FOOD_ONLY',
              user: {
                name: order.userName || 'N/A',
                email: order.userEmail || '',
                phone: order.userPhone || ''
              },
              movieId: null,
              movieTitle: null,
              cinemaComplexId: orderCinemaComplexId, // Lấy từ order entity (đã được lưu khi tạo order)
              cinemaName: orderCinemaComplexId ? (cinemas.find(c => c.complexId === orderCinemaComplexId)?.name || null) : null,
              roomId: null,
              roomName: null,
              theaterName: null,
              theaterId: null,
              showtime: order.orderDate || order.createdAt || new Date().toISOString(),
              seats: [],
              pricePerSeat: 0,
              ticketAmount: 0,
              comboAmount: comboTotal,
              totalAmount: parseFloat(order.totalAmount) || comboTotal,
              combos: order.combos || [],
              orderDate: order.orderDate || order.createdAt || new Date().toISOString(),
              status: order.status || 'PAID',
              paymentMethod: order.paymentMethod || 'UNKNOWN',
              isTopUp: order.isTopUp || false,
              refundAmount: order.refundAmount || 0
            });
          }
        });
        
        console.log('ManagerReports: Mapped orders:', mappedOrders);
        console.log('ManagerReports: Mapped orders count:', mappedOrders.length);
        if (mappedOrders.length > 0) {
          console.log('ManagerReports: First mapped order:', {
            bookingId: mappedOrders[0].bookingId,
            orderType: mappedOrders[0].orderType,
            cinemaComplexId: mappedOrders[0].cinemaComplexId,
            movieTitle: mappedOrders[0].movieTitle,
            totalAmount: mappedOrders[0].totalAmount
          });
        }
        setOrders(mappedOrders);
      } catch (err) {
        console.error('ManagerReports: Error loading orders:', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, []);

  // Load all showtimes to check which movies are actually showing
  useEffect(() => {
    const loadShowtimes = async () => {
      if (!movies || movies.length === 0) return;
      
      try {
        // Check showtimes for the next 7 days to see which movies are actually showing
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          dates.push(date.toISOString().split('T')[0]);
        }
        
        const showtimesPromises = movies.flatMap(movie => 
          dates.map(async (date) => {
            try {
              const result = await showtimeService.getPublicShowtimes(movie.movieId, null, date);
              if (result.success && result.data) {
                return result.data.map(st => ({
                  ...st,
                  movieId: movie.movieId
                }));
              }
              return [];
            } catch (err) {
              // Silently fail for individual requests
              return [];
            }
          })
        );
        
        const showtimesArrays = await Promise.all(showtimesPromises);
        const allShowtimesData = showtimesArrays.flat();
        setAllShowtimes(allShowtimesData);
      } catch (err) {
        console.error('Error loading showtimes:', err);
        setAllShowtimes([]);
      }
    };
    
    loadShowtimes();
  }, [movies]);

  // Manager chỉ quản lý 1 rạp duy nhất
  const managedCinema = useMemo(() => {
    return (cinemas || []).find(c => managerComplexIds.includes(c.complexId));
  }, [cinemas, managerComplexIds]);

  const scopedOrders = useMemo(() => {
    console.log('ManagerReports: scopedOrders calculation');
    console.log('ManagerReports: orders count:', orders?.length || 0);
    console.log('ManagerReports: managerComplexIds:', managerComplexIds);
    
    if (!orders || orders.length === 0) {
      console.log('ManagerReports: No orders to scope');
      return [];
    }
    
    // Backend đã filter orders theo complexId của manager rồi (getAllOrdersManager)
    // Query backend: WHERE (cc.complexId = :complexId OR NOT EXISTS (SELECT 1 FROM Ticket t2 WHERE t2.order = o))
    // Điều này có nghĩa là:
    // - Orders có tickets: phải có cc.complexId = :complexId (rạp của manager) ✅
    // - Orders không có tickets (food-only): được trả về cho TẤT CẢ managers ❌
    // 
    // GIẢI PHÁP: Frontend cần filter lại đơn hàng chỉ có đồ ăn theo cinemaComplexId
    // (đã được lưu trong Order entity khi tạo order từ trang Food & Drinks)
    const filtered = orders.filter(order => {
      // Giữ lại đơn hàng có vé phim (có cinemaComplexId) - đã được backend filter theo complexId
      if (order.orderType === 'TICKET' && order.cinemaComplexId) {
        // Kiểm tra thêm: cinemaComplexId phải thuộc rạp của manager này
        if (managerComplexIds.includes(order.cinemaComplexId)) {
          return true;
        } else {
          if (orders.indexOf(order) < 3) {
            console.warn(`ManagerReports: Order ${order.bookingId} has cinemaComplexId=${order.cinemaComplexId} but not in managerComplexIds=${managerComplexIds}`);
          }
          return false;
        }
      }
      
      // Giữ lại đơn hàng chỉ có đồ ăn (FOOD_ONLY) - CHỈ nếu có cinemaComplexId và thuộc rạp của manager
      // cinemaComplexId đã được lưu trong Order entity khi tạo order từ trang Food & Drinks
      if (order.orderType === 'FOOD_ONLY') {
        if (order.cinemaComplexId && managerComplexIds.includes(order.cinemaComplexId)) {
          if (orders.indexOf(order) < 3) {
            console.log(`ManagerReports: Including food-only order ${order.bookingId} with cinemaComplexId=${order.cinemaComplexId}`);
          }
          return true;
        } else {
          if (orders.indexOf(order) < 3) {
            console.log(`ManagerReports: Excluding food-only order ${order.bookingId} - cinemaComplexId=${order.cinemaComplexId}, not in managerComplexIds=${managerComplexIds}`);
          }
          return false;
        }
      }
      
      // Loại bỏ các orders không có cinemaComplexId và không phải FOOD_ONLY
      if (orders.indexOf(order) < 3) {
        console.log(`ManagerReports: Excluding order ${order.bookingId} - orderType=${order.orderType}, cinemaComplexId=${order.cinemaComplexId}`);
      }
      return false;
    });
    
    console.log('ManagerReports: scopedOrders count:', filtered.length);
    if (filtered.length > 0) {
      console.log('ManagerReports: First few scoped orders:', filtered.slice(0, 3).map(o => ({
        bookingId: o.bookingId,
        cinemaComplexId: o.cinemaComplexId,
        orderType: o.orderType,
        totalAmount: o.totalAmount,
        movieTitle: o.movieTitle,
        comboAmount: o.comboAmount
      })));
    } else {
      console.warn('ManagerReports: No scoped orders after filtering!');
      console.log('ManagerReports: All orders:', orders.map(o => ({
        bookingId: o.bookingId,
        orderType: o.orderType,
        cinemaComplexId: o.cinemaComplexId,
        totalAmount: o.totalAmount,
        hasItems: o.items?.length > 0,
        hasCombos: o.combos?.length > 0
      })));
    }
    
    return filtered;
  }, [orders, managerComplexIds]);

  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case '7':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setFullYear(2020);
    }
    return { startDate, endDate };
  }, [timeRange]);

  const filteredOrders = useMemo(() => {
    console.log('ManagerReports: Filtering orders - scopedOrders:', scopedOrders.length);
    console.log('ManagerReports: Date range:', {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
    
    if (scopedOrders.length === 0) {
      console.warn('ManagerReports: No scoped orders to filter!');
      return [];
    }
    
    const filtered = scopedOrders.filter(order => {
      // Filter by payment method: chỉ tính VNPAY, MOMO, ZALOPAY (không tính WALLET trừ khi là top-up)
      const paymentMethod = order.paymentMethod?.toUpperCase();
      const isTopUp = order.isTopUp === true;
      const isWalletPayment = paymentMethod === 'WALLET';
      
      // Nếu là thanh toán bằng ví và không phải top-up, không tính
      if (isWalletPayment && !isTopUp) {
        return false;
      }
      
      // Backend đã filter orders theo complexId và chỉ trả về orders đã thanh toán
      // Nên không cần check status nữa, nhưng để an toàn vẫn check
      if (order.status !== 'PAID' && order.status !== 'CANCELLED') {
        if (scopedOrders.indexOf(order) < 3) {
          console.log(`ManagerReports: Order ${order.bookingId} filtered out: status=${order.status}`);
        }
        return false;
      }
      
      // Use orderDate if available, otherwise use showtime
      // Với đơn hàng có vé phim, nên dùng orderDate (ngày đặt hàng) để tính doanh thu
      const orderDate = order.orderDate ? new Date(order.orderDate) : (order.showtime ? new Date(order.showtime) : null);
      
      if (!orderDate) {
        console.warn(`ManagerReports: Order ${order.bookingId} has no orderDate or showtime!`);
        return false;
      }
      
      // Reset time to start of day for comparison
      const orderDateOnly = new Date(orderDate);
      orderDateOnly.setHours(0, 0, 0, 0);
      const startDateOnly = new Date(dateRange.startDate);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(dateRange.endDate);
      endDateOnly.setHours(23, 59, 59, 999);
      
      if (orderDateOnly < startDateOnly || orderDateOnly > endDateOnly) {
        if (scopedOrders.indexOf(order) < 3) {
          console.log(`ManagerReports: Order ${order.bookingId} filtered out by date: orderDate=${orderDateOnly.toISOString()}, range=${startDateOnly.toISOString()} to ${endDateOnly.toISOString()}`);
        }
        return false;
      }
      
      return true;
    });
    
    console.log('ManagerReports: filteredOrders count:', filtered.length);
    if (filtered.length > 0) {
      console.log('ManagerReports: First few filtered orders:', filtered.slice(0, 3).map(o => ({
        bookingId: o.bookingId,
        orderDate: o.orderDate,
        showtime: o.showtime,
        totalAmount: o.totalAmount,
        movieTitle: o.movieTitle
      })));
    } else {
      console.warn('ManagerReports: No filtered orders after date/movie filter!');
      if (scopedOrders.length > 0) {
        console.log('ManagerReports: Sample scoped orders:', scopedOrders.slice(0, 3).map(o => ({
          bookingId: o.bookingId,
          orderDate: o.orderDate,
          showtime: o.showtime,
          status: o.status,
          totalAmount: o.totalAmount
        })));
      }
    }
    
    return filtered;
  }, [scopedOrders, dateRange]);

  const summaryStats = useMemo(() => {
    console.log('ManagerReports: Calculating summaryStats from filteredOrders:', filteredOrders.length);
    
    // Calculate revenue - group by orderId to avoid double counting
    // Bao gồm cả đơn hàng chỉ có đồ ăn (FOOD_ONLY) - giống như admin reports
    const uniqueOrders = new Map();
    filteredOrders.forEach(order => {
      const orderId = order.orderId || order.bookingId;
      if (!uniqueOrders.has(orderId)) {
        // Tính doanh thu: nếu order bị CANCELLED, trừ đi refundAmount
        let netAmount = order.totalAmount || 0;
        if (order.status === 'CANCELLED' && order.refundAmount) {
          netAmount = netAmount - (parseFloat(order.refundAmount) || 0);
        }
        
        uniqueOrders.set(orderId, {
          totalAmount: netAmount,
          ticketCount: order.seats?.length || 0,
          orderType: order.orderType,
          comboAmount: order.comboAmount || 0,
          ticketAmount: order.ticketAmount || 0
        });
      } else {
        // If order already exists, only add tickets (revenue already counted)
        uniqueOrders.get(orderId).ticketCount += order.seats?.length || 0;
      }
    });
    
    const totalRevenue = Array.from(uniqueOrders.values()).reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = uniqueOrders.size; // Số lượng đơn hàng unique
    
    console.log('ManagerReports: Summary stats calculation:');
    console.log('  - Unique orders:', uniqueOrders.size);
    console.log('  - Total revenue:', totalRevenue);
    console.log('  - Total orders:', totalOrders);
    console.log('  - Orders breakdown:', Array.from(uniqueOrders.values()).map(o => ({
      totalAmount: o.totalAmount,
      ticketCount: o.ticketCount,
      orderType: o.orderType,
      ticketAmount: o.ticketAmount,
      comboAmount: o.comboAmount
    })));
    
    // Log breakdown by order type
    const ticketOrders = Array.from(uniqueOrders.values()).filter(o => o.orderType === 'TICKET');
    const foodOnlyOrders = Array.from(uniqueOrders.values()).filter(o => o.orderType === 'FOOD_ONLY');
    console.log('  - Ticket orders:', ticketOrders.length, 'Revenue:', ticketOrders.reduce((sum, o) => sum + o.totalAmount, 0));
    console.log('  - Food-only orders:', foodOnlyOrders.length, 'Revenue:', foodOnlyOrders.reduce((sum, o) => sum + o.totalAmount, 0));

    return {
      totalRevenue,
      totalOrders
    };
  }, [filteredOrders]);

  const revenueByMovie = useMemo(() => {
    const movieRevenue = {};
    filteredOrders.forEach(order => {
      // Bỏ qua đơn hàng chỉ có đồ ăn (không có vé phim)
      if (order.orderType === 'FOOD_ONLY' || !order.movieId || !order.seats || order.seats.length === 0) {
        return;
      }
      
      const movieId = order.movieId;
      const movieTitle = order.movieTitle || movies.find(m => m.movieId === movieId)?.title || 'Unknown';
      if (!movieRevenue[movieId]) {
        movieRevenue[movieId] = { movieId, title: movieTitle, revenue: 0, tickets: 0 };
      }
      // CHỈ tính doanh thu từ vé phim (ticketAmount), KHÔNG tính doanh thu từ đồ ăn
      // Nếu order bị CANCELLED, trừ đi refundAmount tương ứng với ticketAmount
      let ticketRevenue = order.ticketAmount || 0;
      if (order.status === 'CANCELLED' && order.refundAmount) {
        // Tính tỷ lệ refund cho ticketAmount (nếu có comboAmount, chỉ refund phần ticket)
        const totalAmount = order.totalAmount || 0;
        if (totalAmount > 0) {
          const ticketRatio = ticketRevenue / totalAmount;
          ticketRevenue = ticketRevenue - (parseFloat(order.refundAmount) || 0) * ticketRatio;
        } else {
          ticketRevenue = ticketRevenue - (parseFloat(order.refundAmount) || 0);
        }
      }
      movieRevenue[movieId].revenue += Math.max(0, ticketRevenue);
      movieRevenue[movieId].tickets += order.seats?.length || 0;
    });
    return Object.values(movieRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, movies]);

  const revenueByTheater = useMemo(() => {
    const theaterRevenue = {};
    filteredOrders.forEach(order => {
      // Bỏ qua đơn hàng chỉ có đồ ăn (không có phòng chiếu cụ thể)
      if (order.orderType === 'FOOD_ONLY' || !order.roomId || !order.roomName) {
        return;
      }
      
      const theaterName = order.theaterName || `Phòng ${order.theaterId || 'N/A'}`;
      if (!theaterRevenue[theaterName]) {
        theaterRevenue[theaterName] = { name: theaterName, revenue: 0, tickets: 0 };
      }
      // CHỈ tính doanh thu từ vé phim (ticketAmount), KHÔNG tính doanh thu từ đồ ăn
      theaterRevenue[theaterName].revenue += order.ticketAmount || 0;
      theaterRevenue[theaterName].tickets += order.seats?.length || 0;
    });
    return Object.values(theaterRevenue).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const dailyRevenue = useMemo(() => {
    const daily = {};
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      daily[dateStr] = { revenue: 0, orderIds: new Set() };
      days.push({
        date: dateStr,
        displayDate: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue: 0
      });
    }
    
    // Group orders by orderId to avoid double counting
    const ordersByDate = {};
    filteredOrders.forEach(order => {
      // Use orderDate if available (for food-only orders), otherwise use showtime
      const orderDate = order.orderDate ? new Date(order.orderDate) : new Date(order.showtime);
      orderDate.setHours(0, 0, 0, 0);
      const dateStr = orderDate.toISOString().split('T')[0];
      const orderId = order.orderId || order.bookingId;
      
      if (daily[dateStr]) {
        if (!ordersByDate[dateStr]) {
          ordersByDate[dateStr] = {};
        }
        // Only count each order once per day
        if (!ordersByDate[dateStr][orderId]) {
          ordersByDate[dateStr][orderId] = order.totalAmount || 0;
          daily[dateStr].revenue += order.totalAmount || 0;
        }
      }
    });
    
    return days.map(d => ({ ...d, revenue: daily[d.date]?.revenue || 0 }));
  }, [filteredOrders]);

  const top5Movies = useMemo(() => {
    return revenueByMovie
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 5)
      .map((movie, idx) => ({ ...movie, rank: idx + 1 }));
  }, [revenueByMovie]);

  // Food Combo Sales - Calculate from actual orders
  const foodComboSales = useMemo(() => {
    console.log('ManagerReports: Calculating foodComboSales from filteredOrders:', filteredOrders.length);
    const comboStats = {};
    const processedOrderIds = new Set(); // Track processed orders to avoid double counting
    
    // Aggregate combo sales from all orders
    filteredOrders.forEach(order => {
      const orderId = order.orderId || order.bookingId;
      
      // Only process each order once to avoid double counting
      // (since one order can have multiple booking records for different showtimes)
      if (!orderId || processedOrderIds.has(orderId)) {
        return;
      }
      processedOrderIds.add(orderId);
      
      // Process combos from this order
      if (order.combos && Array.isArray(order.combos) && order.combos.length > 0) {
        order.combos.forEach(combo => {
          const comboId = combo.comboId || combo.foodComboId || combo.comboName;
          const comboName = combo.comboName || `Combo #${comboId}`;
          const quantity = combo.quantity || 1;
          const price = parseFloat(combo.price) || 0;
          const revenue = price * quantity;
          
          if (!comboStats[comboId]) {
            comboStats[comboId] = {
              id: comboId,
              name: comboName,
              quantity: 0,
              revenue: 0
            };
          }
          
          comboStats[comboId].quantity += quantity;
          comboStats[comboId].revenue += revenue;
        });
      }
    });
    
    const result = Object.values(comboStats).sort((a, b) => b.revenue - a.revenue);
    console.log('ManagerReports: foodComboSales result:', result);
    return result;
  }, [filteredOrders]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  // Debug logging
  useEffect(() => {
    console.log('ManagerReports: Orders loaded:', orders.length);
    console.log('ManagerReports: Scoped orders:', scopedOrders.length);
    console.log('ManagerReports: Filtered orders:', filteredOrders.length);
    console.log('ManagerReports: Summary stats:', summaryStats);
  }, [orders, scopedOrders, filteredOrders, summaryStats]);

  if (loading) {
    return (
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
          <p>Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Thông tin rạp đang quản lý */}
      <div className="admin-card" style={{ background: 'linear-gradient(135deg, rgba(232, 59, 65, 0.1) 0%, rgba(20, 15, 16, 0.8) 100%)' }}>
        <div className="admin-card__content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: '#e83b41',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🎬
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                {managedCinema?.name || 'Cụm rạp'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#c9c4c5' }}>
                Báo cáo doanh thu & hiệu suất
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card__header">
          <h2 className="admin-card__title">Bộ lọc</h2>
        </div>
        <div className="admin-card__content" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '13px', color: '#c9c4c5', whiteSpace: 'nowrap' }}>
              Khoảng thời gian:
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                padding: '6px 10px',
                background: 'rgba(20, 15, 16, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                minWidth: '150px'
              }}
            >
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="90">90 ngày qua</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon" style={{ color: '#4caf50' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="admin-stat-card__content">
            <div className="admin-stat-card__value">{formatPrice(summaryStats.totalRevenue)}</div>
            <div className="admin-stat-card__label">Tổng doanh thu</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__icon" style={{ color: '#2196f3' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div className="admin-stat-card__content">
            <div className="admin-stat-card__value">{formatNumber(summaryStats.totalOrders)}</div>
            <div className="admin-stat-card__label">Tổng đơn</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
        <div className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Doanh thu theo phim</h2>
          </div>
          <div className="admin-card__content">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMovie.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="title" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="#c9c4c5"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#c9c4c5"
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#2d2627', 
                    border: '1px solid #4a3f41',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => formatPrice(value)}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#e83b41" name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Doanh thu theo phòng chiếu</h2>
          </div>
          <div className="admin-card__content">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByTheater}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="name" 
                  stroke="#c9c4c5"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#c9c4c5"
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#2d2627', 
                    border: '1px solid #4a3f41',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => formatPrice(value)}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#2196f3" name="Doanh thu" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
          <div className="admin-card__header">
            <h2 className="admin-card__title">Doanh thu theo ngày (30 ngày qua)</h2>
          </div>
          <div className="admin-card__content">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#c9c4c5"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#c9c4c5"
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#2d2627', 
                    border: '1px solid #4a3f41',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => formatPrice(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#ffd159" 
                  strokeWidth={2}
                  name="Doanh thu"
                  dot={{ fill: '#ffd159', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card__header">
          <h2 className="admin-card__title">Top 5 phim bán chạy</h2>
        </div>
        <div className="admin-card__content">
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Hạng</th>
                  <th>Phim</th>
                  <th>Số vé</th>
                  <th>Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {top5Movies.map((movie) => (
                  <tr key={movie.movieId}>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: movie.rank === 1 ? '#ffd700' : movie.rank === 2 ? '#c0c0c0' : movie.rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        textAlign: 'center',
                        lineHeight: '24px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        {movie.rank}
                      </span>
                    </td>
                    <td>{movie.title}</td>
                    <td>{formatNumber(movie.tickets)}</td>
                    <td style={{ color: '#4caf50', fontWeight: 600 }}>{formatPrice(movie.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Food Combo Sales - Only show if there's data */}
      {foodComboSales && foodComboSales.length > 0 && (
        <div className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">🍿 Doanh số combo đồ ăn</h2>
          </div>
          <div className="admin-card__content">
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Combo</th>
                    <th style={{ textAlign: 'right' }}>SL</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {foodComboSales.map((combo, idx) => (
                    <tr key={combo.id || idx}>
                      <td style={{ fontWeight: 500 }}>{combo.name}</td>
                      <td style={{ textAlign: 'right', color: '#ffd159' }}>{formatNumber(combo.quantity)}</td>
                      <td style={{ textAlign: 'right', color: '#4caf50', fontWeight: 600 }}>{formatPrice(combo.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerReports;