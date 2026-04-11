import React, { useMemo } from 'react';

// Manager Dashboard View Component (read-only stats)
function ManagerDashboardView({ orders, movies, cinemas, managerComplexIds }) {
  const scopedOrders = useMemo(() => {
    return (orders || []).filter(order => managerComplexIds.includes(order.cinemaComplexId));
  }, [orders, managerComplexIds]);

  const stats = useMemo(() => {
    const totalRevenue = scopedOrders
      .filter(o => o.status === 'PAID')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalTickets = scopedOrders
      .filter(o => o.status === 'PAID')
      .reduce((sum, order) => sum + (order.seats?.length || 0), 0);
    const activeMovies = (movies || []).filter(m => m.status === 'NOW_SHOWING').length;
    const totalBookings = scopedOrders.length;

    return [
      { label: 'Tổng doanh thu', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue), icon: 'money', color: '#4caf50' },
      { label: 'Tổng vé bán', value: totalTickets.toString(), icon: 'ticket', color: '#2196f3' },
      { label: 'Phim đang chiếu', value: activeMovies.toString(), icon: 'film', color: '#ff9800' },
      { label: 'Tổng đơn đặt', value: totalBookings.toString(), icon: 'bookings', color: '#e83b41' },
    ];
  }, [scopedOrders, movies]);

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'money':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        );
      case 'ticket':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9z"/>
            <path d="M6 9v6M18 9v6"/>
          </svg>
        );
      case 'film':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/>
          </svg>
        );
      case 'bookings':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const recentBookings = useMemo(() => {
    return scopedOrders
      .filter(o => o.status === 'PAID')
      .slice(0, 5)
      .map(order => ({
        id: order.bookingId,
        customer: order.user?.name || 'Unknown',
        movie: order.movieTitle,
        cinema: order.cinemaName,
        amount: order.totalAmount,
        date: new Date(order.showtime).toLocaleString('vi-VN')
      }));
  }, [scopedOrders]);

  return (
    <div>
      <div className="admin-stats-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="admin-stat-card">
            <div className="admin-stat-card__icon" style={{ color: stat.color }}>
              {getIcon(stat.icon)}
            </div>
            <div className="admin-stat-card__content">
              <div className="admin-stat-card__value">{stat.value}</div>
              <div className="admin-stat-card__label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-card">
          <div className="admin-card__header">
            <h2 className="admin-card__title">Đặt vé gần đây</h2>
          </div>
          <div className="admin-card__content">
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Phim</th>
                    <th>Rạp</th>
                    <th>Số tiền</th>
                    <th>Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length > 0 ? (
                    recentBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.customer}</td>
                        <td>{booking.movie}</td>
                        <td>{booking.cinema}</td>
                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.amount)}</td>
                        <td>{booking.date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#c9c4c5', padding: '20px' }}>
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagerDashboardView;


