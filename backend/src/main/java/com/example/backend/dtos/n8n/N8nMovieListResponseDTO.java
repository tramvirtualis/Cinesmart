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
public class N8nMovieListResponseDTO {
    private String listType;
    private String description;
    private LocalDate date;
    private String province;
    private List<N8nMovieSummaryDTO> movies;
}
