package com.example.backend.dtos;

import com.example.backend.entities.enums.RoomType;
import com.example.backend.entities.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceDTO {
    private Long id;
    private RoomType roomType;
    private SeatType seatType;
    private BigDecimal price;
}
