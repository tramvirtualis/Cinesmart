import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TicketModal = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const displayOrderId = order.orderId || (order.rawOrderId ? `ORD-${order.rawOrderId}` : '');
  const numericOrderId = order.rawOrderId || (displayOrderId ? displayOrderId.replace('ORD-', '') : '');

  // Xác định loại đơn hàng
  const hasTickets = order.items && order.items.length > 0;
  const hasCombos = order.foodItems && order.foodItems.length > 0;

  // Xác định header theo loại đơn hàng
  const getHeaderTitle = () => {
    if (hasTickets && hasCombos) {
      return 'VÉ XEM PHIM & ĐỒ ĂN';
    } else if (hasTickets) {
      return 'VÉ XEM PHIM';
    } else {
      return 'ĐƠN HÀNG ĐỒ ĂN';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Map room type format (giống backend: roomType.name().replace("TYPE_", ""))
  const mapRoomType = (roomType) => {
    if (!roomType) return '2D';
    // Chuyển đổi từ TYPE_2D, TYPE_3D, etc. thành 2D, 3D (giống backend)
    return roomType.replace('TYPE_', '');
  };

  // Tạo booking ID cho QR code (giống backend format: orderId-showtimeId-yyyy-MM-dd'T'HH:mm:ss)
  const createBookingId = (orderId, showtimeId, showtimeStart) => {
    if (!showtimeStart || !showtimeId) {
      // Fallback nếu không có đủ thông tin
      return showtimeId ? `${orderId}-${showtimeId}-${Date.now()}` : `${orderId}-${Date.now()}`;
    }
    const date = new Date(showtimeStart);
    // Format: yyyy-MM-dd'T'HH:mm:ss (giống backend DateTimeFormatter)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    return `${orderId}-${showtimeId}-${formattedDate}`;
  };

  return (
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
          onClose();
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
          padding: '30px 24px',
          borderRadius: '16px 16px 0 0',
          color: '#fff',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
            {getHeaderTitle()}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Cinesmart Cinema
          </div>
        </div>

        {/* Ticket Content */}
        <div style={{ padding: '24px' }}>
          {/* Order Info */}
          <div style={{
            backgroundColor: '#f9f9f9',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#333'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Mã đơn hàng:</strong> {displayOrderId}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Ngày đặt:</strong> {formatDateTime(order.orderDate)}
            </div>
            <div>
              <strong>Tổng tiền:</strong> {formatPrice(order.totalAmount)}
            </div>
          </div>

          {/* Tickets Section */}
          {hasTickets && order.items && order.items.map((item, index) => {
            const orderIdNum = numericOrderId;
            const showtimeId = item.showtime?.showtimeId;
            const showtimeStart = item.showtime?.startTime || item.showtime?.start;
            const bookingId = createBookingId(orderIdNum, showtimeId, showtimeStart);
            
            // Format date và time giống backend (dd/MM/yyyy và HH:mm)
            const formatDateForQR = (dateString) => {
              if (!dateString) return '';
              const date = new Date(dateString);
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            };
            
            const formatTimeForQR = (dateString) => {
              if (!dateString) return '';
              const date = new Date(dateString);
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              return `${hours}:${minutes}`;
            };
            
            // Tạo QR data với format giống backend (thứ tự: bookingId, orderId, movie, cinema, date, time, seats, format)
            const sortedSeats = [...(item.seats || [])].sort();
            
            // Tạo object với thứ tự CHÍNH XÁC giống backend
            const qrData = {};
            qrData.bookingId = String(bookingId || '');
            qrData.orderId = String(orderIdNum || '');
            qrData.movie = String(item.movie?.title || '');
            qrData.cinema = String(item.cinema || '');
            qrData.date = formatDateForQR(showtimeStart);
            qrData.time = formatTimeForQR(showtimeStart);
            qrData.seats = sortedSeats; // Array
            qrData.format = mapRoomType(item.showtime.format);
            
            // Log để debug
            console.log('=== TicketModal QR Code Data ===');
            console.log('JSON:', JSON.stringify(qrData));
            console.log('================================');

            return (
              <div key={item.id || index} style={{
                marginBottom: '30px',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                {/* Movie Info */}
                <div style={{
                  backgroundColor: '#2a2a2a',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#ffffff'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    margin: '0 0 8px 0',
                    color: '#ffffff'
                  }}>
                    {item.movie.title}
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: '#cccccc',
                    margin: 0
                  }}>
                    {item.cinema}
                  </p>
                </div>

                {/* Ticket Details */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#555', fontWeight: 600, marginBottom: '4px' }}>
                        Ngày chiếu
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>
                        {item.showtime.date}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#555', fontWeight: 600, marginBottom: '4px' }}>
                        Giờ chiếu
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>
                        {item.showtime.time}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#555', fontWeight: 600, marginBottom: '4px' }}>
                        Định dạng
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>
                        {mapRoomType(item.showtime.format)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#555', fontWeight: 600, marginBottom: '4px' }}>
                        Ghế
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#000' }}>
                        {item.seats.join(', ')}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '13px', color: '#555', fontWeight: 600, marginBottom: '4px' }}>
                        Tổng tiền
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#e83b41' }}>
                        {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderTop: '2px dashed #ddd'
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
                      value={JSON.stringify(qrData)}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '12px', fontWeight: 500 }}>
                    Booking ID: {bookingId}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  padding: '16px 24px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '0 0 12px 12px',
                  fontSize: '13px',
                  color: '#333',
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    Ngày đặt: {formatDate(order.orderDate)}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
                    Vui lòng đến rạp trước giờ chiếu 15 phút
                  </div>
                </div>
              </div>
            );
          })}

          {/* Food Section */}
          {hasCombos && order.foodItems && (
            <div style={{
              marginTop: hasTickets ? '20px' : '0',
              padding: '20px',
              backgroundColor: '#fefef2',
              borderRadius: '8px',
              borderLeft: '4px solid #fbbf24'
            }}>
              <h3 style={{
                marginTop: 0,
                marginBottom: '12px',
                fontSize: '16px',
                color: '#333',
                fontWeight: 700
              }}>
                🍿 Đồ ăn & Nước uống
              </h3>
              
              {/* Hiển thị cụm rạp cho đơn đồ ăn */}
              {!hasTickets && order.cinemaName && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  borderRadius: '6px',
                  borderLeft: '3px solid #fbbf24',
                  fontSize: '14px',
                  color: '#333'
                }}>
                  <span style={{ fontWeight: 600, color: '#555' }}>Cụm rạp:</span> {order.cinemaName}
                </div>
              )}
              
              {order.foodItems.map((foodItem, index) => (
                <div key={foodItem.id || index} style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  borderLeft: '3px solid #fbbf24',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  <div style={{
                    fontWeight: 600,
                    color: '#333',
                    marginBottom: '4px'
                  }}>
                    {foodItem.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    Số lượng: {foodItem.quantity} | Đơn giá: {formatPrice((foodItem.totalPrice || foodItem.price) / (foodItem.quantity || 1))} | Thành tiền: {formatPrice(foodItem.totalPrice || foodItem.price)}
                  </div>
                </div>
              ))}

              {/* QR Code for food-only orders */}
              {!hasTickets && (
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '2px dashed #ddd',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#333',
                    marginBottom: '12px',
                    fontWeight: 600
                  }}>
                    Mã QR Code - Vui lòng quét tại rạp
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '12px'
                  }}>
                    <QRCodeSVG
                      value={JSON.stringify({
                        orderId: String(order.rawOrderId || numericOrderId || '').replace('ORD-', ''),
                        type: 'FOOD_ORDER',
                        orderDate: formatDate(order.orderDate),
                        totalAmount: String(order.totalAmount || '0'),
                        foodItems: order.foodItems.map(item => {
                          // Parse comboId from id (format: "f{comboId}") or use comboId directly
                          let comboId = item.comboId;
                          if (!comboId && item.id) {
                            const idStr = String(item.id);
                            comboId = idStr.startsWith('f') ? idStr.substring(1) : idStr;
                          }
                          // totalPrice là tổng tiền (đã nhân quantity), price là fallback
                          const totalPrice = item.totalPrice || item.price || 0;
                          return {
                            foodComboId: String(comboId || ''),
                            name: String(item.comboName || item.name || ''),
                            quantity: item.quantity || 0,
                            price: String(totalPrice)
                          };
                        })
                      })}
                      size={200}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#555',
                    fontWeight: 500
                  }}>
                    Order ID: {order.orderId}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <button
            className="btn btn--primary"
            onClick={() => {
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
            onClick={onClose}
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
  );
};

export default TicketModal;

