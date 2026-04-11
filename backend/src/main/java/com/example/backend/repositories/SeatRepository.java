package com.example.backend.repositories;

import com.example.backend.entities.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findByCinemaRoom_RoomId(Long roomId);

    long countByCinemaRoom_RoomId(Long roomId);

    boolean existsByCinemaRoom_RoomIdAndSeatRowAndSeatColumn(Long roomId, String seatRow, Integer seatColumn);
}

