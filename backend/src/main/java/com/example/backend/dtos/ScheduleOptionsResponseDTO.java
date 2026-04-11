package com.example.backend.dtos;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleOptionsResponseDTO {
    private List<ScheduleMovieDTO> movies;
    private List<ScheduleCinemaDTO> cinemas;
}


