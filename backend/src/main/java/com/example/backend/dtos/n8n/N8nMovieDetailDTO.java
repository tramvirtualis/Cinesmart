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
public class N8nMovieDetailDTO {
    private Long id;

    private String title;
    private List<String> genres;
    private Integer duration;
    private LocalDate releaseDate;
    private String status;
    private String ageRating;
    private String director;
    private String actor;
    private String description;
    private String url;
}
