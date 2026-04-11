package com.example.backend.repositories;

import com.example.backend.entities.Price;
import com.example.backend.entities.enums.RoomType;
import com.example.backend.entities.enums.SeatType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PriceRepository extends JpaRepository<Price, Long> {
    Optional<Price> findByRoomTypeAndSeatType(RoomType roomType, SeatType seatType);
}
