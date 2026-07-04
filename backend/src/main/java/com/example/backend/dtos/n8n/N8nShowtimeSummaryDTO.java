package com.example.backend.dtos.n8n;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class N8nShowtimeSummaryDTO {
    @JsonIgnore
    private Long showtimeId;

    @JsonIgnore
    private Long movieId;

    private String movieTitle;
    private String cinemaName;
    private String province;
    private String roomName;
    private String roomType;
    /** Formatted for display, e.g. "18:00 10/06/2026" */
    private String showtimeLabel;
    private BigDecimal price;
}
