package com.example.backend.repositories;

import com.example.backend.entities.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {
    
    @Query("SELECT s FROM Showtime s " +
           "LEFT JOIN FETCH s.movieVersion mv " +
           "LEFT JOIN FETCH mv.movie m " +
           "LEFT JOIN FETCH s.cinemaRoom cr " +
           "WHERE cr.roomId = :roomId " +
           "ORDER BY s.startTime ASC")
    List<Showtime> findByCinemaRoom_RoomId(@Param("roomId") Long roomId);
    
    @Query("SELECT s FROM Showtime s " +
           "LEFT JOIN FETCH s.movieVersion mv " +
           "LEFT JOIN FETCH mv.movie m " +
           "LEFT JOIN FETCH s.cinemaRoom cr " +
           "LEFT JOIN FETCH s.tickets t " +
           "WHERE s.showtimeId = :showtimeId")
    Optional<Showtime> findByIdWithRelations(@Param("showtimeId") Long showtimeId);
    
    @Query("SELECT COUNT(s) > 0 FROM Showtime s WHERE s.cinemaRoom.roomId = :roomId AND EXISTS (SELECT t FROM Ticket t WHERE t.showtime = s)")
    boolean existsByRoomIdWithTickets(@Param("roomId") Long roomId);
    
    /**
     * Lấy showtimes theo movieId, province và date (public API)
     * Query trực tiếp qua MovieVersion để đảm bảo lấy được đúng
     * CHỈ lấy showtimes khi roomType của MovieVersion khớp với roomType của CinemaRoom
     */
    @Query("SELECT DISTINCT s FROM Showtime s " +
           "INNER JOIN FETCH s.movieVersion mv " +
           "INNER JOIN FETCH mv.movie m " +
           "INNER JOIN FETCH s.cinemaRoom cr " +
           "INNER JOIN FETCH cr.cinemaComplex cc " +
           "INNER JOIN FETCH cc.address a " +
           "WHERE m.movieId = :movieId " +
           "AND mv.roomType = cr.roomType " +
           "AND (:province IS NULL OR a.province = :province) " +
           "AND s.startTime >= :startOfDay " +
           "AND s.startTime < :endOfDay " +
           "AND s.startTime >= CURRENT_TIMESTAMP " +
           "ORDER BY cc.name ASC, s.startTime ASC")
    List<Showtime> findPublicShowtimes(@Param("movieId") Long movieId, 
                                       @Param("province") String province,
                                       @Param("startOfDay") java.time.LocalDateTime startOfDay,
                                       @Param("endOfDay") java.time.LocalDateTime endOfDay);
    
    /**
     * Lấy tất cả showtimes theo movieId và date (không filter province)
     * Query đi từ Movie -> MovieVersion -> Showtime để đảm bảo lấy được đúng
     * CHỈ lấy showtimes khi roomType của MovieVersion khớp với roomType của CinemaRoom
     * Chỉ lấy showtimes trong tương lai (startTime >= CURRENT_TIMESTAMP)
     */
    @Query("SELECT DISTINCT s FROM Showtime s " +
           "INNER JOIN FETCH s.movieVersion mv " +
           "INNER JOIN FETCH mv.movie m " +
           "INNER JOIN FETCH s.cinemaRoom cr " +
           "INNER JOIN FETCH cr.cinemaComplex cc " +
           "INNER JOIN FETCH cc.address a " +
           "WHERE m.movieId = :movieId " +
           "AND mv.roomType = cr.roomType " +
           "AND s.startTime >= :startOfDay " +
           "AND s.startTime < :endOfDay " +
           "AND s.startTime >= CURRENT_TIMESTAMP " +
           "ORDER BY cc.name ASC, s.startTime ASC")
    List<Showtime> findPublicShowtimesWithoutProvince(@Param("movieId") Long movieId, 
                                                      @Param("startOfDay") java.time.LocalDateTime startOfDay,
                                                      @Param("endOfDay") java.time.LocalDateTime endOfDay);
    
    /**
     * Test query: Lấy tất cả showtimes theo movieId (không filter gì cả) - để debug
     * Query đi từ Movie -> MovieVersion -> Showtime để đảm bảo lấy được đúng
     */
    @Query("SELECT DISTINCT s FROM Showtime s " +
           "INNER JOIN FETCH s.movieVersion mv " +
           "INNER JOIN FETCH mv.movie m " +
           "INNER JOIN FETCH s.cinemaRoom cr " +
           "INNER JOIN FETCH cr.cinemaComplex cc " +
           "INNER JOIN FETCH cc.address a " +
           "WHERE m.movieId = :movieId " +
           "ORDER BY s.startTime ASC")
    List<Showtime> findAllByMovieId(@Param("movieId") Long movieId);

    /**
     * Lấy showtimes với nhiều filter options (cho schedule management)
     */
    @Query("""
        SELECT DISTINCT s FROM Showtime s
        LEFT JOIN FETCH s.movieVersion mv
        LEFT JOIN FETCH mv.movie m
        LEFT JOIN FETCH s.cinemaRoom cr
        LEFT JOIN FETCH cr.cinemaComplex cc
        LEFT JOIN FETCH cc.address addr
        WHERE (:startTime IS NULL OR s.startTime >= :startTime)
        AND (:endTime IS NULL OR s.startTime < :endTime)
        AND (:movieId IS NULL OR m.movieId = :movieId)
        AND (:cinemaId IS NULL OR cc.complexId = :cinemaId)
        ORDER BY m.title ASC, cc.name ASC, s.startTime ASC
    """)
    List<Showtime> findScheduleShowtimes(@Param("startTime") LocalDateTime startTime,
                                         @Param("endTime") LocalDateTime endTime,
                                         @Param("movieId") Long movieId,
                                         @Param("cinemaId") Long cinemaId);
    
    /**
     * Lấy showtimes theo roomId và ngày cụ thể (tối ưu cho validation)
     * Chỉ lấy các showtimes trong cùng ngày để kiểm tra xung đột
     */
    @Query("SELECT s FROM Showtime s " +
           "LEFT JOIN FETCH s.movieVersion mv " +
           "LEFT JOIN FETCH mv.movie m " +
           "LEFT JOIN FETCH s.cinemaRoom cr " +
           "WHERE cr.roomId = :roomId " +
           "AND s.startTime >= :startOfDay " +
           "AND s.startTime < :endOfDay " +
           "ORDER BY s.startTime ASC")
    List<Showtime> findByCinemaRoom_RoomIdAndDate(@Param("roomId") Long roomId, 
                                                   @Param("startOfDay") java.time.LocalDateTime startOfDay,
                                                   @Param("endOfDay") java.time.LocalDateTime endOfDay);
}

