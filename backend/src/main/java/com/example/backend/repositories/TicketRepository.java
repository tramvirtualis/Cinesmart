package com.example.backend.repositories;

import com.example.backend.entities.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    @Query("SELECT COUNT(t) > 0 FROM Ticket t WHERE t.showtime.cinemaRoom.roomId = :roomId")
    boolean existsByRoomId(@Param("roomId") Long roomId);
    
    @Query("SELECT t FROM Ticket t WHERE t.showtime.cinemaRoom.roomId = :roomId")
    List<Ticket> findByRoomId(@Param("roomId") Long roomId);
    
    /**
     * Kiểm tra xem có vé đã thanh toán (có order với vnpPayDate != null) cho cụm rạp không
     */
    @Query("SELECT COUNT(t) > 0 FROM Ticket t " +
           "WHERE t.showtime.cinemaRoom.cinemaComplex.complexId = :complexId " +
           "AND t.order.vnpPayDate IS NOT NULL " +
           "AND (t.order.status IS NULL OR t.order.status <> com.example.backend.entities.enums.OrderStatus.CANCELLED)")
    boolean existsPaidTicketsByComplexId(@Param("complexId") Long complexId);
    
    /**
     * Kiểm tra xem có vé đã thanh toán cho phòng chiếu không
     */
    @Query("SELECT COUNT(t) > 0 FROM Ticket t " +
           "WHERE t.showtime.cinemaRoom.roomId = :roomId " +
           "AND t.order.vnpPayDate IS NOT NULL " +
           "AND (t.order.status IS NULL OR t.order.status <> com.example.backend.entities.enums.OrderStatus.CANCELLED)")
    boolean existsPaidTicketsByRoomId(@Param("roomId") Long roomId);
    
    /**
     * Kiểm tra xem có vé đã thanh toán cho suất chiếu không
     */
    @Query("SELECT COUNT(t) > 0 FROM Ticket t " +
           "WHERE t.showtime.showtimeId = :showtimeId " +
           "AND t.order.vnpPayDate IS NOT NULL " +
           "AND (t.order.status IS NULL OR t.order.status <> com.example.backend.entities.enums.OrderStatus.CANCELLED)")
    boolean existsPaidTicketsByShowtimeId(@Param("showtimeId") Long showtimeId);
    
    /**
     * Kiểm tra xem có vé đã thanh toán cho ghế không
     */
    @Query("SELECT COUNT(t) > 0 FROM Ticket t " +
           "WHERE t.seat.seatId = :seatId " +
           "AND t.order.vnpPayDate IS NOT NULL " +
           "AND (t.order.status IS NULL OR t.order.status <> com.example.backend.entities.enums.OrderStatus.CANCELLED)")
    boolean existsPaidTicketsBySeatId(@Param("seatId") Long seatId);

    /**
     * Kiểm tra xem có vé đã thanh toán cho ghế trong một suất chiếu cụ thể không
     */
    @Query("SELECT COUNT(t) > 0 FROM Ticket t " +
           "WHERE t.seat.seatId = :seatId " +
           "AND t.showtime.showtimeId = :showtimeId " +
           "AND t.order.vnpPayDate IS NOT NULL " +
           "AND (t.order.status IS NULL OR t.order.status <> com.example.backend.entities.enums.OrderStatus.CANCELLED)")
    boolean existsPaidTicketBySeatAndShowtime(@Param("seatId") Long seatId, @Param("showtimeId") Long showtimeId);

    @Query("SELECT COUNT(t) > 0 FROM Ticket t WHERE t.seat.seatId = :seatId")
    boolean existsAnyTicketForSeatId(@Param("seatId") Long seatId);
    
    /**
     * Kiểm tra xem có vé đã thanh toán cho phim không
     */
    @Query("SELECT COUNT(t) > 0 FROM Ticket t " +
           "JOIN t.showtime s " +
           "JOIN s.movieVersion mv " +
           "JOIN mv.movie m " +
           "WHERE m.movieId = :movieId " +
           "AND t.order.vnpPayDate IS NOT NULL " +
           "AND (t.order.status IS NULL OR t.order.status <> com.example.backend.entities.enums.OrderStatus.CANCELLED)")
    boolean existsPaidTicketsByMovieId(@Param("movieId") Long movieId);
    
    /**
     * Kiểm tra xem có vé đã thanh toán cho phim tại một cụm rạp cụ thể không
     */
    @Query("SELECT COUNT(t) > 0 FROM Ticket t " +
           "JOIN t.showtime s " +
           "JOIN s.movieVersion mv " +
           "JOIN mv.movie m " +
           "WHERE m.movieId = :movieId " +
           "AND s.cinemaRoom.cinemaComplex.complexId = :complexId " +
           "AND t.order.vnpPayDate IS NOT NULL " +
           "AND (t.order.status IS NULL OR t.order.status <> com.example.backend.entities.enums.OrderStatus.CANCELLED)")
    boolean existsPaidTicketsByMovieAndComplex(@Param("movieId") Long movieId, @Param("complexId") Long complexId);
}

