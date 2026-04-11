import { generateSeats } from '../AdminDashboard/utils';

// Movies sample used when creating showtimes (id + duration)
export const SAMPLE_MOVIES = [
  { movieId: 1, title: 'Inception', duration: 148, formats: ['2D','3D'], languages: ['VIETSUB','VIETNAMESE_DUB'] },
  { movieId: 2, title: 'Interstellar', duration: 169, formats: ['2D'], languages: ['VIETSUB'] },
  { movieId: 3, title: 'The Dark Knight', duration: 152, formats: ['2D'], languages: ['VIETSUB'] },
  { movieId: 4, title: 'Drive My Car', duration: 179, formats: ['2D'], languages: ['VIETSUB'] }
];

// Full movies data for viewing
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

// Sample bookings for booking management (will be filtered by managerComplexIds)
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

// Same sample with a couple of complexes; manager will be filtered against these IDs
export const SAMPLE_CINEMAS = [
  {
    complexId: 1,
    name: 'Cinestar Quốc Thanh',
    address: '271 Nguyễn Trãi, Quận 1, TP.HCM',
    rooms: [
      { roomId: 1, roomName: 'Phòng 1', roomType: '2D', rows: 10, cols: 12, seats: generateSeats(10, 12), showtimes: [] },
      { roomId: 2, roomName: 'Phòng 2', roomType: '3D', rows: 8, cols: 14, seats: generateSeats(8, 14), showtimes: [] }
    ]
  },
  {
    complexId: 2,
    name: 'Cinestar Hai Bà Trưng',
    address: '135 Hai Bà Trưng, Quận 1, TP.HCM',
    rooms: [
      { roomId: 3, roomName: 'Phòng 1', roomType: '2D', rows: 12, cols: 15, seats: generateSeats(12, 15), showtimes: [] }
    ]
  },
  {
    complexId: 3,
    name: 'Cinestar Satra Q6',
    address: 'C6/27 Phạm Hùng, Bình Chánh, TP.HCM',
    rooms: [
      { roomId: 4, roomName: 'Phòng 1', roomType: 'DELUXE', rows: 9, cols: 16, seats: generateSeats(9, 16), showtimes: [] }
    ]
  }
];


