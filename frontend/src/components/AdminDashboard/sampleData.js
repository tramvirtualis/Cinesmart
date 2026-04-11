import { generateSeats } from './utils';

// Sample cinema data
export const initialCinemas = [
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
export const stats = [
  { label: 'Tổng doanh thu', value: '125.450.000đ', icon: 'money', trend: '+12.5%', color: '#4caf50' },
  { label: 'Tổng vé bán', value: '2.456', icon: 'ticket', trend: '+8.2%', color: '#2196f3' },
  { label: 'Người dùng', value: '1.234', icon: 'users', trend: '+5.1%', color: '#ff9800' },
  { label: 'Phim đang chiếu', value: '24', icon: 'film', trend: '+3', color: '#e83b41' },
];

// Sample movies data
export const initialMovies = [
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

export const recentBookings = [
  { id: 1, customer: 'Nguyễn Văn A', movie: 'Inception', cinema: 'Cinestar Quốc Thanh', amount: 120000, date: '07/11/2025 19:30' },
  { id: 2, customer: 'Trần Thị B', movie: 'Interstellar', cinema: 'Cinestar Hai Bà Trưng', amount: 180000, date: '08/11/2025 21:00' },
  { id: 3, customer: 'Lê Văn C', movie: 'The Dark Knight', cinema: 'Cinestar Satra Q6', amount: 120000, date: '09/11/2025 20:15' },
  { id: 4, customer: 'Phạm Thị D', movie: 'Drive My Car', cinema: 'Cinestar Quốc Thanh', amount: 150000, date: '10/11/2025 18:45' },
];

export const topMovies = [
  { id: 1, title: 'Inception', bookings: 456, revenue: 54720000 },
  { id: 2, title: 'Interstellar', bookings: 389, revenue: 70020000 },
  { id: 3, title: 'The Dark Knight', bookings: 312, revenue: 37440000 },
  { id: 4, title: 'Drive My Car', bookings: 245, revenue: 36750000 },
];

// Sample bookings for booking management
export const initialBookingOrders = [
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
    status: 'PAID',
    paymentMethod: 'VNPAY'
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
export const initialPrices = [
  { id: 1, roomType: '2D', seatType: 'NORMAL', price: 90000 },
  { id: 2, roomType: '2D', seatType: 'VIP', price: 120000 },
  { id: 3, roomType: '2D', seatType: 'COUPLE', price: 200000 },
  { id: 4, roomType: '3D', seatType: 'NORMAL', price: 120000 },
  { id: 5, roomType: '3D', seatType: 'VIP', price: 150000 },
  { id: 6, roomType: 'DELUXE', seatType: 'VIP', price: 180000 }
];

// Sample vouchers data
export const initialVouchers = [
  {
    voucherId: 1,
    code: 'WELCOME10',
    name: 'Chào mừng 10%',
    description: 'Giảm 10% cho đơn đầu tiên',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 30000,
    minOrder: 100000,
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    quantity: 1000,
    status: true,
    isPublic: true,
    assignedUserIds: [],
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
export const initialUsers = [
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


