package com.example.backend.dtos.n8n;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class N8nShowtimeListResponseDTO {
    private String movieTitle;
    private LocalDate date;
    private String province;
    private String description;
    private List<N8nShowtimeSummaryDTO> showtimes;
}
