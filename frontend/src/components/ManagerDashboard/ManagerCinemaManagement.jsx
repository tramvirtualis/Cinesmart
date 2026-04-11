import React, { useState, useEffect, useMemo } from 'react';
import { ROOM_TYPES, PROVINCES } from '../AdminDashboard/constants';
import {
  generateSeats,
  getSeatColor,
  computeUserExtraEmptyFromRoom,
  countSeatsInGrid,
  filterEmptyCellsForDimensions,
  getRoomFormGridCellDisplay,
  getWalkwayColumns,
  parseSeatCellKey,
  seatCellKey,
} from '../AdminDashboard/utils';
import ConfirmDeleteModal from '../Common/ConfirmDeleteModal';
import movieService from '../../services/movieService';
import { enumService } from '../../services/enumService';
import showtimeService from '../../services/showtimeService';

// Full Cinema Management (copied and adapted from Admin) scoped for manager
function ManagerCinemaManagement({ cinemas: initialCinemasList, onCinemasChange, complexId }) {
  const [cinemas, setCinemas] = useState(initialCinemasList);
  const [selectedCinema, setSelectedCinema] = useState(initialCinemasList[0] || null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showShowtimeModal, setShowShowtimeModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    roomName: '',
    roomType: '2D',
    rows: 10,
    cols: 12,
    emptyCells: [],
  });
  const [showtimeForm, setShowtimeForm] = useState({
    movieId: '',
    date: '',
    startTime: '',
    language: 'Phụ đề',
    format: '2D'
  });
  const [savingRoom, setSavingRoom] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [showtimeConflict, setShowtimeConflict] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [savingShowtime, setSavingShowtime] = useState(false);

  // Notification system
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Helper function to truncate movie title
  const truncateTitle = (title, maxLength = 19) => {
    if (!title) return '';
    const trimmed = title.trim();
    console.log('Truncating:', trimmed, 'Length:', trimmed.length, 'MaxLength:', maxLength);
    if (trimmed.length <= maxLength) {
      console.log('No truncation needed, returning:', trimmed);
      return trimmed;
    }
    const result = trimmed.substring(0, maxLength).trim() + '...';
    console.log('Truncated to:', result);
    return result;
  };

  // Use ref to track if we've already loaded rooms to prevent infinite loop
  const hasLoadedRoomsRef = React.useRef(false);
  const lastInitialCinemasListRef = React.useRef(null);
  const prevCinemasRef = React.useRef(null);

  useEffect(() => {
    // Only call onCinemasChange if cinemas actually changed
    // Compare by complexIds to avoid unnecessary calls
    const currentComplexIds = cinemas?.map(c => c.complexId).sort().join(',') || '';
    const prevComplexIds = prevCinemasRef.current || '';
    
    if (currentComplexIds !== prevComplexIds && onCinemasChange) {
      onCinemasChange(cinemas);
      prevCinemasRef.current = currentComplexIds;
    }
  }, [cinemas, onCinemasChange]);

  useEffect(() => {
    // Check if initialCinemasList actually changed (by comparing complexIds)
    const currentComplexIds = initialCinemasList?.map(c => c.complexId).sort().join(',') || '';
    const lastComplexIds = lastInitialCinemasListRef.current || '';
    
    // Only reload if complexIds changed or if we haven't loaded yet
    if (currentComplexIds === lastComplexIds && hasLoadedRoomsRef.current) {
      return; // Skip if nothing changed
    }
    
    console.log('ManagerCinemaManagement: initialCinemasList changed:', initialCinemasList);
    console.log('ManagerCinemaManagement: initialCinemasList length:', initialCinemasList?.length || 0);
    
    const loadRoomsForCinemas = async () => {
      if (!initialCinemasList || initialCinemasList.length === 0) {
        setCinemas([]);
        setSelectedCinema(null);
        hasLoadedRoomsRef.current = true;
        lastInitialCinemasListRef.current = '';
        return;
      }
      
      // Load rooms for each cinema complex
      const { default: cinemaRoomService } = await import('../../services/cinemaRoomService');
      const cinemasWithRooms = await Promise.all(
        initialCinemasList.map(async (cinema) => {
          try {
            const roomsResult = await cinemaRoomService.getRoomsByComplexIdManager(cinema.complexId);
            if (roomsResult.success && roomsResult.data) {
              return {
                ...cinema,
                rooms: roomsResult.data.map(room => ({
                  roomId: room.roomId,
                  roomName: room.roomName,
                  roomType: cinemaRoomService.mapRoomTypeFromBackend(room.roomType),
                  rows: room.rows,
                  cols: room.cols,
                  seats: (room.seats || []).map(seat => ({
                    seatId: seat.seatId,
                    type: seat.type,
                    row: seat.seatRow, // Map seatRow -> row
                    column: seat.seatColumn // Map seatColumn -> column
                  }))
                }))
              };
            }
            return { ...cinema, rooms: [] };
          } catch (error) {
            console.error(`Error loading rooms for cinema ${cinema.complexId}:`, error);
            return { ...cinema, rooms: [] };
          }
        })
      );
      
      setCinemas(cinemasWithRooms);
      if (cinemasWithRooms.length > 0) {
        console.log('ManagerCinemaManagement: Setting selectedCinema to:', cinemasWithRooms[0]);
        setSelectedCinema(cinemasWithRooms[0]);
      } else {
        console.log('ManagerCinemaManagement: No cinemas, setting selectedCinema to null');
        setSelectedCinema(null);
      }
      
      // Mark as loaded and save current state
      hasLoadedRoomsRef.current = true;
      lastInitialCinemasListRef.current = currentComplexIds;
    };
    
    loadRoomsForCinemas();
  }, [initialCinemasList]);


  const handleAddRoom = (cinema) => {
    setEditingRoom(null);
    setRoomFormData({ roomName: '', roomType: '2D', rows: 10, cols: 12, emptyCells: [] });
    setSelectedCinema(cinema);
    setShowRoomModal(true);
  };

  const handleEditRoom = (cinema, room) => {
    setEditingRoom(room);
    setSelectedCinema(cinema);
    setRoomFormData({
      roomName: room.roomName,
      roomType: room.roomType,
      rows: room.rows,
      cols: room.cols,
      emptyCells: computeUserExtraEmptyFromRoom(room),
    });
    setShowRoomModal(true);
  };

  const toggleRoomFormEmptyCell = (key) => {
    const p = parseSeatCellKey(key);
    if (p && getWalkwayColumns(roomFormData.cols).has(p.col)) {
      const dimsMatch = editingRoom && editingRoom.rows === roomFormData.rows && editingRoom.cols === roomFormData.cols;
      const legacySeatHere = dimsMatch && editingRoom.seats?.some(
        s => String(s.row).toUpperCase() === p.row && Number(s.column) === p.col
      );
      if (!legacySeatHere) return;
    }
    setRoomFormData(prev => {
      const set = new Set(prev.emptyCells || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, emptyCells: Array.from(set) };
    });
  };

  // Load movies for showtime management
  useEffect(() => {
    const loadMovies = async () => {
      if (showShowtimeModal && !movies.length) {
        setLoadingMovies(true);
        try {
          const result = await movieService.getAllMoviesManager();
          if (result.success && result.data) {
            setMovies(result.data);
          }
        } catch (error) {
          console.error('Error loading movies:', error);
        } finally {
          setLoadingMovies(false);
        }
      }
    };
    loadMovies();
  }, [showShowtimeModal]);

  const openShowtimes = async (cinema, room) => {
    setSelectedCinema(cinema);
    setSelectedRoom(room);
    setEditingShowtime(null);
    setShowtimeForm({
      movieId: '',
      date: new Date().toISOString().slice(0,10),
      startTime: '',
      language: 'Phụ đề',
      format: room.roomType || '2D'
    });
    setShowtimeConflict(null);
    setShowShowtimeModal(true);
    
    // Load showtimes from API
    if (room.roomId) {
      setLoadingShowtimes(true);
      try {
        const result = await showtimeService.getShowtimesByRoomId(room.roomId);
        if (result.success && result.data) {
          // Map showtimes from API to format expected by UI
          const mappedShowtimes = result.data.map(st => {
            // Parse LocalDateTime from backend (format: "2025-11-15T19:30:00")
            const startDateTime = new Date(st.startTime);
            const endDateTime = new Date(st.endTime);
            const date = startDateTime.toISOString().split('T')[0];
            const startTime = startDateTime.toTimeString().slice(0, 5);
            const endTime = endDateTime.toTimeString().slice(0, 5);
            
            // Get movie info from movieVersion
            const movieId = st.movieVersion?.movie?.movieId || st.movieId;
            const language = showtimeService.mapLanguageFromBackend(st.movieVersion?.language || st.language);
            const format = showtimeService.mapRoomTypeFromBackend(st.movieVersion?.roomType || st.format);
            
            return {
              showtimeId: st.showtimeId,
              roomId: st.cinemaRoom?.roomId || room.roomId,
              movieId: movieId,
              date: date,
              startTime: startTime,
              endTime: endTime,
              language: language,
              format: format,
              movieTitle: st.movieVersion?.movie?.title || st.movieTitle
            };
          });
          
          // Update selectedRoom with showtimes
          const updatedRoom = {
            ...room,
            showtimes: mappedShowtimes
          };
          setSelectedRoom(updatedRoom);
          
          // Also update in cinemas state
          const cinemaIndex = cinemas.findIndex(c => c.complexId === cinema.complexId);
          if (cinemaIndex !== -1) {
            const roomIndex = cinemas[cinemaIndex].rooms.findIndex(r => r.roomId === room.roomId);
            if (roomIndex !== -1) {
              const updatedCinemas = [...cinemas];
              updatedCinemas[cinemaIndex].rooms[roomIndex] = updatedRoom;
              setCinemas(updatedCinemas);
            }
          }
        } else {
          // No showtimes or error, set empty array
          const updatedRoom = {
            ...room,
            showtimes: []
          };
          setSelectedRoom(updatedRoom);
        }
      } catch (error) {
        console.error('Error loading showtimes:', error);
        const updatedRoom = {
          ...room,
          showtimes: []
        };
        setSelectedRoom(updatedRoom);
      } finally {
        setLoadingShowtimes(false);
      }
    }
  };

  const handleSaveRoom = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!roomFormData.roomName || !roomFormData.rows || !roomFormData.cols) {
      showNotification('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    const rowsN = Number(roomFormData.rows);
    const colsN = Number(roomFormData.cols);
    const hasAtLeastOneSeat = editingRoom
      ? countSeatsInGrid(rowsN, colsN, roomFormData.emptyCells) >= 1
      : rowsN >= 1 && colsN >= 1 && rowsN * colsN >= 1;
    if (!hasAtLeastOneSeat) {
      showNotification(
        editingRoom
          ? 'Phòng cần ít nhất một ghế — giảm ô trống hoặc tăng số hàng/cột'
          : 'Số hàng và số cột phải ≥ 1',
        'error'
      );
      return;
    }

    if (!selectedCinema) {
      showNotification('Vui lòng chọn cụm rạp', 'error');
      return;
    }

    // Prevent multiple calls
    if (savingRoom) {
      return;
    }

    setSavingRoom(true);
    try {
      const { default: cinemaRoomService } = await import('../../services/cinemaRoomService');
      
      const roomData = {
        roomName: roomFormData.roomName.trim(),
        roomType: roomFormData.roomType,
        cinemaComplexId: selectedCinema.complexId,
        rows: rowsN,
        cols: colsN,
        emptyCells: editingRoom ? (roomFormData.emptyCells || []) : [],
      };

      if (editingRoom) {
        // Update existing room
        const result = await cinemaRoomService.updateCinemaRoomManager(editingRoom.roomId, roomData);
        
        if (result.success) {
          // Reload rooms from API
          const roomsResult = await cinemaRoomService.getRoomsByComplexIdManager(selectedCinema.complexId);
          if (roomsResult.success) {
            const mappedRooms = roomsResult.data.map(room => ({
              roomId: room.roomId,
              roomName: room.roomName,
              roomType: cinemaRoomService.mapRoomTypeFromBackend(room.roomType),
              rows: room.rows,
              cols: room.cols,
              seats: (room.seats || []).map(seat => ({
                seatId: seat.seatId,
                type: seat.type,
                row: seat.seatRow, // Map seatRow -> row
                column: seat.seatColumn // Map seatColumn -> column
              }))
            }));
            
            const cinemaIndex = cinemas.findIndex(c => c.complexId === selectedCinema.complexId);
            if (cinemaIndex !== -1) {
              const updatedCinemas = [...cinemas];
              updatedCinemas[cinemaIndex] = {
                ...updatedCinemas[cinemaIndex],
                rooms: mappedRooms
              };
              setCinemas(updatedCinemas);
              if (onCinemasChange) {
                onCinemasChange(updatedCinemas);
              }
            }
          }
          showNotification('Cập nhật phòng chiếu thành công', 'success');
          setShowRoomModal(false);
          setEditingRoom(null);
        } else {
          showNotification(result.error || 'Cập nhật phòng chiếu thất bại', 'error');
        }
      } else {
        // Create new room
        const result = await cinemaRoomService.createCinemaRoomManager(roomData);
        
        if (result.success) {
          // Reload rooms from API
          const roomsResult = await cinemaRoomService.getRoomsByComplexIdManager(selectedCinema.complexId);
          if (roomsResult.success) {
            const mappedRooms = roomsResult.data.map(room => ({
              roomId: room.roomId,
              roomName: room.roomName,
              roomType: cinemaRoomService.mapRoomTypeFromBackend(room.roomType),
              rows: room.rows,
              cols: room.cols,
              seats: (room.seats || []).map(seat => ({
                seatId: seat.seatId,
                type: seat.type,
                row: seat.seatRow, // Map seatRow -> row
                column: seat.seatColumn // Map seatColumn -> column
              }))
            }));
            
            const cinemaIndex = cinemas.findIndex(c => c.complexId === selectedCinema.complexId);
            if (cinemaIndex !== -1) {
              const updatedCinemas = [...cinemas];
              updatedCinemas[cinemaIndex] = {
                ...updatedCinemas[cinemaIndex],
                rooms: mappedRooms
              };
              setCinemas(updatedCinemas);
              if (onCinemasChange) {
                onCinemasChange(updatedCinemas);
              }
            }
          }
          showNotification('Tạo phòng chiếu thành công', 'success');
          setShowRoomModal(false);
          setEditingRoom(null);
        } else {
          showNotification(result.error || 'Tạo phòng chiếu thất bại', 'error');
        }
      }
    } catch (error) {
      showNotification('Có lỗi xảy ra khi lưu phòng chiếu', 'error');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = (cinema, roomId) => {
    const room = cinema.rooms.find(r => r.roomId === roomId);
    setDeleteConfirm({ 
      type: 'room', 
      id: roomId, 
      name: room?.roomName || 'phòng chiếu này',
      cinema: cinema
    });
  };

  const confirmDeleteRoom = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'room') return;

    try {
      const roomId = deleteConfirm.id;
      const cinema = deleteConfirm.cinema;
      const { default: cinemaRoomService } = await import('../../services/cinemaRoomService');
      const result = await cinemaRoomService.deleteCinemaRoomManager(roomId);
      
      if (result.success) {
        // Reload rooms from API
        const roomsResult = await cinemaRoomService.getRoomsByComplexIdManager(cinema.complexId);
        if (roomsResult.success) {
          const mappedRooms = roomsResult.data.map(room => ({
            roomId: room.roomId,
            roomName: room.roomName,
            roomType: cinemaRoomService.mapRoomTypeFromBackend(room.roomType),
            rows: room.rows,
            cols: room.cols,
            seats: room.seats || []
          }));
          
          const cinemaIndex = cinemas.findIndex(c => c.complexId === cinema.complexId);
          if (cinemaIndex !== -1) {
            const updatedCinemas = [...cinemas];
            updatedCinemas[cinemaIndex] = {
              ...updatedCinemas[cinemaIndex],
              rooms: mappedRooms
            };
            setCinemas(updatedCinemas);
            if (onCinemasChange) {
              onCinemasChange(updatedCinemas);
            }
          }
        }
        
        if (selectedRoom?.roomId === roomId) {
          setSelectedRoom(null);
        }
        showNotification('Xóa phòng chiếu thành công', 'success');
        setDeleteConfirm(null); // Đóng modal sau khi xóa thành công
      } else {
        showNotification(result.error || 'Xóa phòng chiếu thất bại', 'error');
        setDeleteConfirm(null); // Đóng modal ngay cả khi lỗi
      }
    } catch (error) {
      showNotification('Có lỗi xảy ra khi xóa phòng chiếu', 'error');
      setDeleteConfirm(null); // Đóng modal khi có lỗi
    }
  };

  // Showtime management
  const computeEndTime = (date, startTime, movieId) => {
    const movie = movies.find(m => m.movieId === Number(movieId));
    const duration = movie ? movie.duration : 0;
    if (!duration || !startTime) return '';
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(start.getTime() + duration * 60000 + 15 * 60000); // +15 phút buffer
    return end.toTimeString().slice(0,5);
  };

  const hasOverlap = (list, date, startTime, endTime, editingId) => {
    if (!startTime || !endTime) return false;
    const s = new Date(`${date}T${startTime}:00`).getTime();
    const e = new Date(`${date}T${endTime}:00`).getTime();
    const conflicts = (list || []).filter(st => {
      if (editingId && st.showtimeId === editingId) return false;
      if (st.date !== date) return false;
      if (!st.startTime || !st.endTime) return false;
      const ss = new Date(`${st.date}T${st.startTime}:00`).getTime();
      const ee = new Date(`${st.date}T${st.endTime}:00`).getTime();
      return Math.max(s, ss) < Math.min(e, ee);
    });
    return conflicts;
  };

  // Real-time conflict checking
  useEffect(() => {
    if (!showShowtimeModal || !selectedRoom || !showtimeForm.date || !showtimeForm.startTime || !showtimeForm.movieId) {
      setShowtimeConflict(null);
      return;
    }

    const endTime = computeEndTime(showtimeForm.date, showtimeForm.startTime, showtimeForm.movieId);
    if (!endTime) {
      setShowtimeConflict(null);
      return;
    }

    const conflicts = hasOverlap(
      selectedRoom.showtimes || [],
      showtimeForm.date,
      showtimeForm.startTime,
      endTime,
      editingShowtime?.showtimeId
    );

    if (conflicts && conflicts.length > 0) {
      const conflictShowtime = conflicts[0];
      const conflictMovie = movies.find(m => m.movieId === conflictShowtime.movieId);
      setShowtimeConflict({
        message: `⚠️ Trùng với lịch chiếu: ${conflictMovie?.title || 'Phim khác'} (${conflictShowtime.startTime} - ${conflictShowtime.endTime})`,
        conflicts
      });
    } else {
      setShowtimeConflict(null);
    }
  }, [showtimeForm.date, showtimeForm.startTime, showtimeForm.movieId, showShowtimeModal, selectedRoom, editingShowtime, movies]);

  // Group showtimes by date for timeline view
  const showtimesByDate = useMemo(() => {
    if (!selectedRoom?.showtimes) return {};
    const grouped = {};
    (selectedRoom.showtimes || []).forEach(st => {
      if (!grouped[st.date]) {
        grouped[st.date] = [];
      }
      grouped[st.date].push(st);
    });
    // Sort each date's showtimes by start time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [selectedRoom?.showtimes]);

  const handleSaveShowtime = async () => {
    if (!selectedCinema || !selectedRoom) return;
    if (!showtimeForm.movieId || !showtimeForm.date || !showtimeForm.startTime) {
      showNotification('Vui lòng chọn phim, ngày và giờ bắt đầu', 'error');
      return;
    }
    
    const endTime = computeEndTime(showtimeForm.date, showtimeForm.startTime, showtimeForm.movieId);
    if (!endTime) {
      showNotification('Không thể tính giờ kết thúc. Vui lòng kiểm tra lại thông tin phim.', 'error');
      return;
    }
    
    // Check conflicts
    const current = selectedRoom.showtimes || [];
    const conflicts = hasOverlap(current, showtimeForm.date, showtimeForm.startTime, endTime, editingShowtime?.showtimeId);
    if (conflicts && conflicts.length > 0) {
      const conflictShowtime = conflicts[0];
      const conflictMovie = movies.find(m => m.movieId === conflictShowtime.movieId);
      showNotification(`Khung giờ trùng với lịch chiếu: ${conflictMovie?.title || 'Phim khác'} (${conflictShowtime.startTime} - ${conflictShowtime.endTime})`, 'error');
      return;
    }
    
    // Prevent multiple calls
    if (savingShowtime) {
      return;
    }
    
    setSavingShowtime(true);
    try {
      // Format startTime and endTime as LocalDateTime strings
      const startDateTime = `${showtimeForm.date}T${showtimeForm.startTime}:00`;
      const endDateTime = `${showtimeForm.date}T${endTime}:00`;
      
      if (editingShowtime) {
        // Update existing showtime
        const result = await showtimeService.updateShowtime(editingShowtime.showtimeId, {
          movieId: Number(showtimeForm.movieId),
          language: showtimeForm.language,
          roomType: showtimeForm.format,
          startTime: startDateTime,
          endTime: endDateTime,
        });
        
        if (result.success) {
          // Reload showtimes from API
          const showtimesResult = await showtimeService.getShowtimesByRoomId(selectedRoom.roomId);
          if (showtimesResult.success && showtimesResult.data) {
            const mappedShowtimes = showtimesResult.data.map(st => {
              const startDateTime = new Date(st.startTime);
              const endDateTime = new Date(st.endTime);
              const date = startDateTime.toISOString().split('T')[0];
              const startTime = startDateTime.toTimeString().slice(0, 5);
              const endTime = endDateTime.toTimeString().slice(0, 5);
              const movieId = st.movieVersion?.movie?.movieId || st.movieId;
              const language = showtimeService.mapLanguageFromBackend(st.movieVersion?.language || st.language);
              const format = showtimeService.mapRoomTypeFromBackend(st.movieVersion?.roomType || st.format);
              
              return {
                showtimeId: st.showtimeId,
                roomId: st.cinemaRoom?.roomId || selectedRoom.roomId,
                movieId: movieId,
                date: date,
                startTime: startTime,
                endTime: endTime,
                language: language,
                format: format,
                movieTitle: st.movieVersion?.movie?.title || st.movieTitle
              };
            });
            
            const updatedRoom = {
              ...selectedRoom,
              showtimes: mappedShowtimes
            };
            setSelectedRoom(updatedRoom);
            
            // Update in cinemas state
            const cinemaIndex = cinemas.findIndex(c => c.complexId === selectedCinema.complexId);
            if (cinemaIndex !== -1) {
              const roomIndex = cinemas[cinemaIndex].rooms.findIndex(r => r.roomId === selectedRoom.roomId);
              if (roomIndex !== -1) {
                const updatedCinemas = [...cinemas];
                updatedCinemas[cinemaIndex].rooms[roomIndex] = updatedRoom;
                setCinemas(updatedCinemas);
                if (onCinemasChange) {
                  onCinemasChange(updatedCinemas);
                }
              }
            }
          }
          
          showNotification('Cập nhật lịch chiếu thành công', 'success');
          setEditingShowtime(null);
          setShowtimeForm({
            movieId: '',
            date: showtimeForm.date,
            startTime: '',
            language: 'Phụ đề',
            format: selectedRoom.roomType || '2D'
          });
          setShowtimeConflict(null);
        } else {
          showNotification(result.error || 'Cập nhật lịch chiếu thất bại', 'error');
        }
      } else {
        // Create new showtime
        const result = await showtimeService.createShowtime({
          cinemaRoomId: selectedRoom.roomId,
          movieId: Number(showtimeForm.movieId),
          language: showtimeForm.language,
          roomType: showtimeForm.format,
          startTime: startDateTime,
          endTime: endDateTime,
        });
        
        if (result.success) {
          // Reload showtimes from API
          const showtimesResult = await showtimeService.getShowtimesByRoomId(selectedRoom.roomId);
          if (showtimesResult.success && showtimesResult.data) {
            const mappedShowtimes = showtimesResult.data.map(st => {
              const startDateTime = new Date(st.startTime);
              const endDateTime = new Date(st.endTime);
              const date = startDateTime.toISOString().split('T')[0];
              const startTime = startDateTime.toTimeString().slice(0, 5);
              const endTime = endDateTime.toTimeString().slice(0, 5);
              const movieId = st.movieVersion?.movie?.movieId || st.movieId;
              const language = showtimeService.mapLanguageFromBackend(st.movieVersion?.language || st.language);
              const format = showtimeService.mapRoomTypeFromBackend(st.movieVersion?.roomType || st.format);
              
              return {
                showtimeId: st.showtimeId,
                roomId: st.cinemaRoom?.roomId || selectedRoom.roomId,
                movieId: movieId,
                date: date,
                startTime: startTime,
                endTime: endTime,
                language: language,
                format: format,
                movieTitle: st.movieVersion?.movie?.title || st.movieTitle
              };
            });
            
            const updatedRoom = {
              ...selectedRoom,
              showtimes: mappedShowtimes
            };
            setSelectedRoom(updatedRoom);
            
            // Update in cinemas state
            const cinemaIndex = cinemas.findIndex(c => c.complexId === selectedCinema.complexId);
            if (cinemaIndex !== -1) {
              const roomIndex = cinemas[cinemaIndex].rooms.findIndex(r => r.roomId === selectedRoom.roomId);
              if (roomIndex !== -1) {
                const updatedCinemas = [...cinemas];
                updatedCinemas[cinemaIndex].rooms[roomIndex] = updatedRoom;
                setCinemas(updatedCinemas);
                if (onCinemasChange) {
                  onCinemasChange(updatedCinemas);
                }
              }
            }
          }
          
          showNotification('Thêm lịch chiếu thành công', 'success');
          setShowtimeForm({
            movieId: '',
            date: showtimeForm.date,
            startTime: '',
            language: 'Phụ đề',
            format: selectedRoom.roomType || '2D'
          });
          setShowtimeConflict(null);
        } else {
          showNotification(result.error || 'Thêm lịch chiếu thất bại', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving showtime:', error);
      showNotification('Có lỗi xảy ra khi lưu lịch chiếu', 'error');
    } finally {
      setSavingShowtime(false);
    }
  };

  const handleEditShowtime = (st) => {
    setEditingShowtime(st);
    setShowtimeForm({
      movieId: String(st.movieId),
      date: st.date,
      startTime: st.startTime,
      language: st.language || 'Phụ đề',
      format: st.format || (selectedRoom?.roomType || '2D')
    });
    setShowtimeConflict(null);
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('.showtime-form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDeleteShowtime = (stId) => {
    if (!selectedCinema || !selectedRoom) return;
    const showtime = selectedRoom.showtimes?.find(s => s.showtimeId === stId);
    setDeleteConfirm({ 
      type: 'showtime', 
      id: stId,
      name: showtime ? `${showtime.movieTitle} - ${showtime.date} ${showtime.startTime}` : 'lịch chiếu này'
    });
  };

  const confirmDeleteShowtime = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'showtime') return;
    if (!selectedCinema || !selectedRoom) return;

    const stId = deleteConfirm.id;
    
    try {
      const result = await showtimeService.deleteShowtime(stId);
      
      if (result.success) {
        // Reload showtimes from API
        const showtimesResult = await showtimeService.getShowtimesByRoomId(selectedRoom.roomId);
        if (showtimesResult.success && showtimesResult.data) {
          const mappedShowtimes = showtimesResult.data.map(st => {
            const startDateTime = new Date(st.startTime);
            const endDateTime = new Date(st.endTime);
            const date = startDateTime.toISOString().split('T')[0];
            const startTime = startDateTime.toTimeString().slice(0, 5);
            const endTime = endDateTime.toTimeString().slice(0, 5);
            const movieId = st.movieVersion?.movie?.movieId || st.movieId;
            const language = showtimeService.mapLanguageFromBackend(st.movieVersion?.language || st.language);
            const format = showtimeService.mapRoomTypeFromBackend(st.movieVersion?.roomType || st.format);
            
            return {
              showtimeId: st.showtimeId,
              roomId: st.cinemaRoom?.roomId || selectedRoom.roomId,
              movieId: movieId,
              date: date,
              startTime: startTime,
              endTime: endTime,
              language: language,
              format: format,
              movieTitle: st.movieVersion?.movie?.title || st.movieTitle
            };
          });
          
          const updatedRoom = {
            ...selectedRoom,
            showtimes: mappedShowtimes
          };
          setSelectedRoom(updatedRoom);
          
          // Update in cinemas state
          const cinemaIndex = cinemas.findIndex(c => c.complexId === selectedCinema.complexId);
          if (cinemaIndex !== -1) {
            const roomIndex = cinemas[cinemaIndex].rooms.findIndex(r => r.roomId === selectedRoom.roomId);
            if (roomIndex !== -1) {
              const updatedCinemas = [...cinemas];
              updatedCinemas[cinemaIndex].rooms[roomIndex] = updatedRoom;
              setCinemas(updatedCinemas);
              if (onCinemasChange) {
                onCinemasChange(updatedCinemas);
              }
            }
          }
        } else {
          // No showtimes after delete, set empty array
          const updatedRoom = {
            ...selectedRoom,
            showtimes: []
          };
          setSelectedRoom(updatedRoom);
        }
        
        if (editingShowtime?.showtimeId === stId) setEditingShowtime(null);
        setDeleteConfirm(null); // Đóng modal sau khi xóa thành công
        showNotification('Xóa lịch chiếu thành công', 'success');
      } else {
        setDeleteConfirm(null); // Đóng modal ngay cả khi lỗi
        showNotification(result.error || 'Xóa lịch chiếu thất bại', 'error');
      }
    } catch (error) {
      console.error('Error deleting showtime:', error);
      setDeleteConfirm(null); // Đóng modal khi có lỗi
      showNotification('Có lỗi xảy ra khi xóa lịch chiếu', 'error');
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirm?.type === 'room') {
      await confirmDeleteRoom();
    } else if (deleteConfirm?.type === 'showtime') {
      confirmDeleteShowtime();
    }
  };

  const SEAT_TYPE_CYCLE = ['NORMAL', 'VIP', 'COUPLE'];

  const patchRoomInState = (cinemaIndex, roomIndex, nextRoom) => {
    const updatedCinemas = [...cinemas];
    const updatedCinema = { ...updatedCinemas[cinemaIndex] };
    const updatedRooms = [...updatedCinema.rooms];
    updatedRooms[roomIndex] = nextRoom;
    updatedCinema.rooms = updatedRooms;
    updatedCinemas[cinemaIndex] = updatedCinema;
    setCinemas(updatedCinemas);
    setSelectedRoom(nextRoom);
  };

  const handleSeatClick = async (seatId) => {
    if (!selectedCinema || !selectedRoom) return;
    const cinemaIndex = cinemas.findIndex(c => c.complexId === selectedCinema.complexId);
    if (cinemaIndex === -1) return;
    const roomIndex = cinemas[cinemaIndex].rooms.findIndex(r => r.roomId === selectedRoom.roomId);
    if (roomIndex === -1) return;
    const room = cinemas[cinemaIndex].rooms[roomIndex];
    const currentSeat = room.seats.find(s => s.seatId === seatId);
    if (!currentSeat || !currentSeat.seatId) return;

    const { default: cinemaRoomService } = await import('../../services/cinemaRoomService');

    if (currentSeat.type === 'COUPLE') {
      const updatedRoom = {
        ...room,
        seats: room.seats.filter(s => s.seatId !== seatId),
      };
      patchRoomInState(cinemaIndex, roomIndex, updatedRoom);
      try {
        const result = await cinemaRoomService.deleteSeatManager(seatId);
        if (!result.success) {
          const restored = {
            ...room,
            seats: room.seats.map(s => (s.seatId === seatId ? { ...currentSeat } : s)),
          };
          patchRoomInState(cinemaIndex, roomIndex, restored);
          showNotification(result.error || 'Không thể chuyển thành trống', 'error');
        }
      } catch (e) {
        patchRoomInState(cinemaIndex, roomIndex, { ...room, seats: [...room.seats] });
        showNotification('Có lỗi khi xóa ghế', 'error');
      }
      return;
    }

    const idx = SEAT_TYPE_CYCLE.indexOf(currentSeat.type);
    const nextType = idx >= 0 ? SEAT_TYPE_CYCLE[idx + 1] : 'VIP';

    const optimisticRoom = {
      ...room,
      seats: room.seats.map(s => (s.seatId === seatId ? { ...s, type: nextType } : s)),
    };
    patchRoomInState(cinemaIndex, roomIndex, optimisticRoom);

    try {
      const result = await cinemaRoomService.updateSeatTypeManager(seatId, nextType);
      if (!result.success) {
        const reverted = {
          ...room,
          seats: room.seats.map(s => (s.seatId === seatId ? { ...currentSeat } : s)),
        };
        patchRoomInState(cinemaIndex, roomIndex, reverted);
        showNotification(result.error || 'Không thể cập nhật loại ghế', 'error');
      }
    } catch (error) {
      const reverted = {
        ...room,
        seats: room.seats.map(s => (s.seatId === seatId ? { ...currentSeat } : s)),
      };
      patchRoomInState(cinemaIndex, roomIndex, reverted);
      showNotification('Có lỗi xảy ra khi cập nhật loại ghế', 'error');
    }
  };

  const handleEmptyCellClick = async (rowChar, col) => {
    if (!selectedCinema || !selectedRoom) return;
    const cinemaIndex = cinemas.findIndex(c => c.complexId === selectedCinema.complexId);
    if (cinemaIndex === -1) return;
    const roomIndex = cinemas[cinemaIndex].rooms.findIndex(r => r.roomId === selectedRoom.roomId);
    if (roomIndex === -1) return;
    const room = cinemas[cinemaIndex].rooms[roomIndex];

    const { default: cinemaRoomService } = await import('../../services/cinemaRoomService');
    try {
      const result = await cinemaRoomService.addSeatManager(selectedRoom.roomId, {
        seatRow: rowChar,
        seatColumn: col,
        gridRows: selectedRoom.rows,
        gridCols: selectedRoom.cols,
        type: 'NORMAL',
      });
      if (!result.success || !result.data) {
        showNotification(result.error || 'Không thể thêm ghế', 'error');
        return;
      }
      const d = result.data;
      const newSeat = {
        seatId: d.seatId,
        type: d.type,
        row: d.seatRow,
        column: d.seatColumn,
      };
      const updatedRoom = {
        ...room,
        seats: [...room.seats, newSeat],
      };
      patchRoomInState(cinemaIndex, roomIndex, updatedRoom);
    } catch (e) {
      showNotification('Có lỗi khi thêm ghế', 'error');
    }
  };

  const renderSeatLayout = (room) => {
    if (!room || !room.rows || !room.cols) return null;

    // Create a map of seats by row and column for quick lookup
    const seatMap = new Map();
    if (room.seats && room.seats.length > 0) {
      room.seats.forEach(seat => {
        const key = `${seat.row}-${seat.column}`;
        seatMap.set(key, seat);
      });
    }

    const rows = [];
    for (let i = 0; i < room.rows; i++) {
      rows.push(String.fromCharCode(65 + i));
    }

    return (
      <div className="seat-layout">
        <div className="seat-layout__screen">
          <div className="seat-layout__screen-label">🎬 Màn hình 🎬</div>
        </div>
        <div className="seat-layout__grid">
          {rows.map(rowChar => (
            <div key={rowChar} className="seat-layout__row">
              <div className="seat-layout__row-label" style={{
                minWidth: '32px',
                textAlign: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                {rowChar}
              </div>
              <div className="seat-layout__seats">
                {Array.from({ length: room.cols }, (_, ci) => {
                  const col = ci + 1;
                  const key = `${rowChar}-${col}`;
                  const seat = seatMap.get(key);
                  if (seat && seat.seatId) {
                    const isCouple = seat.type === 'COUPLE';
                    const nextHint = seat.type === 'COUPLE'
                      ? ' — Click: thành trống'
                      : seat.type === 'VIP'
                        ? ' — Click: thành Đôi'
                        : ' — Click: thành VIP';
                    return (
                      <button
                        key={seat.seatId}
                        type="button"
                        className={`seat-button ${isCouple ? 'seat-button--couple' : ''}`}
                        style={{
                          backgroundColor: getSeatColor(seat.type),
                          borderColor: getSeatColor(seat.type),
                          width: isCouple ? '64px' : '44px',
                        }}
                        onClick={() => handleSeatClick(seat.seatId)}
                        title={`${seat.row}${seat.column} — ${seat.type === 'NORMAL' ? 'Thường' : seat.type === 'VIP' ? 'VIP' : 'Đôi'}${nextHint}`}
                      >
                        <span className="seat-button__number">{seat.column}</span>
                        {seat.type !== 'NORMAL' && (
                          <span className="seat-button__type">
                            {seat.type === 'COUPLE' ? '💑' : seat.type === 'VIP' ? '⭐' : ''}
                          </span>
                        )}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={`empty-${rowChar}-${col}`}
                      type="button"
                      className="seat-button seat-button--empty-slot"
                      style={{
                        width: '44px',
                        minWidth: '44px',
                        height: '44px',
                        padding: 0,
                        borderRadius: '8px',
                        border: '2px dashed rgba(255,255,255,0.35)',
                        background: 'repeating-linear-gradient(135deg, rgba(40,40,45,0.9) 0, rgba(40,40,45,0.9) 4px, rgba(25,25,30,0.95) 4px, rgba(25,25,30,0.95) 8px)',
                        color: 'rgba(255,255,255,0.55)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                      onClick={() => handleEmptyCellClick(rowChar, col)}
                      title={`${rowChar}${col} — Trống (click để thêm ghế Thường)`}
                    >
                      {col}
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
              <div className="seat-legend__color" style={{ backgroundColor: getSeatColor('NORMAL') }}></div>
              <span>Thường → VIP → Đôi → trống</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{ backgroundColor: getSeatColor('VIP') }}>⭐</div>
              <span>VIP</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{ backgroundColor: getSeatColor('COUPLE'), width: '48px' }}>💑</div>
              <span>Đôi — click thêm lần = trống</span>
            </div>
            <div className="seat-legend__item">
              <div className="seat-legend__color" style={{
                background: 'repeating-linear-gradient(135deg, #444 0, #444 3px, #222 3px, #222 6px)',
                border: '1px dashed #666',
              }} />
              <span>Ô trống — click thêm ghế</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Removed console.logs to reduce noise - uncomment for debugging if needed
  // console.log('ManagerCinemaManagement: Rendering with cinemas:', cinemas);
  // console.log('ManagerCinemaManagement: cinemas.length:', cinemas?.length || 0);
  // console.log('ManagerCinemaManagement: selectedCinema:', selectedCinema);

  return (
    <div className="cinema-management">
      <div className="cinema-management__header" style={{ marginBottom: '32px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
            Quản lý rạp
          </h2>
        </div>
      </div>
      <div className="cinema-management__content">
        {!cinemas || cinemas.length === 0 ? (
          <div className="cinema-empty-state" style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#c9c4c5'
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Chưa có cụm rạp nào được gán cho bạn</p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>Vui lòng liên hệ admin để được gán cụm rạp</p>
          </div>
        ) : (
          <div className="cinema-list">
            {cinemas.map(cinema => (
              <div key={cinema.complexId} className="cinema-card" style={{
                background: 'var(--panel-dark, #1e1718)',
                border: '1px solid rgba(232, 59, 65, 0.2)',
                borderRadius: '20px',
                padding: '32px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s ease'
              }}>
                <div className="cinema-card__header" style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(232, 59, 65, 0.2)' }}>
                  <div className="cinema-card__info" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'rgba(232, 59, 65, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(232, 59, 65, 0.3)'
                      }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#e83b41' }}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 className="cinema-card__name" style={{ 
                          margin: 0, 
                          fontSize: '26px', 
                          fontWeight: 700, 
                          color: '#fff',
                          marginBottom: '8px'
                        }}>
                          {cinema.name || 'Chưa có tên'}
                        </h3>
                        <div className="cinema-card__details" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c9c4c5', fontSize: '14px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span>{cinema.address || 'Chưa có địa chỉ'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'rgba(232, 59, 65, 0.2)',
                        border: '1px solid rgba(232, 59, 65, 0.3)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#e83b41'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>{cinema.rooms?.length || 0} phòng chiếu</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="cinema-card__rooms" style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 600 }}>
                      Phòng chiếu
                    </h4>
                    <button 
                      className="btn btn--primary btn--small" 
                      onClick={() => handleAddRoom(cinema)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Thêm phòng
                    </button>
                  </div>
                  {cinema.rooms && cinema.rooms.length === 0 ? (
                    <div className="cinema-empty" style={{
                      textAlign: 'center',
                      padding: '48px 20px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '14px',
                      background: 'rgba(10, 6, 20, 0.4)',
                      borderRadius: '12px',
                      border: '1px dashed rgba(232, 59, 65, 0.2)'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.4, margin: '0 auto 12px' }}>
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <p style={{ margin: 0 }}>Chưa có phòng chiếu. Nhấn "Thêm phòng" để tạo mới.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                      {cinema.rooms.map(room => (
                        <div key={room.roomId} className="room-card" style={{
                          background: 'var(--panel-dark, #1e1718)',
                          border: '1px solid rgba(232, 59, 65, 0.2)',
                          borderRadius: '16px',
                          padding: '20px',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}>
                          <div className="room-card__header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="room-card__info" style={{ width: '100%' }}>
                              <h4 className="room-card__name" style={{ 
                                fontSize: '18px', 
                                fontWeight: 700, 
                                margin: '0 0 12px', 
                                color: '#fff' 
                              }}>
                                {room.roomName}
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '0' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 12px',
                                  background: 'rgba(232, 59, 65, 0.2)',
                                  border: '1px solid rgba(232, 59, 65, 0.3)',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#e83b41'
                                }}>
                                  {room.roomType}
                                </span>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 12px',
                                  background: 'rgba(232, 59, 65, 0.2)',
                                  border: '1px solid rgba(232, 59, 65, 0.3)',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#e83b41'
                                }}>
                                  {room.rows} × {room.cols}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="room-card__actions" style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            flexWrap: 'wrap',
                            width: '100%',
                            marginTop: '4px'
                          }}>
                            <button
                              className="btn btn--ghost btn--small"
                              onClick={() => openShowtimes(cinema, room)}
                              style={{ flex: '1 1 auto', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                              </svg>
                              Lịch chiếu
                            </button>
                            <button
                              className="cinema-action-btn"
                              onClick={() => { setSelectedRoom(room); setSelectedCinema(cinema); }}
                              title="Xem layout ghế"
                              style={{ flexShrink: 0 }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="M9 9h6v6H9z"/>
                              </svg>
                            </button>
                            <button 
                              className="cinema-action-btn" 
                              onClick={() => handleEditRoom(cinema, room)} 
                              title="Chỉnh sửa"
                              style={{ flexShrink: 0 }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button 
                              className="cinema-action-btn cinema-action-btn--delete" 
                              onClick={() => handleDeleteRoom(cinema, room.roomId)} 
                              title="Xóa"
                              style={{ flexShrink: 0 }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seat Layout Modal */}
      {selectedRoom && (
        <div className="seat-layout-modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="seat-layout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seat-layout-modal__header">
              <h2>{selectedRoom.roomName} - {selectedCinema?.name}</h2>
              <button className="seat-layout-modal__close" onClick={() => setSelectedRoom(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="seat-layout-modal__content">
              <p className="seat-layout-modal__hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                Click ghế: Thường → VIP → Đôi → trống. Click ô trống để thêm ghế Thường.
              </p>
              {renderSeatLayout(selectedRoom)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px', borderTop: '1px solid #2a2729' }}>
              <button className="btn btn--ghost" onClick={() => setSelectedRoom(null)}>
                Đóng
              </button>
              <button className="btn btn--primary" onClick={() => setSelectedRoom(null)}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Showtime Modal - Redesigned */}
      {showShowtimeModal && selectedRoom && (
        <div className="movie-modal-overlay" onClick={() => { setShowShowtimeModal(false); setSelectedRoom(null); setShowtimeConflict(null); }}>
          <div className="movie-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="movie-modal__header">
              <h2>Lịch chiếu - {selectedRoom.roomName} • {selectedCinema?.name}</h2>
              <button className="movie-modal__close" onClick={() => { setShowShowtimeModal(false); setSelectedRoom(null); setShowtimeConflict(null); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="movie-modal__content" style={{ overflowY: 'auto', flex: 1 }}>
              {/* Timeline View Section */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ 
                  color: '#fff', 
                  fontSize: '18px', 
                  fontWeight: 600, 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Lịch chiếu hiện tại
                </h3>

                {loadingShowtimes ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)'
                  }}>
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#e83b41] mb-4"></div>
                    <p style={{ color: '#c9c4c5', fontSize: '16px', margin: 0 }}>Đang tải lịch chiếu...</p>
                  </div>
                ) : Object.keys(showtimesByDate).length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)'
                  }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 20px', opacity: 0.3 }}>
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p style={{ color: '#c9c4c5', fontSize: '16px', margin: 0 }}>Chưa có lịch chiếu cho phòng này</p>
                    <p style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>Thêm lịch chiếu đầu tiên bằng form phía trên</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {Object.keys(showtimesByDate).sort().map(date => (
                      <div key={date} style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          marginBottom: '16px',
                          paddingBottom: '12px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#e83b41' }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span style={{ 
                            color: '#fff', 
                            fontSize: '16px', 
                            fontWeight: 600 
                          }}>
                            {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <span style={{ 
                            color: '#c9c4c5', 
                            fontSize: '14px',
                            marginLeft: 'auto'
                          }}>
                            {showtimesByDate[date].length} suất chiếu
                          </span>
                        </div>

                        {/* Timeline bars */}
                        <div style={{ position: 'relative', minHeight: '80px' }}>
                          {/* Timeline track */}
                          <div style={{
                            position: 'relative',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            height: '60px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            {showtimesByDate[date].map(st => {
                              const movie = movies.find(m => m.movieId === st.movieId);
                              const startHour = parseInt(st.startTime.split(':')[0]);
                              const startMin = parseInt(st.startTime.split(':')[1]);
                              const endHour = parseInt(st.endTime.split(':')[0]);
                              const endMin = parseInt(st.endTime.split(':')[1]);
                              const startMinutes = startHour * 60 + startMin;
                              const endMinutes = endHour * 60 + endMin;
                              const left = ((startMinutes - 8 * 60) / (24 * 60 - 8 * 60)) * 100;
                              const width = ((endMinutes - startMinutes) / (24 * 60 - 8 * 60)) * 100;
                              const isConflict = showtimeConflict && showtimeConflict.conflicts.some(c => c.showtimeId === st.showtimeId);
                              
                          return (
                                <div
                                  key={st.showtimeId}
                                  style={{
                                    position: 'absolute',
                                    left: `${Math.max(0, left)}%`,
                                    width: `${Math.min(100, width)}%`,
                                    minWidth: '120px',
                                    maxWidth: '200px',
                                    minHeight: '52px',
                                    height: 'auto',
                                    marginTop: '4px',
                                    marginLeft: '4px',
                                    background: 'linear-gradient(135deg, #e83b41 0%, #c62828 100%)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '8px 12px',
                                    cursor: 'default',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                    boxSizing: 'border-box'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                    e.currentTarget.style.zIndex = '10';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.zIndex = '1';
                                  }}
                                >
                                  <div style={{ 
                                    minWidth: 0,
                                    width: '100%'
                                  }}>
                                    <div style={{ 
                                      fontSize: '13px', 
                                      fontWeight: 600, 
                                      color: '#fff',
                                      marginBottom: '2px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '1.4'
                                    }}>
                                      {truncateTitle(movie?.title || `Phim #${st.movieId}`, 10)}
                                    </div>
                                    <div style={{ 
                                      fontSize: '11px', 
                                      color: 'rgba(255, 255, 255, 0.9)',
                                      display: 'flex',
                                      gap: '8px',
                                      alignItems: 'center'
                                    }}>
                                      <span>{st.startTime} - {st.endTime}</span>
                                      <span style={{ opacity: 0.8 }}>•</span>
                                      <span>{st.format}</span>
                                      <span style={{ opacity: 0.8 }}>•</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* List view below timeline */}
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {showtimesByDate[date].map(st => {
                            const movie = movies.find(m => m.movieId === st.movieId);
                            return (
                              <div 
                                key={st.showtimeId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '16px',
                                  padding: '12px',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 600, 
                                    color: '#fff',
                                    marginBottom: '4px',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'normal',
                                    lineHeight: '1.4'
                                  }}>
                                    {truncateTitle(movie?.title || `Phim #${st.movieId}`, 25)}
                                  </div>
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#c9c4c5',
                                    display: 'flex',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                  }}>
                                    <span>🕐 {st.startTime} - {st.endTime}</span>
                                    <span>🎬 {st.format}</span>
                                    <span>🗣️ {st.language}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          borderRadius: '12px',
          background: notification.type === 'success' 
            ? 'rgba(76, 175, 80, 0.95)' 
            : 'rgba(244, 67, 54, 0.95)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          maxWidth: '500px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {notification.type === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{notification.message}</span>
        </div>
      )}


      {/* Room Modal */}
      {showRoomModal && (
        <div className="movie-modal-overlay" onClick={() => setShowRoomModal(false)}>
          <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
            <div className="movie-modal__header">
              <h2>{editingRoom ? 'Chỉnh sửa phòng chiếu' : 'Thêm phòng chiếu'}</h2>
              <button className="movie-modal__close" onClick={() => setShowRoomModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="movie-modal__content">
              <div className="movie-form">
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Tên phòng <span className="required">*</span></label>
                    <input
                      type="text"
                      value={roomFormData.roomName}
                      onChange={(e) => setRoomFormData({ ...roomFormData, roomName: e.target.value })}
                      placeholder="VD: Phòng 1"
                    />
                  </div>
                  <div className="movie-form__group">
                    <label>Loại phòng <span className="required">*</span></label>
                    <select
                      value={roomFormData.roomType}
                      onChange={(e) => setRoomFormData({ ...roomFormData, roomType: e.target.value })}
                    >
                      {ROOM_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Số hàng <span className="required">*</span></label>
                    <input
                      type="number"
                      value={roomFormData.rows}
                      onChange={(e) => {
                        const rows = parseInt(e.target.value, 10) || 0;
                        setRoomFormData(prev => ({
                          ...prev,
                          rows,
                          emptyCells: filterEmptyCellsForDimensions(prev.emptyCells || [], rows, prev.cols),
                        }));
                      }}
                      min="1"
                      max="26"
                    />
                  </div>
                  <div className="movie-form__group">
                    <label>Số cột <span className="required">*</span></label>
                    <input
                      type="number"
                      value={roomFormData.cols}
                      onChange={(e) => {
                        const cols = parseInt(e.target.value, 10) || 0;
                        setRoomFormData(prev => ({
                          ...prev,
                          cols,
                          emptyCells: filterEmptyCellsForDimensions(prev.emptyCells || [], prev.rows, cols),
                        }));
                      }}
                      min="1"
                      max="30"
                    />
                  </div>
                </div>
                {!editingRoom && (
                  <p style={{ fontSize: '13px', color: '#c9c4c5', marginTop: 10, lineHeight: 1.5 }}>
                    Phòng mới là lưới đầy ghế Thường (hình chữ nhật). Sau khi tạo, mở <strong>sơ đồ ghế</strong> để thêm lối đi, VIP, ghế đôi hoặc xóa vị trí như trước.
                  </p>
                )}
                {editingRoom && (
                  <div className="movie-form__group" style={{ marginTop: '8px' }}>
                    <label>Sơ đồ ghế (xem trước — giống màn xem layout)</label>
                    <p style={{ fontSize: '13px', color: '#c9c4c5', margin: '0 0 10px' }}>
                      Màu xanh / vàng ⭐ / đôi 💑 theo quy tắc tạo lại layout. Ô sọc khóa = lối đi mặc định.
                      Click ô ghế để đánh dấu/bỏ <strong>ô trống thêm</strong>. Phải còn ít nhất một ghế.
                    </p>
                    <div style={{ overflowX: 'auto', paddingBottom: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px' }}>
                      <div style={{ marginBottom: 8, textAlign: 'center', padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(90deg, #2d1f4a, #1a1530)', color: '#c9b8e8', fontSize: 12, fontWeight: 600 }}>
                        🎬 Màn hình 🎬
                      </div>
                      {Array.from({ length: Math.min(26, Math.max(0, roomFormData.rows)) }, (_, ri) => {
                        const rowChar = String.fromCharCode(65 + ri);
                        const r = Math.min(26, Math.max(0, roomFormData.rows));
                        const c = Math.min(30, Math.max(0, roomFormData.cols));
                        return (
                          <div key={rowChar} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ width: 24, color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{rowChar}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                              {Array.from({ length: c }, (_, ci) => {
                                const col = ci + 1;
                                const cell = getRoomFormGridCellDisplay(ri, col, r, c, roomFormData.emptyCells, editingRoom);
                                if (cell.mode === 'walkway') {
                                  return (
                                    <button
                                      type="button"
                                      key={cell.key}
                                      disabled
                                      title={`${cell.key} — lối đi mặc định`}
                                      style={{
                                        width: 44,
                                        height: 44,
                                        padding: 0,
                                        borderRadius: 8,
                                        border: '2px solid rgba(255,255,255,0.2)',
                                        background: 'repeating-linear-gradient(135deg, #333 0, #333 4px, #1a1a1a 4px, #1a1a1a 8px)',
                                        color: 'rgba(255,255,255,0.4)',
                                        cursor: 'default',
                                        fontSize: 11,
                                        fontWeight: 600,
                                      }}
                                    >
                                      ·
                                    </button>
                                  );
                                }
                                if (cell.mode === 'userEmpty') {
                                  return (
                                    <button
                                      type="button"
                                      key={cell.key}
                                      onClick={() => toggleRoomFormEmptyCell(cell.key)}
                                      title={`${cell.key} — trống thêm (click để có ghế)`}
                                      style={{
                                        width: 44,
                                        height: 44,
                                        padding: 0,
                                        borderRadius: 8,
                                        border: '2px dashed rgba(255,255,255,0.45)',
                                        background: 'repeating-linear-gradient(135deg, rgba(45,45,50,0.95) 0, rgba(45,45,50,0.95) 4px, rgba(22,22,28,1) 4px, rgba(22,22,28,1) 8px)',
                                        color: 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {col}
                                    </button>
                                  );
                                }
                                const isCouple = cell.seatType === 'COUPLE';
                                const label = cell.seatType === 'NORMAL' ? 'Thường' : cell.seatType === 'VIP' ? 'VIP' : 'Đôi';
                                return (
                                  <button
                                    type="button"
                                    key={cell.key}
                                    onClick={() => toggleRoomFormEmptyCell(cell.key)}
                                    title={`${cell.key} — ${label} (click → ô trống thêm)`}
                                    style={{
                                      width: isCouple ? 64 : 44,
                                      minWidth: isCouple ? 64 : 44,
                                      height: 44,
                                      padding: 0,
                                      borderRadius: 8,
                                      border: `1px solid ${getSeatColor(cell.seatType)}`,
                                      backgroundColor: getSeatColor(cell.seatType),
                                      color: '#fff',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 2,
                                    }}
                                  >
                                    <span>{col}</span>
                                    {cell.seatType === 'VIP' ? <span>⭐</span> : null}
                                    {cell.seatType === 'COUPLE' ? <span>💑</span> : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {editingRoom && (
                  <div className="movie-form__group">
                    <p className="movie-modal__warning">⚠️ Thay đổi số hàng/cột hoặc ô trống sẽ tạo lại toàn bộ layout ghế (nếu phòng chưa có vé đã thanh toán).</p>
                  </div>
                )}
              </div>
            </div>
            <div className="movie-modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowRoomModal(false)}>Hủy</button>
              <button 
                type="button"
                className="btn btn--primary" 
                onClick={handleSaveRoom}
                disabled={savingRoom}
              >
                {savingRoom ? 'Đang xử lý...' : (editingRoom ? 'Cập nhật' : 'Thêm phòng')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title={deleteConfirm?.name}
        message={
          deleteConfirm?.type === 'room' 
            ? `Bạn có chắc chắn muốn xóa phòng chiếu "${deleteConfirm.name}"?`
            : deleteConfirm?.type === 'showtime'
            ? `Bạn có chắc chắn muốn xóa lịch chiếu "${deleteConfirm.name}"?`
            : ''
        }
        confirmText={deleteConfirm?.type === 'room' ? 'Xóa phòng chiếu' : 'Xóa lịch chiếu'}
        isDeleting={savingRoom}
      />
    </div>
  );
}

export default ManagerCinemaManagement;


