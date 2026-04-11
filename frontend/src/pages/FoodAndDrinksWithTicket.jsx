import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { foodComboService } from '../services/foodComboService.js';

const cinemas = [
  { id: '1', name: 'Quốc Thanh', province: 'TP.HCM' },
  { id: '2', name: 'Hai Bà Trưng', province: 'TP.HCM' },
  { id: '3', name: 'Sinh Viên', province: 'TP.HCM' },
  { id: '4', name: 'Satra Quận 6', province: 'TP.HCM' },
  { id: '5', name: 'Huế', province: 'TP. Huế' },
  { id: '6', name: 'Đà Lạt', province: 'Lâm Đồng' },
  { id: '7', name: 'Mỹ Tho', province: 'Đồng Tháp' },
  { id: '8', name: 'Lâm Đồng', province: 'Đức Trọng' },
  { id: '9', name: 'Kiên Giang', province: 'An Giang' },
];

// Sample food and drinks data
const menuData = {
  '1': {
    foods: [
      {
        id: 'f1',
        name: 'Bắp rang bơ',
        description: 'Bắp rang bơ thơm ngon, giòn tan',
        price: 45000,
        image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&h=300&fit=crop',
        category: 'Đồ ăn'
      },
      {
        id: 'f2',
        name: 'Hotdog',
        description: 'Xúc xích thơm ngon với sốt đặc biệt',
        price: 55000,
        image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
        category: 'Đồ ăn'
      },
      {
        id: 'f3',
        name: 'Khoai tây chiên',
        description: 'Khoai tây chiên giòn, nóng hổi',
        price: 40000,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
        category: 'Đồ ăn'
      },
      {
        id: 'f4',
        name: 'Gà rán',
        description: 'Gà rán giòn, thơm ngon',
        price: 75000,
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop',
        category: 'Đồ ăn'
      }
    ],
    drinks: [
      {
        id: 'd1',
        name: 'Coca Cola',
        description: 'Nước ngọt có ga',
        price: 30000,
        image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop',
        category: 'Nước uống'
      },
      {
        id: 'd2',
        name: 'Pepsi',
        description: 'Nước ngọt có ga',
        price: 30000,
        image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',
        category: 'Nước uống'
      },
      {
        id: 'd3',
        name: 'Nước suối',
        description: 'Nước suối tinh khiết',
        price: 20000,
        image: 'https://images.unsplash.com/photo-1548839140-5a9415c45c59?w=400&h=300&fit=crop',
        category: 'Nước uống'
      },
      {
        id: 'd4',
        name: 'Trà sữa',
        description: 'Trà sữa thơm ngon, đậm đà',
        price: 50000,
        image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=300&fit=crop',
        category: 'Nước uống'
      }
    ],
    combos: [
      {
        id: 'c1',
        name: 'Combo 1: Bắp + Nước',
        description: '1 Bắp rang bơ + 1 Nước ngọt',
        price: 65000,
        image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&h=300&fit=crop',
        category: 'Combo',
        originalPrice: 75000
      },
      {
        id: 'c2',
        name: 'Combo 2: Hotdog + Nước',
        description: '1 Hotdog + 1 Nước ngọt',
        price: 75000,
        image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
        category: 'Combo',
        originalPrice: 85000
      },
      {
        id: 'c3',
        name: 'Combo 3: Gà rán + Khoai tây + Nước',
        description: '1 Gà rán + 1 Khoai tây chiên + 1 Nước ngọt',
        price: 120000,
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop',
        category: 'Combo',
        originalPrice: 145000
      }
    ]
  }
};

// Default menu for other cinemas (same structure)
Object.keys(cinemas).forEach((key, index) => {
  const cinemaId = String(index + 1);
  if (!menuData[cinemaId]) {
    menuData[cinemaId] = menuData['1']; // Use same menu for all cinemas
  }
});

export default function FoodAndDrinksWithTicket() {
  const navigate = useNavigate();
  const [selectedCinema, setSelectedCinema] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [menuItemsFromDB, setMenuItemsFromDB] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Load pending booking from localStorage
  useEffect(() => {
    try {
      const bookingData = localStorage.getItem('pendingBooking');
      if (bookingData) {
        const booking = JSON.parse(bookingData);
        setPendingBooking(booking);
        // Auto-select cinema from booking - always set from booking.cinemaId
        if (booking.cinemaId) {
          // Use cinemaId directly (it's already the complexId from database)
          setSelectedCinema(String(booking.cinemaId));
        }
      } else {
        // If no pending booking, redirect to normal food page
        navigate('/food-drinks');
      }
    } catch (e) {
      console.error('Failed to load pending booking', e);
      navigate('/food-drinks');
    }
  }, [navigate]);

  // Load menu items from database when selectedCinema changes
  useEffect(() => {
    const loadMenuItems = async () => {
      if (!selectedCinema) {
        setMenuItemsFromDB([]);
        return;
      }

      setLoadingMenu(true);
      try {
        const complexId = Number(selectedCinema);
        
        const response = await foodComboService.getFoodCombosByCinemaComplexId(complexId);
        
        if (response.success && response.data) {
          // Map FoodComboResponseDTO to frontend format
          const mappedItems = response.data.map(item => ({
            id: `fc_${item.foodComboId}`,
            name: item.name,
            description: item.description || '',
            price: item.price ? Number(item.price) : 0,
            image: item.image || 'https://via.placeholder.com/400x300?text=No+Image',
            category: 'Đồ ăn' // Default category, có thể thêm field category vào DTO sau
          }));
          
          setMenuItemsFromDB(mappedItems);
        } else {
          console.warn('No menu items found for cinema complex:', complexId);
          setMenuItemsFromDB([]);
        }
      } catch (error) {
        console.error('Error loading menu items:', error);
        setMenuItemsFromDB([]);
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

  // Use menu items from database
  const menuItems = menuItemsFromDB;

  const getItemQuantity = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const addToCart = (item) => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.status === false) {
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
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.status === false) {
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
    // Keep pendingBooking in localStorage for checkout page
    navigate('/checkout');
  };

  const handleSkip = () => {
    // Skip all food items and go to checkout with empty cart
    const cartData = {
      items: [],
      cinema: cinemas.find(c => c.id === selectedCinema),
      totalAmount: 0
    };
    localStorage.setItem('checkoutCart', JSON.stringify(cartData));
    // Keep pendingBooking in localStorage for checkout page
    navigate('/checkout');
  };

  if (!pendingBooking) {
    return null; // Will redirect in useEffect
  }

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
                Đồ ăn nước uống kèm vé
              </h1>
            </div>

            {/* Show booking info */}
            {pendingBooking && (
              <div style={{ 
                background: 'rgba(76, 175, 80, 0.15)', 
                border: '1px solid rgba(76, 175, 80, 0.3)', 
                borderRadius: '12px', 
                padding: '16px', 
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#4caf50', flexShrink: 0 }}>
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: '#fff' }}>
                    Đang đặt kèm vé phim: {pendingBooking.movieTitle}
                  </div>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    {pendingBooking.cinemaName} • {pendingBooking.room?.roomName} • Ghế: {pendingBooking.seats?.join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Menu Display */}
            <div>
              {loadingMenu && (
                <div style={{ marginBottom: '24px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                  Đang tải menu...
                </div>
              )}
              {!loadingMenu && menuItems.length === 0 && selectedCinema && (
                <div style={{ marginBottom: '24px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  Menu của rạp hiện đang được cập nhật. Bạn có thể bỏ qua bước này và tiếp tục thanh toán vé.
                </div>
              )}
              {!loadingMenu && menuItems.length > 0 && (
                <div className="food-menu-grid">
                  {menuItems.map((item) => {
                      const quantity = getItemQuantity(item.id);
                      return (
                        <div key={item.id} className="food-item-card">
                          <div className="food-item-card__image">
                            <img src={item.image} alt={item.name} />
                            {item.category === 'Combo' && item.originalPrice && (
                              <div className="food-item-card__badge">
                                <span className="food-item-card__badge-text">Tiết kiệm</span>
                              </div>
                            )}
                          </div>
                          <div className="food-item-card__content">
                            <div className="food-item-card__category">{item.category}</div>
                            <h3 className="food-item-card__title">{item.name}</h3>
                            <p className="food-item-card__description">{item.description}</p>
                            <div className="food-item-card__footer">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                {item.originalPrice && (
                                  <div className="food-item-card__price-old">
                                    {formatPrice(item.originalPrice)}
                                  </div>
                                )}
                                <div className="food-item-card__price">
                                  {formatPrice(item.price)}
                                  {item.priceWithTicket && (
                                    <span style={{ fontSize: '11px', color: '#4caf50', marginLeft: '4px', fontWeight: 600 }}>
                                      (Kèm vé)
                                    </span>
                                  )}
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
                                  disabled={quantity === 0}
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
                                  onClick={() => updateItemQuantity(item, quantity + 1)}
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
              
              {/* Skip Button - Always visible */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', marginBottom: '32px' }}>
                <button
                  className="btn btn--primary"
                  onClick={handleSkip}
                  style={{ 
                    padding: '14px 32px', 
                    minWidth: '200px', 
                    fontSize: '16px', 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  {menuItems.length === 0 ? 'Tiếp tục không mua đồ ăn' : 'Bỏ qua đồ ăn'}
                </button>
              </div>
            </div>

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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                      }}
                    >
                      Tiếp tục đến thanh toán
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

