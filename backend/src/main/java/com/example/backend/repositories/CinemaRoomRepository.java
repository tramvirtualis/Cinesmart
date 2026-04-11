package com.example.backend.repositories;

import com.example.backend.entities.CinemaRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, Long> {
    List<CinemaRoom> findByCinemaComplex_ComplexId(Long complexId);
    
    @Query("SELECT r FROM CinemaRoom r LEFT JOIN FETCH r.seatLayout WHERE r.roomId = :roomId")
    Optional<CinemaRoom> findByIdWithSeats(@Param("roomId") Long roomId);
    
    @Query("SELECT r FROM CinemaRoom r LEFT JOIN FETCH r.seatLayout WHERE r.cinemaComplex.complexId = :complexId")
    List<CinemaRoom> findByCinemaComplexIdWithSeats(@Param("complexId") Long complexId);
}

