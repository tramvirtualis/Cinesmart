package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemDTO {
    private Long ticketId;
    private Long movieId;
    private String movieTitle;
    private String moviePoster;
    private Long cinemaComplexId;
    private String cinemaComplexName;
    private String cinemaAddress;
    private Long roomId;
    private String roomName;
    private String roomType; // 2D, 3D, DELUXE
    private Long showtimeId; // Showtime ID for QR code generation
    private LocalDateTime showtimeStart;
    private LocalDateTime showtimeEnd;
    private String seatId; // Format: "A1", "B2", etc.
    private String seatRow;
    private Integer seatColumn;
    private BigDecimal price; // Adjusted price (with 30% if weekend)
    private BigDecimal basePrice; // Base price (without 30%)
}

