package com.example.backend.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dtos.ScheduleCinemaDTO;
import com.example.backend.dtos.ScheduleListingDTO;
import com.example.backend.dtos.ScheduleMovieDTO;
import com.example.backend.dtos.ScheduleOptionsResponseDTO;
import com.example.backend.entities.Address;
import com.example.backend.entities.CinemaComplex;
import com.example.backend.entities.CinemaRoom;
import com.example.backend.entities.Movie;
import com.example.backend.entities.MovieVersion;
import com.example.backend.entities.Showtime;
import com.example.backend.entities.enums.Language;
import com.example.backend.entities.enums.RoomType;
import com.example.backend.repositories.ShowtimeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ShowtimeRepository showtimeRepository;

    @Transactional(readOnly = true)
    public ScheduleOptionsResponseDTO getScheduleOptions(LocalDate date, Long movieId, Long cinemaId) {
        List<Showtime> showtimes = fetchShowtimes(date, movieId, cinemaId);

        Map<Long, ScheduleMovieDTO> movies = new LinkedHashMap<>();
        Map<Long, ScheduleCinemaDTO> cinemas = new LinkedHashMap<>();

        for (Showtime showtime : showtimes) {
            Movie movie = getMovie(showtime);
            if (movie != null) {
                movies.putIfAbsent(movie.getMovieId(), ScheduleMovieDTO.builder()
                    .movieId(movie.getMovieId())
                    .title(movie.getTitle())
                    .poster(movie.getPoster())
                    .build());
            }

            CinemaComplex complex = getComplex(showtime);
            if (complex != null) {
                cinemas.putIfAbsent(complex.getComplexId(), ScheduleCinemaDTO.builder()
                    .cinemaId(complex.getComplexId())
                    .name(complex.getName())
                    .address(buildAddress(complex.getAddress()))
                    .build());
            }
        }

        return ScheduleOptionsResponseDTO.builder()
            .movies(new ArrayList<>(movies.values()))
            .cinemas(new ArrayList<>(cinemas.values()))
            .build();
    }

    @Transactional(readOnly = true)
    public List<ScheduleListingDTO> getScheduleListings(LocalDate date, Long movieId, Long cinemaId) {
        List<Showtime> showtimes = fetchShowtimes(date, movieId, cinemaId);
        List<ScheduleListingDTO> response = new ArrayList<>();

        for (Showtime showtime : showtimes) {
            Movie movie = getMovie(showtime);
            CinemaComplex complex = getComplex(showtime);
            CinemaRoom room = showtime.getCinemaRoom();
            MovieVersion version = showtime.getMovieVersion();

            response.add(ScheduleListingDTO.builder()
                .showtimeId(showtime.getShowtimeId())
                .movieId(movie != null ? movie.getMovieId() : null)
                .movieTitle(movie != null ? movie.getTitle() : null)
                .moviePoster(movie != null ? movie.getPoster() : null)
                .cinemaId(complex != null ? complex.getComplexId() : null)
                .cinemaName(complex != null ? complex.getName() : null)
                .cinemaAddress(complex != null ? buildAddress(complex.getAddress()) : null)
                .cinemaRoomId(room != null ? room.getRoomId() : null)
                .cinemaRoomName(room != null ? room.getRoomName() : null)
                .formatLabel(buildFormatLabel(version))
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .build());
        }

        return response;
    }

    private List<Showtime> fetchShowtimes(LocalDate date, Long movieId, Long cinemaId) {
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = null;

        if (date != null) {
            LocalDateTime dateStart = date.atStartOfDay();
            // Nếu ngày được chọn là hôm nay hoặc sau, dùng hiện tại
            // Nếu ngày được chọn là trong tương lai, dùng đầu ngày
            if (dateStart.isAfter(startTime)) {
                startTime = dateStart;
            }
            endTime = dateStart.plusDays(1);
        } else {
            // Nếu không chọn ngày, lấy showtimes từ bây giờ đến 30 ngày tới để cover danh sách phim đang chiếu
            endTime = LocalDate.now().atStartOfDay().plusDays(30);
        }

        return showtimeRepository.findScheduleShowtimes(startTime, endTime, movieId, cinemaId);
    }

    private Movie getMovie(Showtime showtime) {
        MovieVersion mv = showtime.getMovieVersion();
        return mv != null ? mv.getMovie() : null;
    }

    private CinemaComplex getComplex(Showtime showtime) {
        CinemaRoom room = showtime.getCinemaRoom();
        return room != null ? room.getCinemaComplex() : null;
    }

    private String buildAddress(Address address) {
        if (address == null) {
            return null;
        }

        String description = address.getDescription();
        String province = address.getProvince();
        boolean hasDescription = description != null && !description.isBlank();
        boolean hasProvince = province != null && !province.isBlank();

        if (hasDescription && hasProvince) {
            return description + ", " + province;
        }
        if (hasDescription) {
            return description;
        }
        return hasProvince ? province : null;
    }

    private String buildFormatLabel(MovieVersion version) {
        if (version == null) {
            return "STANDARD";
        }
        RoomType roomType = version.getRoomType();
        Language language = version.getLanguage();

        if (roomType == null && language == null) {
            return "STANDARD";
        }

        if (roomType != null && language != null) {
            return roomType.name() + " • " + language.name();
        }

        return roomType != null ? roomType.name() : language.name();
    }
}


