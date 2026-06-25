package com.example.backend.dtos.n8n;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class N8nShowtimeSummaryDTO {
    private Long showtimeId;
    private Long movieId;
    private String movieTitle;
    private String cinemaName;
    private String province;
    private String roomName;
    private String roomType;
    private LocalDateTime startTime;
    private BigDecimal price;
}
