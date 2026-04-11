package com.example.backend.dtos;

import com.example.backend.entities.enums.RoomType;
import com.example.backend.entities.enums.SeatType;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PriceRequestDTO {
    private Long id;
    private RoomType roomType;
    private SeatType seatType;
    private BigDecimal price;
}

