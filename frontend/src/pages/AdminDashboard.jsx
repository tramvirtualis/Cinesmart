import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { movieService } from '../services/movieService';
import { useEnums } from '../hooks/useEnums';
import { enumService } from '../services/enumService';
import { cinemaComplexService } from '../services/cinemaComplexService';
import FoodBeverageManagement from '../components/AdminDashboard/FoodBeverageManagement';
import MovieManagement from '../components/AdminDashboard/MovieManagement';
import CinemaManagement from '../components/AdminDashboard/CinemaManagement';
import UserManagement from '../components/AdminDashboard/UserManagement';
import VoucherManagement from '../components/AdminDashboard/VoucherManagement';
import BookingManagement from '../components/AdminDashboard/BookingManagement';
import Reports from '../components/AdminDashboard/Reports';
import PriceManagement from '../components/AdminDashboard/PriceManagement';
import BannerManagement from '../components/AdminDashboard/BannerManagement';
import ActivityManagement from '../components/AdminDashboard/ActivityManagement';
import ReviewManagement from '../components/AdminDashboard/ReviewManagement';
import AdminShowtimeView from '../components/AdminDashboard/AdminShowtimeView';
import cloudinaryService from '../services/cloudinaryService';

// Add CSS animation for spinner and notification
if (typeof document !== 'undefined') {
  const styleId = 'admin-spinner-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.7;
          transform: scale(1.1);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Provinces list (static data, not from database)
const PROVINCES = [
  'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'An Giang', 'Bà Rịa - Vũng Tàu',
  'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương',
  'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương',
  'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình',
  'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh',
  'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];


function generateSeats(rows, cols) {
  const seats = [];
  const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Calculate walkway positions (every 4-5 seats, and in the middle if cols > 10)
  const walkwayPositions = new Set();
  for (let col = 5; col <= cols; col += 5) {
    walkwayPositions.add(col);
  }
  // Add middle walkway if room is wide enough
  if (cols > 10) {
    const middle = Math.floor(cols / 2);
    walkwayPositions.add(middle);
    walkwayPositions.add(middle + 1);
  }
  
  for (let row = 0; row < rows; row++) {
    for (let col = 1; col <= cols; col++) {
      // Skip walkway columns
      if (walkwayPositions.has(col)) continue;
      
      // Determine seat type based on row position
      let seatType = 'NORMAL';
      if (row < Math.floor(rows * 0.15)) {
        // First ~15% rows are VIP
        seatType = 'VIP';
      } else if (row >= rows - 2 && cols > 12) {
        // Last 2 rows might have couple seats in wide rooms
        // Randomly assign some couple seats (about 20%)
        if (Math.random() < 0.2) {
          seatType = 'COUPLE';
        }
      }
      
      seats.push({
        seatId: `${rowLetters[row]}${col}`,
        row: rowLetters[row],
        column: col,
        type: seatType,
        status: true
      });
    }
  }
  
  return seats;
}

// Sample cinema data
const initialCinemas = [
  {
    complexId: 1,
    name: 'Cinestar Quốc Thanh',
    address: '271 Nguyễn Trãi, Quận 1, TP.HCM',
    rooms: [
      {
        roomId: 1,
        roomName: 'Phòng 1',
        roomType: '2D',
        rows: 10,
        cols: 12,
        seats: generateSeats(10, 12)
      },
      {
        roomId: 2,
        roomName: 'Phòng 2',
        roomType: '3D',
        rows: 8,
        cols: 14,
        seats: generateSeats(8, 14)
      }
    ]
  },
  {
    complexId: 2,
    name: 'Cinestar Hai Bà Trưng',
    address: '135 Hai Bà Trưng, Quận 1, TP.HCM',
    rooms: [
      {
        roomId: 3,
        roomName: 'Phòng 1',
        roomType: '2D',
        rows: 12,
        cols: 15,
        seats: generateSeats(12, 15)
      }
    ]
  }
];

// Sample data
const stats = [
  { label: 'Tổng doanh thu', value: '125.450.000đ', icon: 'money', trend: '+12.5%', color: '#4caf50' },
  { label: 'Tổng vé bán', value: '2.456', icon: 'ticket', trend: '+8.2%', color: '#2196f3' },
  { label: 'Người dùng', value: '1.234', icon: 'users', trend: '+5.1%', color: '#ff9800' },
  { label: 'Phim đang chiếu', value: '24', icon: 'film', trend: '+3', color: '#e83b41' },
];

// Sample movies data
const initialMovies = [
  {
    movieId: 1,
    title: 'Inception',
    genre: 'ACTION',
    duration: 148,
    releaseDate: '2010-07-16',
    ageRating: '13+',
    actor: 'Leonardo DiCaprio, Marion Cotillard, Tom Hardy',
    director: 'Christopher Nolan',
    description: 'A skilled thief is given a chance at redemption if he can perform an impossible task: Inception, planting an idea in someone\'s mind.',
    trailerURL: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
    poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    status: 'NOW_SHOWING',
    languages: ['VIETSUB', 'VIETNAMESE_DUB'],
    formats: ['2D', '3D']
  },
  {
    movieId: 2,
    title: 'Interstellar',
    genre: 'SCI-FI',
    duration: 169,
    releaseDate: '2014-11-07',
    ageRating: '13+',
    actor: 'Matthew McConaughey, Anne Hathaway, Jessica Chastain',
    director: 'Christopher Nolan',
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    trailerURL: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    status: 'NOW_SHOWING',
    languages: ['VIETSUB'],
    formats: ['2D']
  },
  {
    movieId: 3,
    title: 'The Dark Knight',
    genre: 'ACTION',
    duration: 152,
    releaseDate: '2008-07-18',
    ageRating: '16+',
    actor: 'Christian Bale, Heath Ledger, Aaron Eckhart',
    director: 'Christopher Nolan',
    description: 'Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    trailerURL: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    status: 'NOW_SHOWING',
    languages: ['VIETSUB'],
    formats: ['2D']
  },
  {
    movieId: 4,
    title: 'Drive My Car',
    genre: 'DRAMA',
    duration: 179,
    releaseDate: '2021-08-20',
    ageRating: '13+',
    actor: 'Hidetoshi Nishijima, Tōko Miura, Masaki Okada',
    director: 'Ryusuke Hamaguchi',
    description: 'A widowed actor who directs theatre productions embarks on a road trip with a young female chauffeur.',
    trailerURL: 'https://www.youtube.com/watch?v=6BPKPb_RTwI',
    poster: 'https://image.tmdb.org/t/p/w500/lXi2YKI3m30qtX9cB5GPz8b3uaw.jpg',
    status: 'NOW_SHOWING',
    languages: ['VIETSUB'],
    formats: ['2D']
  },
  {
    movieId: 5,
    title: 'Wicked',
    genre: 'FANTASY',
    duration: 165,
    releaseDate: '2024-11-27',
    ageRating: '13+',
    actor: 'Cynthia Erivo, Ariana Grande, Jonathan Bailey',
    director: 'Jon M. Chu',
    description: 'The untold story of the witches of Oz.',
    trailerURL: 'https://www.youtube.com/watch?v=Y5BeTH2c3WA',
    poster: 'https://image.tmdb.org/t/p/w500/9azEue8jX6n8WcN6iYG3PaY5E9R.jpg',
    status: 'COMING_SOON',
    languages: ['VIETSUB'],
    formats: ['2D']
  },
];

const recentBookings = [
  { id: 1, customer: 'Nguyễn Văn A', movie: 'Inception', cinema: 'Cinestar Quốc Thanh', amount: 120000, date: '07/11/2025 19:30' },
  { id: 2, customer: 'Trần Thị B', movie: 'Interstellar', cinema: 'Cinestar Hai Bà Trưng', amount: 180000, date: '08/11/2025 21:00' },
  { id: 3, customer: 'Lê Văn C', movie: 'The Dark Knight', cinema: 'Cinestar Satra Q6', amount: 120000, date: '09/11/2025 20:15' },
  { id: 4, customer: 'Phạm Thị D', movie: 'Drive My Car', cinema: 'Cinestar Quốc Thanh', amount: 150000, date: '10/11/2025 18:45' },
];

const topMovies = [
  { id: 1, title: 'Inception', bookings: 456, revenue: 54720000 },
  { id: 2, title: 'Interstellar', bookings: 389, revenue: 70020000 },
  { id: 3, title: 'The Dark Knight', bookings: 312, revenue: 37440000 },
  { id: 4, title: 'Drive My Car', bookings: 245, revenue: 36750000 },
];

// Sample bookings for booking management
const initialBookingOrders = [
  {
    bookingId: 1001,
    user: { name: 'Nguyễn Văn A', email: 'a@example.com', phone: '0909000001' },
    movieId: 1,
    movieTitle: 'Inception',
    cinemaComplexId: 1,
    cinemaName: 'Cinestar Quốc Thanh',
    roomId: 1,
    roomName: 'Phòng 1',
    showtime: '2025-11-11T19:30:00',
    seats: ['E7', 'E8'],
    pricePerSeat: 120000,
    totalAmount: 240000,
    status: 'PAID', // PAID | CANCELED | REFUNDED
    paymentMethod: 'VNPAY' // VNPAY | MOMO | CASH
  },
  {
    bookingId: 1002,
    user: { name: 'Trần Thị B', email: 'b@example.com', phone: '0909000002' },
    movieId: 2,
    movieTitle: 'Interstellar',
    cinemaComplexId: 2,
    cinemaName: 'Cinestar Hai Bà Trưng',
    roomId: 3,
    roomName: 'Phòng 1',
    showtime: '2025-11-12T21:00:00',
    seats: ['B5'],
    pricePerSeat: 180000,
    totalAmount: 180000,
    status: 'PAID',
    paymentMethod: 'MOMO'
  },
  {
    bookingId: 1003,
    user: { name: 'Lê Văn C', email: 'c@example.com', phone: '0909000003' },
    movieId: 3,
    movieTitle: 'The Dark Knight',
    cinemaComplexId: 1,
    cinemaName: 'Cinestar Quốc Thanh',
    roomId: 2,
    roomName: 'Phòng 2',
    showtime: '2025-11-10T20:15:00',
    seats: ['A1', 'A2', 'A3'],
    pricePerSeat: 120000,
    totalAmount: 360000,
    status: 'REFUNDED',
    paymentMethod: 'CASH'
  },
  {
    bookingId: 1004,
    user: { name: 'Phạm Thị D', email: 'd@example.com', phone: '0909000004' },
    movieId: 4,
    movieTitle: 'Drive My Car',
    cinemaComplexId: 1,
    cinemaName: 'Cinestar Quốc Thanh',
    roomId: 1,
    roomName: 'Phòng 1',
    showtime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    seats: ['F5', 'F6'],
    pricePerSeat: 120000,
    totalAmount: 240000,
    status: 'PAID',
    paymentMethod: 'VNPAY'
  },
  {
    bookingId: 1005,
    user: { name: 'Hoàng Văn E', email: 'e@example.com', phone: '0909000005' },
    movieId: 1,
    movieTitle: 'Inception',
    cinemaComplexId: 2,
    cinemaName: 'Cinestar Hai Bà Trưng',
    roomId: 3,
    roomName: 'Phòng 1',
    showtime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    seats: ['C3', 'C4', 'C5'],
    pricePerSeat: 180000,
    totalAmount: 540000,
    status: 'PAID',
    paymentMethod: 'MOMO'
  },
  {
    bookingId: 1006,
    user: { name: 'Nguyễn Thị F', email: 'f@example.com', phone: '0909000006' },
    movieId: 2,
    movieTitle: 'Interstellar',
    cinemaComplexId: 1,
    cinemaName: 'Cinestar Quốc Thanh',
    roomId: 2,
    roomName: 'Phòng 2',
    showtime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    seats: ['D7'],
    pricePerSeat: 150000,
    totalAmount: 150000,
    status: 'PAID',
    paymentMethod: 'VNPAY'
  },
  {
    bookingId: 1007,
    user: { name: 'Trần Văn G', email: 'g@example.com', phone: '0909000007' },
    movieId: 3,
    movieTitle: 'The Dark Knight',
    cinemaComplexId: 2,
    cinemaName: 'Cinestar Hai Bà Trưng',
    roomId: 3,
    roomName: 'Phòng 1',
    showtime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    seats: ['E9', 'E10'],
    pricePerSeat: 180000,
    totalAmount: 360000,
    status: 'PAID',
    paymentMethod: 'CASH'
  },
  {
    bookingId: 1008,
    user: { name: 'Lê Thị H', email: 'h@example.com', phone: '0909000008' },
    movieId: 1,
    movieTitle: 'Inception',
    cinemaComplexId: 1,
    cinemaName: 'Cinestar Quốc Thanh',
    roomId: 1,
    roomName: 'Phòng 1',
    showtime: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    seats: ['A5', 'A6', 'A7', 'A8'],
    pricePerSeat: 120000,
    totalAmount: 480000,
    status: 'PAID',
    paymentMethod: 'VNPAY'
  },
  {
    bookingId: 1009,
    user: { name: 'Phạm Văn I', email: 'i@example.com', phone: '0909000009' },
    movieId: 4,
    movieTitle: 'Drive My Car',
    cinemaComplexId: 2,
    cinemaName: 'Cinestar Hai Bà Trưng',
    roomId: 3,
    roomName: 'Phòng 1',
    showtime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    seats: ['B8', 'B9'],
    pricePerSeat: 180000,
    totalAmount: 360000,
    status: 'PAID',
    paymentMethod: 'MOMO'
  },
  {
    bookingId: 1010,
    user: { name: 'Hoàng Thị K', email: 'k@example.com', phone: '0909000010' },
    movieId: 2,
    movieTitle: 'Interstellar',
    cinemaComplexId: 1,
    cinemaName: 'Cinestar Quốc Thanh',
    roomId: 2,
    roomName: 'Phòng 2',
    showtime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    seats: ['G3'],
    pricePerSeat: 150000,
    totalAmount: 150000,
    status: 'PAID',
    paymentMethod: 'VNPAY'
  }
];

// Sample price table: price by RoomType x SeatType
const initialPrices = [
  { id: 1, roomType: '2D', seatType: 'NORMAL', price: 90000 },
  { id: 2, roomType: '2D', seatType: 'VIP', price: 120000 },
  { id: 3, roomType: '2D', seatType: 'COUPLE', price: 200000 },
  { id: 4, roomType: '3D', seatType: 'NORMAL', price: 120000 },
  { id: 5, roomType: '3D', seatType: 'VIP', price: 150000 },
  { id: 6, roomType: 'DELUXE', seatType: 'VIP', price: 180000 }
];

// Sample food & beverage items
const initialFoodBeverages = [
  {
    id: 1,
    name: 'Bắp rang bơ',
    category: 'FOOD',
    description: 'Bắp rang bơ thơm ngon, giòn tan',
    price: 45000,
    image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c14?q=80&w=800&auto=format&fit=crop',
    status: 'AVAILABLE'
  },
  {
    id: 2,
    name: 'Coca Cola',
    category: 'BEVERAGE',
    description: 'Nước ngọt có ga Coca Cola 500ml',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=800&auto=format&fit=crop',
    status: 'AVAILABLE'
  },
  {
    id: 3,
    name: 'Combo Phim 2',
    category: 'COMBO',
    description: '1 bắp + 2 nước ngọt',
    price: 110000,
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=800&auto=format&fit=crop',
    status: 'AVAILABLE'
  },
  {
    id: 4,
    name: 'Hot Dog',
    category: 'FOOD',
    description: 'Xúc xích Đức thơm ngon',
    price: 55000,
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?q=80&w=800&auto=format&fit=crop',
    status: 'AVAILABLE'
  },
  {
    id: 5,
    name: 'Pepsi',
    category: 'BEVERAGE',
    description: 'Nước ngọt có ga Pepsi 500ml',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=800&auto=format&fit=crop',
    status: 'AVAILABLE'
  },
  {
    id: 6,
    name: 'Combo Phim 3',
    category: 'COMBO',
    description: '1 bắp + 1 nước + 1 hot dog',
    price: 130000,
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=800&auto=format&fit=crop',
    status: 'AVAILABLE'
  },
  {
    id: 7,
    name: 'Khoai tây chiên',
    category: 'FOOD',
    description: 'Khoai tây chiên giòn, nóng hổi',
    price: 50000,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=800&auto=format&fit=crop',
    status: 'AVAILABLE'
  },
  {
    id: 8,
    name: '7Up',
    category: 'BEVERAGE',
    description: 'Nước ngọt có ga 7Up 500ml',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=800&auto=format&fit=crop',
    status: 'UNAVAILABLE'
  }
];

// Sample vouchers data
const initialVouchers = [
  {
    voucherId: 1,
    code: 'WELCOME10',
    name: 'Chào mừng 10%',
    description: 'Giảm 10% cho đơn đầu tiên',
    discountType: 'PERCENT', // PERCENT | AMOUNT
    discountValue: 10,
    maxDiscount: 30000,
    minOrder: 100000,
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    quantity: 1000,
    status: true,
    isPublic: true, // PUBLIC | PRIVATE
    assignedUserIds: [], // Array of userIds for private vouchers
    image: 'https://images.unsplash.com/photo-1493707553565-03c0f1a3c9a8?q=80&w=800&auto=format&fit=crop'
  },
  {
    voucherId: 2,
    code: 'CINE50K',
    name: 'Giảm 50.000đ',
    description: 'Áp dụng vé xem phim 2D',
    discountType: 'AMOUNT',
    discountValue: 50000,
    maxDiscount: 50000,
    minOrder: 120000,
    startDate: '2025-11-05',
    endDate: '2025-11-30',
    quantity: 300,
    status: true,
    isPublic: true,
    assignedUserIds: [],
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=800&auto=format&fit=crop'
  },
  {
    voucherId: 3,
    code: 'VIP100K',
    name: 'Voucher VIP 100K',
    description: 'Voucher riêng tư cho khách hàng VIP',
    discountType: 'AMOUNT',
    discountValue: 100000,
    maxDiscount: 100000,
    minOrder: 200000,
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    quantity: 50,
    status: true,
    isPublic: false,
    assignedUserIds: [],
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop'
  }
];

// Sample users data
const initialUsers = [
  {
    userId: 1,
    username: 'admin',
    password: '******',
    email: 'admin@cinesmart.vn',
    phone: '0909000001',
    address: '01 Lê Lợi, Quận 1, Hồ Chí Minh',
    status: true,
    role: 'ADMIN'
  },
  {
    userId: 2,
    username: 'manager_qt',
    password: '******',
    email: 'manager.qt@cinesmart.vn',
    phone: '0909000002',
    address: '271 Nguyễn Trãi, Quận 1, Hồ Chí Minh',
    status: true,
    role: 'MANAGER',
    cinemaComplexId: 1
  },
  {
    userId: 3,
    username: 'user_a',
    password: '******',
    email: 'user.a@example.com',
    phone: '0909000003',
    address: 'Hai Bà Trưng, Quận 1, Hồ Chí Minh',
    status: true,
    role: 'USER'
  }
];



export default function AdminDashboard() {
  const navigate = useNavigate();
  const { enums } = useEnums(); // Fetch enums from API
  const [activeSection, setActiveSection] = useState('movies');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [movies, setMovies] = useState(initialMovies);
  const [cinemas, setCinemas] = useState([]);
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [users, setUsers] = useState(initialUsers);
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [orders, setOrders] = useState(initialBookingOrders);
  const [prices, setPrices] = useState(initialPrices);
  const [foodBeverages, setFoodBeverages] = useState(initialFoodBeverages);
  const [banners, setBanners] = useState([]);

  // Kiểm tra role - chỉ ADMIN mới được phép truy cập
  useEffect(() => {
    const checkRole = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          navigate('/signin');
          return;
        }
        const user = JSON.parse(userStr);
        const role = (user.role || '').toString().toUpperCase().trim();
        
        if (role !== 'ADMIN') {
          // Nếu không phải ADMIN, redirect về dashboard tương ứng hoặc home
          if (role === 'MANAGER') {
            navigate('/manager');
          } else if (role === 'CUSTOMER') {
            navigate('/');
          } else {
            navigate('/signin');
          }
        }
      } catch (e) {
        console.error('Error checking role:', e);
        navigate('/signin');
      }
    };
    
    checkRole();
  }, [navigate]);

  // Load cinemas from API
  useEffect(() => {
    const loadCinemas = async () => {
      setLoadingCinemas(true);
      try {
        const result = await cinemaComplexService.getAllCinemaComplexesAdmin();
        if (result.success && result.data) {
          setCinemas(result.data);
        } else {
          console.error('Failed to load cinemas:', result.error);
          setCinemas(initialCinemas); // Fallback to initial data
        }
      } catch (error) {
        console.error('Error loading cinemas:', error);
        setCinemas(initialCinemas); // Fallback to initial data
      } finally {
        setLoadingCinemas(false);
      }
    };
    loadCinemas();
  }, []);

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
      case 'users':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        );
      case 'film':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : 'admin-sidebar--closed'}`}>
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__logo">
            <svg className="admin-logo__icon" width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="adminLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e83b41" stopOpacity="1" />
                  <stop offset="50%" stopColor="#ff5258" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ff6b6b" stopOpacity="1" />
                </linearGradient>
                <filter id="adminLogoGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="18" cy="18" r="17" fill="url(#adminLogoGradient)" filter="url(#adminLogoGlow)" opacity="0.9"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <circle cx="18" cy="18" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
              <rect x="8" y="8" width="20" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <path d="M14 14L22 18L14 22V14Z" fill="rgba(255,255,255,0.95)"/>
              <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.6)"/>
              <circle cx="26" cy="10" r="1.5" fill="rgba(255,255,255,0.6)"/>
              <circle cx="10" cy="26" r="1.5" fill="rgba(255,255,255,0.6)"/>
              <circle cx="26" cy="26" r="1.5" fill="rgba(255,255,255,0.6)"/>
            </svg>
            <span className="admin-logo__text">cinesmart</span>
          </div>
          <button 
            className="admin-sidebar__toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          </button>
        </div>
        <nav className="admin-sidebar__nav">
          <button
            className={`admin-nav-item ${activeSection === 'movies' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('movies')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M7 4v16M17 4v16M2 8h20M2 12h20M2 16h20"/>
            </svg>
            <span>Quản lý phim</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'cinemas' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('cinemas')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Quản lý cụm rạp</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'prices' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('prices')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1v22"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"/>
            </svg>
            <span>Bảng giá</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'bookings' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('bookings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Quản lý đặt vé</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'users' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('users')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Quản lý người dùng</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'vouchers' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('vouchers')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>Quản lý voucher</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'foodbeverages' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('foodbeverages')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span>Đồ ăn & Nước uống</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'banners' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('banners')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
            <span>Quản lý banner</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'reports' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('reports')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>Báo cáo</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'reviews' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('reviews')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M13 8H7"/>
              <path d="M17 12H7"/>
            </svg>
            <span>Quản lý đánh giá</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'showtimes' ? 'admin-nav-item--active' : ''}`}
            onClick={() => setActiveSection('showtimes')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Xem lịch chiếu</span>
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'activities' ? 'admin-nav-item--active' : ''}`}
            onClick={() => {
              setActiveSection('activities');
              setHasNewActivity(false);
            }}
            style={{ position: 'relative' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span>Quản lý hoạt động</span>
            {hasNewActivity && activeSection !== 'activities' && (
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#4CAF50',
                  border: '2px solid #1a1415',
                  boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.3)',
                  animation: 'pulse 2s infinite'
                }}
                title="Có hoạt động mới"
              />
            )}
          </button>
        </nav>
        <div className="admin-sidebar__footer">
          <a href="#home" className="admin-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Về trang chủ</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`admin-main ${!sidebarOpen ? 'admin-main--sidebar-closed' : ''}`}>
        {/* Top Bar */}
        <header className="admin-header">
          <div className="admin-header__left">
            <h1 className="admin-header__title">
              {activeSection === 'movies' && 'Quản lý phim'}
              {activeSection === 'cinemas' && 'Quản lý cụm rạp'}
              {activeSection === 'bookings' && 'Quản lý đặt vé'}
              {activeSection === 'users' && 'Quản lý người dùng'}
              {activeSection === 'reviews' && 'Quản lý đánh giá'}
              {activeSection === 'vouchers' && 'Quản lý voucher'}
              {activeSection === 'foodbeverages' && 'Quản lý đồ ăn & nước uống'}
              {activeSection === 'banners' && 'Quản lý banner'}
              {activeSection === 'activities' && 'Quản lý hoạt động'}
              {activeSection === 'reports' && 'Báo cáo & Thống kê'}
            </h1>
          </div>
          <div className="admin-header__right">
            <div className="admin-header__user">
              <div className="admin-header__user-info">
                <div className="admin-header__user-name">Admin User</div>
                <div className="admin-header__user-role">Quản trị viên</div>
              </div>
              <div className="admin-header__user-avatar">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#4a3f41"/>
                  <circle cx="20" cy="15" r="8" fill="#e6e1e2"/>
                  <path d="M10 30c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#e6e1e2"/>
                </svg>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('jwt');
                window.location.href = '/signin';
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(232, 59, 65, 0.1)',
                border: '1px solid rgba(232, 59, 65, 0.3)',
                color: '#e83b41',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginLeft: '16px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(232, 59, 65, 0.2)';
                e.target.style.borderColor = 'rgba(232, 59, 65, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(232, 59, 65, 0.1)';
                e.target.style.borderColor = 'rgba(232, 59, 65, 0.3)';
              }}
              title="Đăng xuất"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="admin-content">
          {activeSection === 'movies' && (
            <MovieManagement movies={movies} onMoviesChange={setMovies} />
          )}

          {activeSection === 'cinemas' && (
            <CinemaManagement cinemas={cinemas} onCinemasChange={setCinemas} />
          )}

          {activeSection === 'bookings' && (
            <BookingManagement orders={orders} cinemas={cinemas} movies={movies} onOrdersChange={setOrders} />
          )}

          {activeSection === 'users' && (
            <UserManagement users={users} cinemas={cinemas} vouchers={vouchers} onUsersChange={setUsers} onVouchersChange={setVouchers} />
          )}

          {activeSection === 'vouchers' && (
            <VoucherManagement vouchers={vouchers} users={users} onVouchersChange={setVouchers} />
          )}

          {activeSection === 'foodbeverages' && (
            <FoodBeverageManagement items={foodBeverages} onItemsChange={setFoodBeverages} />
          )}

          {activeSection === 'banners' && (
            <BannerManagement banners={banners} onBannersChange={setBanners} />
          )}

              {activeSection === 'prices' && (
                <PriceManagement prices={prices} onPricesChange={setPrices} />
          )}


          {activeSection === 'reviews' && (
            <ReviewManagement />
          )}

          {activeSection === 'activities' && (
            <ActivityManagement onNewActivity={() => setHasNewActivity(true)} />
          )}

          {activeSection === 'showtimes' && (
            <AdminShowtimeView />
          )}

          {activeSection === 'reports' && (
            <Reports 
              orders={orders}
              movies={movies}
              cinemas={cinemas}
              vouchers={vouchers}
              users={users}
            />
          )}
        </main>
      </div>
    </div>
  );
}

