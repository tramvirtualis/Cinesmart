package com.example.backend.dtos;

import com.example.backend.entities.enums.AgeRating;
import com.example.backend.entities.enums.Genre;
import com.example.backend.entities.enums.Language;
import com.example.backend.entities.enums.MovieStatus;
import com.example.backend.entities.enums.RoomType;
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
public class MovieResponseDTO {
    private Long movieId;
    private String title;
    private List<Genre> genre;
    private Integer duration;
    private LocalDate releaseDate;
    private AgeRating ageRating;
    private String actor;
    private String director;
    private String description;
    private String trailerURL;
    private String poster;
    private MovieStatus status;
    private List<RoomType> formats;
    private List<Language> languages;
}

