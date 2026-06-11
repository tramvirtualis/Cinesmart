import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import AgeConfirmationModal from '../components/AgeConfirmationModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { cinemaRoomService, isPanoramaEnabled } from '../services/cinemaRoomService';
import showtimeService from '../services/showtimeService';
import { movieService } from '../services/movieService';
import { cinemaComplexService } from '../services/cinemaComplexService';
import { websocketService } from '../services/websocketService';
import Seat360Modal from '../features/seat360/components/Seat360Modal';
import { hasPanoramaForSeat, loadPanoramaManifest } from '../features/seat360/services/panoramaLoader';
import { useSeat360Store } from '../features/seat360/store/seat360Store';
import { getSeatsForRow } from '../components/AdminDashboard/utils';

// Generate seats for a room
function generateSeats(rows, cols) {
  const seats = [];
  const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const walkwayPositions = new Set();
  for (let col = 5; col <= cols; col += 5) {
    walkwayPositions.add(col);
  }
  if (cols > 10) {
    const middle = Math.floor(cols / 2);
    walkwayPositions.add(middle);
    walkwayPositions.add(middle + 1);
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 1; col <= cols; col++) {
      if (walkwayPositions.has(col)) continue;

      let seatType = 'NORMAL';
      if (row < Math.floor(rows * 0.15)) {
        seatType = 'VIP';
      } else if (row >= rows - 2 && cols > 12) {
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

// Sample data - would come from API/database
const SEAT_TYPES = ['NORMAL', 'VIP', 'COUPLE'];
const ROOM_TYPES = ['2D', '3D', 'DELUXE'];

// Sample movies
const movies = [
  { movieId: 1, title: 'Inception', poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', rating: 'T16' },
  { movieId: 2, title: 'Interstellar', poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', rating: 'T13' },
  { movieId: 3, title: 'The Dark Knight', poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', rating: 'T16' },
];

// Sample cinemas with rooms
const cinemas = [
  {
    complexId: 1,
    name: 'Cinestar Quốc Thanh',
    province: 'Hồ Chí Minh',
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
    province: 'Hồ Chí Minh',
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

// Sample showtimes
const showtimes = [
  { showtimeId: 1, movieId: 1, roomId: 1, startTime: '2025-11-15T19:30:00', endTime: '2025-11-15T22:00:00' },
  { showtimeId: 2, movieId: 1, roomId: 2, startTime: '2025-11-15T20:00:00', endTime: '2025-11-15T22:30:00' },
  { showtimeId: 3, movieId: 2, roomId: 3, startTime: '2025-11-15T21:00:00', endTime: '2025-11-15T23:50:00' },
];

// Sample prices
const prices = [
  { roomType: '2D', seatType: 'NORMAL', price: 90000 },
  { roomType: '2D', seatType: 'VIP', price: 120000 },
  { roomType: '2D', seatType: 'COUPLE', price: 200000 },
  { roomType: '3D', seatType: 'NORMAL', price: 120000 },
  { roomType: '3D', seatType: 'VIP', price: 150000 },
  { roomType: 'DELUXE', seatType: 'VIP', price: 180000 }
];

// Sample booked seats (from existing orders)
const bookedSeats = [
  { showtimeId: 1, seatId: 'A5' },
  { showtimeId: 1, seatId: 'A6' },
  { showtimeId: 1, seatId: 'E7' },
  { showtimeId: 1, seatId: 'E8' },
  { showtimeId: 2, seatId: 'B5' },
];

export default function BookTicket() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const navType = useNavigationType();
  
  // Check if user is blocked
  const [isUserBlocked, setIsUserBlocked] = useState(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      // Only block if status is explicitly false
      const blocked = storedUser.status === false;
      return blocked;
    } catch (e) {
      console.error('[BookTicket] Error checking user status:', e);
      return false;
    }
  });
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  
  useEffect(() => {
    if (isUserBlocked) {
      setShowBlockedModal(true);
    }
  }, [isUserBlocked]);

  // Force reload on back navigation to ensure fresh state
  // Use sessionStorage with timeout to handle Strict Mode and prevent infinite loops
  useEffect(() => {
    if (navType === 'POP') {
      const justReloaded = sessionStorage.getItem('just_reloaded');

      if (justReloaded) {
        // We just reloaded. Clear the flag after a short delay to handle Strict Mode double-mount
        const timer = setTimeout(() => {
          sessionStorage.removeItem('just_reloaded');
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        sessionStorage.setItem('just_reloaded', 'true');
        window.location.reload();
      }
    } else {
      // If not POP, ensure flag is clear
      sessionStorage.removeItem('just_reloaded');
    }
  }, [navType]);

  // Read parameters from URL
  const movieIdFromUrl = searchParams.get('movieId');
  const cinemaIdFromUrl = searchParams.get('cinemaId');
  const showtimeFromUrl = searchParams.get('showtime');
  const dateFromUrl = searchParams.get('date');
  const formatFromUrl = searchParams.get('format');
  const cinemaNameFromUrl = searchParams.get('cinemaName');
  const showtimeIdFromUrl = searchParams.get('showtimeId'); // Get showtimeId directly

  const [selectedMovie, setSelectedMovie] = useState(movieIdFromUrl || '');
  const [selectedCinema, setSelectedCinema] = useState(cinemaIdFromUrl || '');
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: 'Nguyễn Văn A',
    phone: '0909000001',
    email: 'nguyenvana@example.com'
  });
  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [step, setStep] = useState((movieIdFromUrl && cinemaIdFromUrl && showtimeFromUrl) || showtimeIdFromUrl ? 2 : 1); // Start at step 2 if params exist or showtimeId is provided
  const [showAgeConfirmModal, setShowAgeConfirmModal] = useState(false);
  const [pendingShowtime, setPendingShowtime] = useState(null);
  const [roomData, setRoomData] = useState(null); // Room data from database
  const [bookedSeatIds, setBookedSeatIds] = useState(new Set()); // Booked seat IDs from database
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [movieData, setMovieData] = useState(null); // Movie data from database
  const [cinemaData, setCinemaData] = useState(null); // Cinema data from database
  const [pricesData, setPricesData] = useState([]); // Prices from database

  // Load movie, cinema, and prices from database
  useEffect(() => {
    const loadData = async () => {
      // Load movie if movieId exists
      if (movieIdFromUrl || selectedMovie) {
        const movieId = movieIdFromUrl || selectedMovie;
        try {
          const movieResult = await movieService.getPublicMovieById(Number(movieId));
          if (movieResult.success && movieResult.data) {
            setMovieData(movieResult.data);
          }
        } catch (error) {
          console.error('Error loading movie:', error);
        }
      }

      // Load cinema if cinemaId exists
      if (cinemaIdFromUrl || selectedCinema) {
        const cinemaId = cinemaIdFromUrl || selectedCinema;
        try {
          const cinemaResult = await cinemaComplexService.getPublicCinemaComplexById(Number(cinemaId));
          if (cinemaResult.success && cinemaResult.data) {
            setCinemaData(cinemaResult.data);
          }
        } catch (error) {
          console.error('Error loading cinema:', error);
        }
      }

      // Load prices
      try {
        const response = await fetch('http://localhost:8080/api/public/prices');
        const result = await response.json();
        if (result.success && result.data) {
          // Map prices from backend format to frontend format
          const mappedPrices = result.data.map(p => ({
            roomType: cinemaRoomService.mapRoomTypeFromBackend(p.roomType), // Map TYPE_2D -> 2D
            seatType: p.seatType,
            price: p.price ? Number(p.price) : 0
          }));
          setPricesData(mappedPrices);
        }
      } catch (error) {
        console.error('Error loading prices:', error);
      }
    };

    loadData();
  }, [movieIdFromUrl, selectedMovie, cinemaIdFromUrl, selectedCinema]);

  // Update state when URL params change
  useEffect(() => {
    if (movieIdFromUrl) setSelectedMovie(movieIdFromUrl);
    if (cinemaIdFromUrl) setSelectedCinema(cinemaIdFromUrl);
    if (movieIdFromUrl && cinemaIdFromUrl && showtimeFromUrl) {
      setStep(2);
    }
  }, [movieIdFromUrl, cinemaIdFromUrl, showtimeFromUrl]);

  const [loadingShowtime, setLoadingShowtime] = useState(false);
  const [showtimeError, setShowtimeError] = useState(null);
  const [temporarilySelectedSeats, setTemporarilySelectedSeats] = useState(new Set()); // Seats selected by other users
  const websocketSubscribedRef = useRef(false);
  const selectedSeatsRef = useRef([]); // Keep latest selectedSeats for WebSocket callback
  const currentSessionIdRef = useRef(null); // Track current user's session ID
  const isNavigatingToCheckoutRef = useRef(false); // Track nếu đang navigate đến checkout

  // Initialize showtime from URL params - load from database
  useEffect(() => {
    // Priority 1: If showtimeId is provided (with or without movieId), load showtime directly by ID
    if (showtimeIdFromUrl && !selectedShowtime && !loadingShowtime) {
      const loadShowtimeById = async () => {
        setLoadingShowtime(true);
        setShowtimeError(null);
        try {
          const showtimeResult = await showtimeService.getShowtimeById(Number(showtimeIdFromUrl));

          if (showtimeResult.success && showtimeResult.data) {
            const st = showtimeResult.data;

            // Validate required fields
            if (!st.showtimeId || !st.cinemaRoomId) {
              throw new Error('Dữ liệu suất chiếu không đầy đủ');
            }

            const mockShowtime = {
              showtimeId: st.showtimeId,
              movieId: st.movieId || Number(movieIdFromUrl),
              roomId: st.cinemaRoomId,
              startTime: st.startTime,
              endTime: st.endTime,
              basePrice: st.basePrice,
              adjustedPrice: st.adjustedPrice
            };
            setSelectedShowtime(mockShowtime);
            
            // Set movie and cinema from showtime data if available
            if (st.movieId) {
              setSelectedMovie(String(st.movieId));
            } else if (movieIdFromUrl) {
              setSelectedMovie(movieIdFromUrl);
            }
            
            if (st.cinemaComplexId) {
              setSelectedCinema(String(st.cinemaComplexId));
            } else if (cinemaIdFromUrl) {
              setSelectedCinema(cinemaIdFromUrl);
            }
            
            // Directly go to step 2 (seat selection) since we have showtime
            setStep(2);
          } else {
            const errorMsg = showtimeResult.error || 'Không thể tải thông tin suất chiếu';
            console.error('[BookTicket] Failed to load showtime:', errorMsg);
            setShowtimeError(errorMsg);
          }
        } catch (error) {
          console.error('[BookTicket] Error loading showtime by ID:', error);
          setShowtimeError(error.message || 'Có lỗi xảy ra khi tải thông tin suất chiếu');
        } finally {
          setLoadingShowtime(false);
        }
      };

      loadShowtimeById();
    } else if (movieIdFromUrl && cinemaIdFromUrl && showtimeFromUrl && dateFromUrl && !selectedShowtime && !showtimeIdFromUrl && !loadingShowtime) {
      // Fallback: Load by time matching (old method)
      const [hours, minutes] = showtimeFromUrl.split(':');
      const showtimeDate = new Date(dateFromUrl);
      showtimeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const loadShowtime = async () => {
        setLoadingShowtime(true);
        setShowtimeError(null);
        try {
          const showtimeResult = await showtimeService.getPublicShowtimes(
            Number(movieIdFromUrl),
            null,
            dateFromUrl
          );
          if (showtimeResult.success && showtimeResult.data) {
            const matchingShowtime = showtimeResult.data.find(st => {
              const stTime = new Date(st.startTime);
              return stTime.getHours() === parseInt(hours) &&
                stTime.getMinutes() === parseInt(minutes) &&
                String(st.cinemaComplexId) === String(cinemaIdFromUrl);
            });
            if (matchingShowtime) {
              const mockShowtime = {
                showtimeId: matchingShowtime.showtimeId,
                movieId: Number(movieIdFromUrl),
                roomId: matchingShowtime.cinemaRoomId,
                startTime: matchingShowtime.startTime,
                endTime: matchingShowtime.endTime,
                basePrice: matchingShowtime.basePrice,
                adjustedPrice: matchingShowtime.adjustedPrice
              };
              setSelectedShowtime(mockShowtime);
              setSelectedCinema(String(matchingShowtime.cinemaComplexId));
              setSelectedMovie(movieIdFromUrl);
              setStep(2);
            } else {
              setShowtimeError('Không tìm thấy suất chiếu phù hợp');
            }
          } else {
            setShowtimeError(showtimeResult.error || 'Không thể tải danh sách suất chiếu');
          }
        } catch (error) {
          console.error('[BookTicket] Error loading showtime:', error);
          setShowtimeError(error.message || 'Có lỗi xảy ra khi tải thông tin suất chiếu');
        } finally {
          setLoadingShowtime(false);
        }
      };

      loadShowtime();
    }
  }, [movieIdFromUrl, cinemaIdFromUrl, showtimeFromUrl, dateFromUrl, showtimeIdFromUrl, selectedShowtime, loadingShowtime]);

  // Get available showtimes for selected movie and cinema
  const availableShowtimes = useMemo(() => {
    if (!selectedMovie || !selectedCinema) return [];
    const cinema = cinemas.find(c => c.complexId === Number(selectedCinema));
    if (!cinema) return [];

    return showtimes.filter(st =>
      st.movieId === Number(selectedMovie) &&
      cinema.rooms.some(r => r.roomId === st.roomId)
    );
  }, [selectedMovie, selectedCinema]);

  const [roomError, setRoomError] = useState(null);

  // Load room and seats from database when showtime is selected
  useEffect(() => {
    const loadRoomAndSeats = async () => {
      if (!selectedShowtime || !selectedShowtime.roomId) {
        return;
      }

      setLoadingRoom(true);
      setRoomError(null);
      try {
        // Load room with seats
        const roomResult = await cinemaRoomService.getPublicRoomById(selectedShowtime.roomId);

        if (roomResult.success && roomResult.data) {
          // Map seats from database format to frontend format
          let mappedSeats = (roomResult.data.seats || []).map(seat => ({
            seatId: `${seat.seatRow}${seat.seatColumn}`, // Format: "A1", "B2", etc.
            row: seat.seatRow,
            column: seat.seatColumn,
            type: seat.type, // NORMAL, VIP, COUPLE
            status: true
          }));

          // Fallback: If no seats from DB but we have dimensions, generate them
          // This handles cases where seat data might be missing or failed to load on navigation
          if (mappedSeats.length === 0 && roomResult.data.rows > 0 && roomResult.data.cols > 0) {
            console.warn('[BookTicket] No seats from DB, generating based on dimensions');
            mappedSeats = generateSeats(roomResult.data.rows, roomResult.data.cols);
          }

          const mappedRoom = {
            roomId: roomResult.data.roomId,
            roomName: roomResult.data.roomName,
            roomType: cinemaRoomService.mapRoomTypeFromBackend(roomResult.data.roomType), // Map TYPE_2D -> 2D
            hasPanorama: roomResult.data.hasPanorama === true,
            cinemaComplexId: roomResult.data.cinemaComplexId,
            cinemaComplexName: roomResult.data.cinemaComplexName,
            rows: roomResult.data.rows,
            cols: roomResult.data.cols,
            seats: mappedSeats
          };

          setRoomData(mappedRoom);
        } else {
          const errorMsg = roomResult.error || 'Không thể tải thông tin phòng chiếu';
          console.error('[BookTicket] Failed to load room:', errorMsg);
          setRoomError(errorMsg);
        }

        // Load booked seats if showtimeId exists
        if (selectedShowtime.showtimeId && typeof selectedShowtime.showtimeId === 'number') {
          const bookedResult = await showtimeService.getBookedSeats(selectedShowtime.showtimeId);
          if (bookedResult.success && bookedResult.data) {
            setBookedSeatIds(new Set(bookedResult.data));
          }

          // Load currently selected seats (real-time status)
          try {
            const statusResponse = await fetch(`http://localhost:8080/api/public/seats/status?showtimeId=${selectedShowtime.showtimeId}`);
            const statusResult = await statusResponse.json();

            if (statusResult.success && statusResult.selectedSeats) {
              setTemporarilySelectedSeats(prev => {
                const newSet = new Set(prev);
                const currentUserSeats = selectedSeatsRef.current;

                statusResult.selectedSeats.forEach(seatId => {
                  // Only add if not selected by current user
                  if (!currentUserSeats.includes(seatId)) {
                    newSet.add(seatId);
                  }
                });
                return newSet;
              });
            }
          } catch (e) {
            console.error('[BookTicket] Error loading real-time seat status:', e);
          }
        }
      } catch (error) {
        console.error('[BookTicket] Error loading room and seats:', error);
        setRoomError(error.message || 'Có lỗi xảy ra khi tải thông tin phòng chiếu');
      } finally {
        setLoadingRoom(false);
      }
    };

    loadRoomAndSeats();
  }, [selectedShowtime]);

  // Update ref when selectedSeats changes
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  // Clear temporarily selected seats when component mounts or showtime changes
  // Và restore selectedSeats từ pendingBooking nếu quay lại từ checkout
  useEffect(() => {
    // Clear temporarily selected seats khi mount lại hoặc showtime thay đổi
    setTemporarilySelectedSeats(new Set());

    // Restore selectedSeats từ pendingBooking nếu có (khi user quay lại từ checkout)
    if (selectedShowtime?.showtimeId) {
      try {
        const savedBooking = localStorage.getItem('pendingBooking');
        if (savedBooking) {
          const booking = JSON.parse(savedBooking);
          // Chỉ restore nếu showtimeId khớp
          const bookingShowtimeId = booking.showtimeId || booking.showtime?.showtimeId;
          if (bookingShowtimeId === selectedShowtime.showtimeId && booking.seats && Array.isArray(booking.seats) && booking.seats.length > 0) {
            setSelectedSeats(booking.seats);

            // Gửi SELECT lại cho các ghế này qua WebSocket để đánh dấu là user này đang chọn
            if (websocketService.getConnectionStatus()) {
              booking.seats.forEach(seatId => {
                websocketService.sendSeatSelection(selectedShowtime.showtimeId, seatId, 'SELECT');
              });
            }

            // Seats will be automatically filtered by sessionId in WebSocket handler
          }
        }
      } catch (e) {
        console.error('[BookTicket] Error restoring selectedSeats:', e);
      }
    }
  }, [selectedShowtime?.showtimeId]);

  // Re-broadcast selected seats when component mounts or connection is established
  // This ensures that if the page was reloaded (restoring state), the backend knows about the selections
  useEffect(() => {
    if (selectedShowtime?.showtimeId && selectedSeats.length > 0) {
      const broadcastSelections = () => {
        if (websocketService.getConnectionStatus()) {
          selectedSeats.forEach(seatId => {
            websocketService.sendSeatSelection(selectedShowtime.showtimeId, seatId, 'SELECT');
          });
        }
      };

      // Try immediately
      broadcastSelections();

      // Also set up a listener/interval to retry if connection isn't ready yet
      const intervalId = setInterval(() => {
        if (websocketService.getConnectionStatus()) {
          broadcastSelections();
          clearInterval(intervalId);
        }
      }, 500);

      return () => clearInterval(intervalId);
    }
  }, [selectedShowtime, selectedSeats.length]); // Depend on length to avoid loops if array ref changes

  // WebSocket connection for real-time seat selection
  useEffect(() => {
    if (!selectedShowtime?.showtimeId) return;

    const showtimeId = selectedShowtime.showtimeId;

    // Connect WebSocket if not connected
    if (!websocketService.getConnectionStatus()) {
      websocketService.connectForSeats();
    }

    // Wait for connection and then subscribe
    const setupSubscription = () => {
      if (websocketService.getConnectionStatus()) {
        if (!websocketSubscribedRef.current) {
          // Get current session ID
          const mySessionId = websocketService.getSessionId();
          currentSessionIdRef.current = mySessionId;
          
          websocketService.subscribeToSeats(showtimeId, (update) => {

            const currentUserSeats = selectedSeatsRef.current;

            // Handle batch deselect (timeout or disconnect) - sync with server state
            if (update.status === 'BATCH_DESELECTED' && update.selectedSeats) {
              // Remove any seats from user's selection that are not in server's list
              setSelectedSeats(prev => {
                const serverSeatsSet = new Set(update.selectedSeats);
                const filtered = prev.filter(seatId => serverSeatsSet.has(seatId));
                return filtered;
              });

              // Update temporarily selected seats (seats selected by others)
              setTemporarilySelectedSeats(prev => {
                const newSet = new Set();
                update.selectedSeats.forEach(seatId => {
                  if (!selectedSeatsRef.current.includes(seatId)) {
                    newSet.add(seatId);
                  }
                });
                return newSet;
              });
              return;
            }

            // Ignore updates from our own session (except batch updates which we handled above)
            if (update.sessionId && update.sessionId === mySessionId) {
              return;
            }

            // Handle individual DESELECTED - remove from user's selection if it was selected
            if (update.status === 'DESELECTED' && update.seatId) {
              setSelectedSeats(prev => {
                if (prev.includes(update.seatId)) {
                  return prev.filter(id => id !== update.seatId);
                }
                return prev;
              });
            }

            // Update temporarily selected seats based on server state
            setTemporarilySelectedSeats(prev => {
              const newSet = new Set();

              // Handle individual updates
              if (update.selectedSeats && Array.isArray(update.selectedSeats)) {
                // Use server's complete list of selected seats
                update.selectedSeats.forEach(seatId => {
                  // Only add seats that are not selected by this user
                  if (!selectedSeatsRef.current.includes(seatId)) {
                    newSet.add(seatId);
                  }
                });
              } else {
                // Fallback: update based on status
                const currentSet = new Set(prev);
                if (update.status === 'SELECTED' && update.seatId) {
                  if (!selectedSeatsRef.current.includes(update.seatId)) {
                    currentSet.add(update.seatId);
                  }
                } else if (update.status === 'DESELECTED' && update.seatId) {
                  currentSet.delete(update.seatId);
                }
                return currentSet;
              }

              return newSet;
            });
          });

          websocketSubscribedRef.current = true;
        }
      } else {
        // Retry after a short delay
        setTimeout(setupSubscription, 500);
      }
    };

    // Wait a bit for connection to establish
    const timeoutId = setTimeout(setupSubscription, 1000);

    // Cleanup function - gửi DESELECT cho tất cả ghế đã chọn khi rời trang (trừ khi đi đến checkout)
    return () => {
      clearTimeout(timeoutId);

      // Chỉ gửi DESELECT nếu KHÔNG đang navigate đến checkout
      const currentSelectedSeats = selectedSeatsRef.current;
      if (currentSelectedSeats && currentSelectedSeats.length > 0 && showtimeId && !isNavigatingToCheckoutRef.current) {
        currentSelectedSeats.forEach(seatId => {
          if (websocketService.getConnectionStatus()) {
            websocketService.sendSeatSelection(showtimeId, seatId, 'DESELECT');
          }
        });
        // Clear selectedSeats khi rời trang (không phải đi đến checkout)
        setSelectedSeats([]);
        // Clear pendingBooking khi rời trang (không phải đi đến checkout)
        localStorage.removeItem('pendingBooking');
      }

      // Reset flag sau khi cleanup
      isNavigatingToCheckoutRef.current = false;

      // Clear temporarily selected seats
      setTemporarilySelectedSeats(new Set());

      if (websocketSubscribedRef.current && showtimeId) {
        websocketService.unsubscribeFromSeats(showtimeId);
        websocketSubscribedRef.current = false;
      }
    };
  }, [selectedShowtime]);

  // Get room for selected showtime - use database data if available
  const selectedRoom = useMemo(() => {
    if (roomData) return roomData; // Use data from database
    if (!selectedShowtime) return null;
    // Fallback to hardcoded data
    const cinema = cinemas.find(c => c.rooms.some(r => r.roomId === selectedShowtime.roomId));
    if (!cinema) return null;
    return cinema.rooms.find(r => r.roomId === selectedShowtime.roomId);
  }, [selectedShowtime, roomData]);

  // Get booked seats for selected showtime - use database data if available
  const bookedSeatsForShowtime = useMemo(() => {
    if (bookedSeatIds.size > 0) return bookedSeatIds; // Use data from database
    if (!selectedShowtime) return new Set();
    // Fallback to hardcoded data
    return new Set(
      bookedSeats
        .filter(bs => bs.showtimeId === selectedShowtime.showtimeId)
        .map(bs => bs.seatId)
    );
  }, [selectedShowtime, bookedSeatIds]);

  // Calculate total price - calculate price for each seat based on pricesData
  const totalPrice = useMemo(() => {
    if (!selectedRoom || !selectedShowtime || selectedSeats.length === 0 || pricesData.length === 0) return 0;

    // Check if showtime is weekend (Saturday = 6, Sunday = 7)
    const showtimeDate = new Date(selectedShowtime.startTime);
    const dayOfWeek = showtimeDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return selectedSeats.reduce((total, seatId) => {
      const seat = selectedRoom.seats.find(s => s.seatId === seatId);
      if (!seat) return total;

      // Find price from pricesData for this roomType + seatType combination
      const priceRecord = pricesData.find(p =>
        p.roomType === selectedRoom.roomType && p.seatType === seat.type
      );

      if (priceRecord) {
        // Apply 30% increase for weekend
        const basePrice = priceRecord.price;
        const adjustedPrice = isWeekend ? basePrice * 1.3 : basePrice;
        return total + adjustedPrice;
      }

      return total;
    }, 0);
  }, [selectedRoom, selectedSeats, selectedShowtime, pricesData]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getSeatColor = (type, isBooked, isSelected, isTemporarilySelected) => {
    if (isBooked) return '#666666'; // Gray for booked seats
    if (isSelected) return '#4caf50'; // Green for user's selected seats
    if (isTemporarilySelected) return '#ff9800'; // Orange for temporarily selected by others
    const colorMap = {
      'NORMAL': '#4a90e2',
      'VIP': '#ffd159',
      'COUPLE': '#e83b41'
    };
    return colorMap[type] || '#4a90e2';
  };

  const handleSeatClick = (seatId) => {
    if (isUserBlocked) {
      setShowBlockedModal(true);
      return;
    }
    if (bookedSeatsForShowtime.has(seatId)) return; // Can't select booked seats
    if (temporarilySelectedSeats.has(seatId) && !selectedSeats.includes(seatId)) {
      // Can't select seats that are temporarily selected by others (unless it's already selected by this user)
      return;
    }

    const wasSelected = selectedSeats.includes(seatId);
    const action = wasSelected ? 'DESELECT' : 'SELECT';

    // Update local state
    setSelectedSeats(prev => {
      if (wasSelected) {
        return prev.filter(id => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });

    // Send WebSocket message
    if (selectedShowtime && selectedShowtime.showtimeId) {
      websocketService.sendSeatSelection(selectedShowtime.showtimeId, seatId, action);
    }

    // Đồng bộ panorama khi modal 360° đang mở (chỉ phòng có panorama NORMAL)
    const { isOpen, setPreviewSeat } = useSeat360Store.getState();
    if (isOpen && isPanoramaEnabled(selectedRoom)) {
      loadPanoramaManifest(selectedRoom.roomType)
        .then(() => {
          if (hasPanoramaForSeat(seatId)) {
            setPreviewSeat(seatId);
          }
        })
        .catch(() => {});
    }
  };

  const handleOpenSeat360 = async () => {
    const lastSelected =
      selectedSeats.length > 0 ? selectedSeats[selectedSeats.length - 1] : null;
    let seatToPreview = null;

    if (isPanoramaEnabled(selectedRoom) && lastSelected) {
      try {
        await loadPanoramaManifest(selectedRoom.roomType);
        if (hasPanoramaForSeat(lastSelected)) {
          seatToPreview = lastSelected;
        }
      } catch {
        seatToPreview = null;
      }
    }

    useSeat360Store.getState().open(seatToPreview);
  };

  const renderSeatLayout = () => {
    if (!selectedRoom) return null;

    const rowChars = [];
    for (let i = 0; i < selectedRoom.rows; i++) {
      rowChars.push(String.fromCharCode(65 + i));
    }

    return (
      <div className="seat-layout">
        <div className="seat-layout__screen">
          <div className="seat-layout__screen-label">🎬 Màn hình 🎬</div>
          <button
            type="button"
            onClick={handleOpenSeat360}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-black shadow-lg transition hover:scale-105 active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {isPanoramaEnabled(selectedRoom) ? 'Xem góc nhìn ghế 360°' : 'Xem sơ đồ ghế'}
          </button>
        </div>

        <div className="seat-layout__grid">
          {rowChars.map(row => (
            <div key={row} className="seat-layout__row">
              <div className="seat-layout__row-label">{row}</div>
              <div className="seat-layout__seats">
                {getSeatsForRow(selectedRoom, row).map((seat) => {
                  const isCouple = seat.type === 'COUPLE';
                  const isBooked = bookedSeatsForShowtime.has(seat.seatId);
                  const isSelected = selectedSeats.includes(seat.seatId);
                  const isTemporarilySelected = temporarilySelectedSeats.has(seat.seatId) && !isSelected;
                  const isDisabled = isBooked || isTemporarilySelected;

                  return (
                    <button
                      key={seat.seatId}
                      type="button"
                      className={`seat-button ${isCouple ? 'seat-button--couple' : ''} ${isBooked ? 'seat-button--booked' : ''} ${isSelected ? 'seat-button--selected' : ''} ${isTemporarilySelected ? 'seat-button--temporarily-selected' : ''}`}
                      style={{
                        backgroundColor: getSeatColor(seat.type, isBooked, isSelected, isTemporarilySelected),
                        borderColor: isBooked ? '#666' : (isSelected ? '#4caf50' : (isTemporarilySelected ? '#ff9800' : getSeatColor(seat.type, false, false, false))),
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isBooked ? 0.5 : (isTemporarilySelected ? 0.7 : 1),
                      }}
                      onClick={() => handleSeatClick(seat.seatId)}
                      disabled={isDisabled}
                      title={`${seat.seatId} - ${seat.type === 'NORMAL' ? 'Thường' : seat.type === 'VIP' ? 'VIP' : 'Đôi'}${isBooked ? ' (Đã đặt)' : (isTemporarilySelected ? ' (Đang được chọn)' : '')}`}
                    >
                      <span className="seat-button__number">{seat.column}</span>
                      <span className="seat-button__type">
                        {seat.type === 'COUPLE' ? '💑' : seat.type === 'VIP' ? '⭐' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="seat-layout__legend">
          <div className="seat-legend">
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{ backgroundColor: '#4a90e2' }}></div>
              <span>Thường</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{ backgroundColor: '#ffd159' }}>⭐</div>
              <span>VIP</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{ backgroundColor: '#e83b41', width: '48px' }}>💑</div>
              <span>Đôi</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{ backgroundColor: '#666666' }}>X</div>
              <span>Đã đặt</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{ backgroundColor: '#4caf50', border: '2px solid #fff' }}>✓</div>
              <span>Đã chọn</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }
    alert('Đặt vé thành công!');
    // Here you would save to database
    navigate('/orders');
  };

  // If user is blocked, only show modal
  if (isUserBlocked) {
    return (
      <div className="min-h-screen cinema-mood">
        <Header />
        <ConfirmModal
          isOpen={showBlockedModal}
          onClose={() => {
            setShowBlockedModal(false);
            navigate('/');
          }}
          onConfirm={() => {
            setShowBlockedModal(false);
            navigate('/');
          }}
          title="Tài khoản bị chặn"
          message="Tài khoản của bạn đã bị chặn. Bạn không thể đặt vé. Vui lòng liên hệ quản trị viên để được hỗ trợ."
          confirmText="Đã hiểu"
          type="alert"
          confirmButtonStyle="primary"
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        <section className="section">
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffd159' }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M8 7h8M8 11h8M8 15h4" />
              </svg>
              <h1 className="section__title" style={{ fontSize: 'clamp(28px, 4vw, 36px)', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                Đặt vé phim
              </h1>
            </div>

            {/* Step 1: Select Movie, Cinema, Showtime */}
            {step === 1 && (
              <div className="book-ticket-step">
                <div className="book-ticket-form">
                  <div className="book-ticket-form__group">
                    <label>Chọn phim *</label>
                    <select
                      value={selectedMovie}
                      onChange={(e) => {
                        setSelectedMovie(e.target.value);
                        setSelectedCinema('');
                        setSelectedShowtime(null);
                      }}
                      className="book-ticket-form__input"
                    >
                      <option value="">-- Chọn phim --</option>
                      {movies.map(m => (
                        <option key={m.movieId} value={m.movieId}>{m.title}</option>
                      ))}
                    </select>
                  </div>

                  {selectedMovie && (
                    <div className="book-ticket-form__group">
                      <label>Chọn rạp *</label>
                      <select
                        value={selectedCinema}
                        onChange={(e) => {
                          setSelectedCinema(e.target.value);
                          setSelectedShowtime(null);
                        }}
                        className="book-ticket-form__input"
                      >
                        <option value="">-- Chọn rạp --</option>
                        {cinemas.map(c => (
                          <option key={c.complexId} value={c.complexId}>
                            {c.name} ({c.province})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedCinema && availableShowtimes.length > 0 && (
                    <div className="book-ticket-form__group">
                      <label>Chọn suất chiếu *</label>
                      <div className="book-ticket-showtimes">
                        {availableShowtimes.map(st => {
                          const cinema = cinemas.find(c => c.complexId === Number(selectedCinema));
                          const room = cinema?.rooms.find(r => r.roomId === st.roomId);
                          return (
                            <button
                              key={st.showtimeId}
                              className={`book-ticket-showtime-btn ${selectedShowtime?.showtimeId === st.showtimeId ? 'book-ticket-showtime-btn--active' : ''}`}
                              onClick={() => {
                                setPendingShowtime(st);
                                setShowAgeConfirmModal(true);
                              }}
                            >
                              <div className="book-ticket-showtime-btn__time">
                                {new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="book-ticket-showtime-btn__room">
                                {room?.roomName} • {room?.roomType}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Select Seats */}
            {step === 2 && (
              <>
                {loadingShowtime ? (
                  <div className="book-ticket-step">
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.7)' }}>
                      <p>Đang tải thông tin suất chiếu...</p>
                    </div>
                  </div>
                ) : showtimeError ? (
                  <div className="book-ticket-step">
                    <div style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
                      <p style={{ marginBottom: '16px' }}>{showtimeError}</p>
                      <button
                        onClick={() => navigate('/')}
                        style={{
                          padding: '12px 24px',
                          background: '#e83b41',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Về trang chủ
                      </button>
                    </div>
                  </div>
                ) : !selectedShowtime ? (
                  <div className="book-ticket-step">
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.7)' }}>
                      <p>Không tìm thấy thông tin suất chiếu</p>
                      <button
                        onClick={() => navigate('/')}
                        style={{
                          padding: '12px 24px',
                          background: '#e83b41',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          marginTop: '16px'
                        }}
                      >
                        Về trang chủ
                      </button>
                    </div>
                  </div>
                ) : loadingRoom ? (
                  <div className="book-ticket-step">
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.7)' }}>
                      <p>Đang tải thông tin phòng chiếu...</p>
                    </div>
                  </div>
                ) : roomError ? (
                  <div className="book-ticket-step">
                    <div style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
                      <p style={{ marginBottom: '16px' }}>{roomError}</p>
                      <button
                        onClick={() => navigate('/')}
                        style={{
                          padding: '12px 24px',
                          background: '#e83b41',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Về trang chủ
                      </button>
                    </div>
                  </div>
                ) : selectedRoom && selectedShowtime ? (
                  <div className="book-ticket-step">
                    <div className="book-ticket-seat-selection">
                      <div className="book-ticket-seat-selection__header">
                        <div>
                          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                            {movieData?.title || 'Đặt vé phim'}
                          </h2>
                          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                            {cinemaData?.name || ''} • {selectedRoom?.roomName || ''} • {selectedRoom?.roomType || ''}
                          </div>
                          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                            {selectedShowtime?.startTime ? new Date(selectedShowtime.startTime).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }) : (dateFromUrl && showtimeFromUrl ? `${showtimeFromUrl} ${dateFromUrl}` : '')}
                          </div>
                        </div>
                        {!movieIdFromUrl && (
                          <button
                            className="btn btn--ghost"
                            onClick={() => {
                              // Gửi DESELECT cho tất cả ghế đã chọn khi quay lại
                              const currentSeats = [...selectedSeats];
                              if (currentSeats.length > 0 && selectedShowtime?.showtimeId) {
                                currentSeats.forEach(seatId => {
                                  if (websocketService.getConnectionStatus()) {
                                    websocketService.sendSeatSelection(selectedShowtime.showtimeId, seatId, 'DESELECT');
                                  }
                                });
                              }
                              setStep(1);
                              setSelectedSeats([]);
                            }}
                          >
                            Quay lại
                          </button>
                        )}
                      </div>

                      <div className="book-ticket-seat-selection__layout">
                        {renderSeatLayout()}
                      </div>

                      {selectedSeats.length > 0 && (
                        <div className="book-ticket-seat-selection__summary">
                          <div className="book-ticket-seat-selection__selected">
                            <span>Ghế đã chọn:</span>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {selectedSeats.map(seatId => {
                                const seat = selectedRoom.seats.find(s => s.seatId === seatId);

                                // Lấy giá từ pricesData dựa trên roomType + seatType
                                let seatPrice = 0;
                                let baseSeatPrice = 0;
                                let isWeekend = false;

                                if (pricesData.length > 0 && selectedRoom) {
                                  // Check if showtime is weekend
                                  const showtimeDate = new Date(selectedShowtime.startTime);
                                  const dayOfWeek = showtimeDate.getDay();
                                  isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                  // Find price from pricesData
                                  const priceRecord = pricesData.find(p =>
                                    p.roomType === selectedRoom.roomType && p.seatType === seat?.type
                                  );

                                  if (priceRecord) {
                                    baseSeatPrice = priceRecord.price;
                                    seatPrice = isWeekend ? baseSeatPrice * 1.3 : baseSeatPrice;
                                  }
                                }

                                return (
                                  <div key={seatId} className="book-ticket-seat-badge">
                                    <span>{seatId}</span>
                                    <span style={{ marginLeft: '8px', color: '#ffd159' }}>
                                      {isWeekend && baseSeatPrice > 0 && (
                                        <span style={{ textDecoration: 'line-through', fontSize: '12px', color: '#c9c4c5', marginRight: '4px' }}>
                                          {formatPrice(baseSeatPrice)}
                                        </span>
                                      )}
                                      {formatPrice(seatPrice)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="book-ticket-seat-selection__total">
                            <span>Tổng cộng:</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                              {selectedShowtime && selectedSeats.length > 0 && (() => {
                                // Check if showtime is weekend
                                const showtimeDate = new Date(selectedShowtime.startTime);
                                const dayOfWeek = showtimeDate.getDay();
                                const isWeekendShowtime = dayOfWeek === 0 || dayOfWeek === 6;

                                if (isWeekendShowtime && pricesData.length > 0) {
                                  // Tính tổng giá gốc
                                  const totalBasePrice = selectedSeats.reduce((total, seatId) => {
                                    const seat = selectedRoom.seats.find(s => s.seatId === seatId);
                                    const priceRecord = pricesData.find(p =>
                                      p.roomType === selectedRoom.roomType && p.seatType === seat?.type
                                    );
                                    return total + (priceRecord?.price || 0);
                                  }, 0);

                                  return (
                                    <>
                                      <span style={{ fontSize: '14px', color: '#c9c4c5', textDecoration: 'line-through' }}>
                                        {formatPrice(totalBasePrice)}
                                      </span>
                                    </>
                                  );
                                }
                              })()}
                              <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffd159' }}>
                                {formatPrice(totalPrice)}
                              </span>
                              {selectedShowtime && selectedSeats.length > 0 && (() => {
                                // Check if showtime is weekend
                                const showtimeDate = new Date(selectedShowtime.startTime);
                                const dayOfWeek = showtimeDate.getDay();
                                const isWeekendShowtime = dayOfWeek === 0 || dayOfWeek === 6;

                                return isWeekendShowtime && (
                                  <span style={{ fontSize: '12px', color: '#4caf50', fontWeight: 600 }}>
                                    +30% Weekend
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="book-ticket-seat-selection__continue">
                            <button
                              className="btn btn--primary"
                              onClick={() => {
                                if (isUserBlocked) {
                                  setShowBlockedModal(true);
                                  return;
                                }
                                // Save booking info to localStorage
                                // Đảm bảo seats là array và có ít nhất 1 ghế
                                if (!selectedSeats || selectedSeats.length === 0) {
                                  alert('Vui lòng chọn ít nhất một ghế');
                                  return;
                                }

                                const bookingInfo = {
                                  movieId: selectedMovie || movieIdFromUrl,
                                  cinemaId: selectedCinema || cinemaIdFromUrl,
                                  cinemaName: cinemaData?.name || cinemaNameFromUrl,
                                  showtime: selectedShowtime,
                                  showtimeId: selectedShowtime?.showtimeId || null, // Thêm showtimeId để Checkout có thể dùng
                                  room: selectedRoom,
                                  seats: Array.isArray(selectedSeats) ? selectedSeats : [], // Đảm bảo seats là array
                                  totalPrice: totalPrice,
                                  movieTitle: movieData?.title || ''
                                };

                                localStorage.setItem('pendingBooking', JSON.stringify(bookingInfo));
                                // Đánh dấu đang navigate đến checkout để không gửi DESELECT
                                isNavigatingToCheckoutRef.current = true;
                                // Navigate to food and drinks page with ticket
                                navigate('/food-drinks-with-ticket');
                              }}
                              style={{
                                padding: '14px 32px',
                                minWidth: '200px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center'
                              }}
                            >
                              TIẾP TỤC
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="book-ticket-step">
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.7)' }}>
                      <p>Không có thông tin phòng chiếu</p>
                      <button
                        onClick={() => navigate('/')}
                        style={{
                          padding: '12px 24px',
                          background: '#e83b41',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 600,
                          marginTop: '16px'
                        }}
                      >
                        Về trang chủ
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Confirm & Payment */}
            {step === 3 && (
              <div className="book-ticket-step">
                <div className="book-ticket-confirm">
                  <div className="book-ticket-confirm__header">
                    <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                      Xác nhận đặt vé
                    </h2>
                    <button
                      className="btn btn--ghost"
                      onClick={() => setStep(2)}
                    >
                      Quay lại
                    </button>
                  </div>

                  <div className="book-ticket-confirm__content">
                    <div className="book-ticket-confirm__info">
                      <div className="book-ticket-confirm__section">
                        <h3>Thông tin phim</h3>
                        <div className="book-ticket-confirm__movie">
                          <img
                            src={movieData?.poster || ''}
                            alt="Movie poster"
                            style={{ width: '80px', height: '120px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
                              {movieData?.title || ''}
                            </div>
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                              {cinemaData?.name || ''}
                            </div>
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                              {selectedRoom?.roomName} • {selectedRoom?.roomType}
                            </div>
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                              {new Date(selectedShowtime.startTime).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="book-ticket-confirm__section">
                        <h3>Ghế đã chọn</h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedSeats.map(seatId => {
                            const seat = selectedRoom.seats.find(s => s.seatId === seatId);
                            const priceEntry = prices.find(
                              p => p.roomType === selectedRoom.roomType && p.seatType === seat?.type
                            );
                            return (
                              <div key={seatId} className="book-ticket-seat-badge">
                                <span>{seatId}</span>
                                <span style={{ marginLeft: '8px', color: '#ffd159' }}>
                                  {formatPrice(priceEntry?.price || 0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="book-ticket-confirm__section checkout-section--compact">
                        <h3 className="checkout-section__title--small">Thông tin khách hàng</h3>
                        <div className="checkout-customer-info">
                          <div className="checkout-customer-info__item">
                            <span className="checkout-customer-info__label">Họ và tên:</span>
                            <span className="checkout-customer-info__value">{customerInfo.name}</span>
                          </div>
                          <div className="checkout-customer-info__item">
                            <span className="checkout-customer-info__label">Số điện thoại:</span>
                            <span className="checkout-customer-info__value">{customerInfo.phone}</span>
                          </div>
                          <div className="checkout-customer-info__item">
                            <span className="checkout-customer-info__label">Email:</span>
                            <span className="checkout-customer-info__value">{customerInfo.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="book-ticket-confirm__section">
                        <h3>Phương thức thanh toán</h3>
                        <div className="checkout-payment-methods">
                          <label className="checkout-payment-method">
                            <input
                              type="radio"
                              name="payment"
                              value="vnpay"
                              checked={paymentMethod === 'vnpay'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                            <div className="checkout-payment-method__content">
                              <span>VNPay</span>
                            </div>
                          </label>
                          <label className="checkout-payment-method">
                            <input
                              type="radio"
                              name="payment"
                              value="momo"
                              checked={paymentMethod === 'momo'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                            <div className="checkout-payment-method__content">
                              <span>MoMo</span>
                            </div>
                          </label>
                          <label className="checkout-payment-method">
                            <input
                              type="radio"
                              name="payment"
                              value="cash"
                              checked={paymentMethod === 'cash'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                            <div className="checkout-payment-method__content">
                              <span>Tiền mặt</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="book-ticket-confirm__sidebar">
                      <div className="book-ticket-confirm__total">
                        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                          Tổng cộng
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffd159' }}>
                          {formatPrice(totalPrice)}
                        </div>
                        <button
                          className="btn btn--primary checkout-submit-btn"
                          onClick={handleConfirm}
                        >
                          Xác nhận thanh toán
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Age Confirmation Modal */}
      <AgeConfirmationModal
        isOpen={showAgeConfirmModal}
        onClose={() => {
          setShowAgeConfirmModal(false);
          setPendingShowtime(null);
        }}
        onConfirm={async () => {
          if (!pendingShowtime) {
            return;
          }

          // Load full showtime data from API to get basePrice and adjustedPrice
          try {
            const showtimeResult = await showtimeService.getShowtimeById(Number(pendingShowtime.showtimeId));
            if (showtimeResult.success && showtimeResult.data) {
              const st = showtimeResult.data;
              const fullShowtime = {
                showtimeId: st.showtimeId,
                movieId: st.movieId || selectedMovie,
                roomId: st.cinemaRoomId,
                startTime: st.startTime,
                endTime: st.endTime,
                basePrice: st.basePrice,
                adjustedPrice: st.adjustedPrice
              };
              setSelectedShowtime(fullShowtime);
            } else {
              // Fallback: use pendingShowtime as is
              setSelectedShowtime(pendingShowtime);
            }
          } catch (error) {
            console.error('Error loading full showtime data:', error);
            // Fallback: use pendingShowtime as is
            setSelectedShowtime(pendingShowtime);
          }

          setSelectedSeats([]);
          setStep(2);
          setShowAgeConfirmModal(false);
          setPendingShowtime(null);
        }}
        movieTitle={movieData?.title}
        ageRating={movieData?.ageRating}
      />

      <ConfirmModal
        isOpen={showBlockedModal}
        onClose={() => {
          setShowBlockedModal(false);
          navigate('/');
        }}
        onConfirm={() => {
          setShowBlockedModal(false);
          navigate('/');
        }}
        title="Tài khoản bị chặn"
        message="Tài khoản của bạn đã bị chặn. Bạn không thể đặt vé. Vui lòng liên hệ quản trị viên để được hỗ trợ."
        confirmText="Đã hiểu"
        type="alert"
        confirmButtonStyle="primary"
      />

      <Seat360Modal
        room={selectedRoom}
        selectedSeats={selectedSeats}
        bookedSeats={bookedSeatsForShowtime}
        temporarilySelectedSeats={temporarilySelectedSeats}
        onSeatClick={handleSeatClick}
        getSeatColor={getSeatColor}
        cinemaName={cinemaData?.name}
      />

      <Footer />
    </div>
  );
}

