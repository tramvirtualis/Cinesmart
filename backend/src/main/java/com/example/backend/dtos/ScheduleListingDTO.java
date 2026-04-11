package com.example.backend.dtos;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleListingDTO {
    private Long showtimeId;

    private Long movieId;
    private String movieTitle;
    private String moviePoster;

    private Long cinemaId;
    private String cinemaName;
    private String cinemaAddress;

    private Long cinemaRoomId;
    private String cinemaRoomName;

    private String formatLabel;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}


