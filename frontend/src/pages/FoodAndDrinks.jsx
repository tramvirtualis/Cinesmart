import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { cinemaComplexService } from '../services/cinemaComplexService';
import '../styles/pages/food-drinks.css';
import '../styles/components/food-item-card.css';
import '../styles/components/food-cart-modal.css';
import '../styles/components/food-cinema-selector.css';

export default function FoodAndDrinks() {
  const navigate = useNavigate();
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  
  // Check if user is blocked
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setIsBlocked(storedUser.status === false);
  }, []);

  // Load cinemas from API
  useEffect(() => {
    const loadCinemas = async () => {
      setLoadingCinemas(true);
      try {
        const result = await cinemaComplexService.getAllCinemaComplexes();
        if (result.success && result.data) {
          const mappedCinemas = result.data.map(cinema => ({
            id: String(cinema.complexId),
            complexId: cinema.complexId,
            name: cinema.name,
            province: cinema.addressProvince || ''
          }));
          setCinemas(mappedCinemas);
        } else {
          console.error('Failed to load cinemas:', result.error);
          setCinemas([]);
        }
      } catch (error) {
        console.error('Error loading cinemas:', error);
        setCinemas([]);
      } finally {
        setLoadingCinemas(false);
      }
    };
    loadCinemas();
  }, []);

  // Load menu items when cinema is selected
  useEffect(() => {
    const loadMenuItems = async () => {
      if (!selectedCinema) {
        setMenuItems([]);
        return;
      }

      setLoadingMenu(true);
      try {
        const complexId = Number(selectedCinema);
        const response = await fetch(`http://localhost:8080/api/public/menu/complex/${complexId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          // Map backend data to frontend format
          const mappedItems = (result.data || []).map(item => ({
            id: String(item.foodComboId),
            foodComboId: item.foodComboId,
            name: item.name || 'Món ăn',
            description: item.description || 'Món ăn thơm ngon',
            price: item.price ? Number(item.price) : 0,
            image: item.image || 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&h=300&fit=crop'
          }));
          setMenuItems(mappedItems);
        } else {
          console.error('Failed to load menu:', result.message);
          setMenuItems([]);
        }
      } catch (error) {
        console.error('Error loading menu:', error);
        setMenuItems([]);
      } finally {
        setLoadingMenu(false);
      }
    };
    loadMenuItems();
  }, [selectedCinema]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };


  const getItemQuantity = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const addToCart = (item) => {
    if (isBlocked) {
      setShowBlockedModal(true);
      return;
    }
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateItemQuantity = (item, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(cartItem => cartItem.id !== item.id));
    } else {
      const existingItem = cart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        setCart(cart.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        ));
      } else {
        setCart([...cart, { ...item, quantity: newQuantity }]);
      }
    }
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else {
      setCart(cart.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = () => {
    if (isBlocked) {
      setShowBlockedModal(true);
      return;
    }
    // Save cart to localStorage and navigate to checkout
    const cartData = {
      items: cart,
      cinema: cinemas.find(c => c.id === selectedCinema),
      totalAmount: getTotalAmount()
    };
    localStorage.setItem('checkoutCart', JSON.stringify(cartData));
    // Xóa pendingBooking vì đây là đơn hàng chỉ có đồ ăn (không có vé phim)
    localStorage.removeItem('pendingBooking');
    // Navigate to checkout page
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159' }}>
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                <path d="M7 2v20"/>
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v0"/>
                <path d="M21 15v7"/>
                <path d="M3 15v7"/>
              </svg>
              <h1 className="section__title" style={{ fontSize: 'clamp(28px, 4vw, 36px)', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Đồ ăn nước uống
              </h1>
            </div>

            {/* Cinema Selection */}
            <div className="food-cinema-selector" style={{ marginBottom: '32px' }}>
              <label htmlFor="cinema-select" style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#fff' 
              }}>
                Chọn rạp
              </label>
              <select
                id="cinema-select"
                value={selectedCinema}
                onChange={(e) => setSelectedCinema(e.target.value)}
                className="food-cinema-select"
                disabled={loadingCinemas}
              >
                <option value="">-- Chọn rạp --</option>
                {cinemas.map((cinema) => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name} {cinema.province && `(${cinema.province})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Menu Display */}
            {selectedCinema && (
              <>
                {/* Menu Items Grid */}
                {loadingMenu ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    color: '#c9c4c5'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid rgba(232, 59, 65, 0.3)',
                      borderTop: '4px solid #e83b41',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }}></div>
                    <p style={{ fontSize: '16px', margin: 0 }}>Đang tải menu của rạp...</p>
                  </div>
                ) : menuItems.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    color: '#c9c4c5'
                  }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 20px', opacity: 0.5 }}>
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                      <path d="M7 2v20"/>
                      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v0"/>
                    </svg>
                    <p style={{ fontSize: '16px', margin: 0 }}>Không có món nào trong mục này</p>
                  </div>
                ) : (
                  <div className="food-menu-grid">
                    {menuItems.map((item) => {
                      const quantity = getItemQuantity(item.id);
                      return (
                        <div key={item.id} className="food-item-card">
                          <div className="food-item-card__image">
                            <img 
                              src={item.image || 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&h=300&fit=crop'} 
                              alt={item.name}
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&h=300&fit=crop';
                              }}
                            />
                          </div>
                          <div className="food-item-card__content">
                            <h3 className="food-item-card__title">{item.name}</h3>
                            <p className="food-item-card__description">{item.description || 'Món ăn thơm ngon'}</p>
                            <div className="food-item-card__footer">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <div className="food-item-card__price">
                                  {formatPrice(item.price)}
                                </div>
                              </div>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: quantity > 0 ? 'rgba(123, 97, 255, 0.2)' : 'rgba(123, 97, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '4px',
                                border: quantity > 0 ? '1px solid rgba(123, 97, 255, 0.4)' : '1px solid rgba(123, 97, 255, 0.2)',
                                minWidth: '100px',
                                justifyContent: 'center'
                              }}>
                                <button
                                  onClick={() => updateItemQuantity(item, quantity - 1)}
                                  disabled={quantity === 0 || isBlocked}
                                  style={{
                                    background: quantity > 0 ? 'rgba(123, 97, 255, 0.4)' : 'rgba(123, 97, 255, 0.2)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: quantity > 0 ? 'pointer' : 'not-allowed',
                                    color: quantity > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    opacity: quantity > 0 ? 1 : 0.5
                                  }}
                                  onMouseEnter={(e) => {
                                    if (quantity > 0) {
                                      e.currentTarget.style.background = 'rgba(123, 97, 255, 0.6)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (quantity > 0) {
                                      e.currentTarget.style.background = 'rgba(123, 97, 255, 0.4)';
                                    }
                                  }}
                                >
                                  -
                                </button>
                                <span style={{
                                  minWidth: '36px',
                                  textAlign: 'center',
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  color: quantity > 0 ? '#fff' : 'rgba(255,255,255,0.6)'
                                }}>
                                  {quantity}
                                </span>
                                <button
                                  onClick={() => {
                                    if (isBlocked) {
                                      setShowBlockedModal(true);
                                      return;
                                    }
                                    updateItemQuantity(item, quantity + 1);
                                  }}
                                  disabled={isBlocked}
                                  style={{
                                    background: 'rgba(123, 97, 255, 0.4)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(123, 97, 255, 0.6)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(123, 97, 255, 0.4)';
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Empty State - No Cinema Selected */}
            {!selectedCinema && (
              <div style={{ 
                textAlign: 'center', 
                padding: '80px 20px',
                color: '#c9c4c5'
              }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 24px', opacity: 0.4 }}>
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
                  <path d="M7 2v20"/>
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v0"/>
                  <path d="M21 15v7"/>
                  <path d="M3 15v7"/>
                </svg>
                <p style={{ fontSize: '18px', margin: 0, fontWeight: 500 }}>Vui lòng chọn rạp để xem menu</p>
                <p style={{ fontSize: '14px', margin: '8px 0 0', opacity: 0.7 }}>Chọn rạp ở trên để xem các món ăn và thức uống có sẵn</p>
              </div>
            )}

            {/* Floating Cart Button */}
            {cart.length > 0 && (
              <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 1000
              }}>
                <button
                  onClick={() => setShowCart(true)}
                  style={{
                    background: 'linear-gradient(135deg, #7b61ff 0%, #6b51e8 100%)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(123, 97, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(123, 97, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(123, 97, 255, 0.4)';
                  }}
                >
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    {cart.length > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#e83b41',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <span>Giỏ hàng</span>
                    <span style={{ fontSize: '14px', opacity: 0.9 }}>
                      {formatPrice(getTotalAmount())}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Cart Modal */}
      {showCart && (
        <div className="food-cart-overlay" onClick={() => setShowCart(false)}>
          <div className="food-cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="food-cart-modal__header">
              <h2>Giỏ hàng</h2>
              <button className="food-cart-modal__close" onClick={() => setShowCart(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="food-cart-modal__content">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#c9c4c5' }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 20px', opacity: 0.5 }}>
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <p style={{ fontSize: '16px', margin: 0 }}>Giỏ hàng trống</p>
                </div>
              ) : (
                <>
                  <div className="food-cart-items">
                    {cart.map((item) => (
                      <div key={item.id} className="food-cart-item">
                        <div className="food-cart-item__image">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div className="food-cart-item__content">
                          <h3 className="food-cart-item__title">{item.name}</h3>
                          <div className="food-cart-item__price">{formatPrice(item.price)}</div>
                        </div>
                        <div className="food-cart-item__quantity">
                          <button 
                            className="food-cart-item__qty-btn"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="food-cart-item__qty-input"
                          />
                          <button 
                            className="food-cart-item__qty-btn"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <div className="food-cart-item__total">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                        <button 
                          className="food-cart-item__remove"
                          onClick={() => removeFromCart(item.id)}
                          title="Xóa"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="food-cart-modal__footer">
                    <div className="food-cart-modal__total">
                      <span>Tổng cộng:</span>
                      <span className="food-cart-modal__total-amount">{formatPrice(getTotalAmount())}</span>
                    </div>
                    <button 
                      className="btn btn--primary food-cart-checkout-btn" 
                      onClick={handleCheckout}
                      disabled={isBlocked}
                      style={isBlocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      Đặt hàng
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        onConfirm={() => setShowBlockedModal(false)}
        title="Tài khoản bị chặn"
        message="Tài khoản của bạn đã bị chặn. Bạn không thể đặt đồ ăn. Vui lòng liên hệ quản trị viên để được hỗ trợ."
        confirmText="Đã hiểu"
        type="alert"
        confirmButtonStyle="primary"
      />

      <Footer />
    </div>
  );
}

