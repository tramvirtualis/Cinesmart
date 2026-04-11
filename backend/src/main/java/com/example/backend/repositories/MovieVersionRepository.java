package com.example.backend.repositories;

import com.example.backend.entities.Movie;
import com.example.backend.entities.MovieVersion;
import com.example.backend.entities.enums.Language;
import com.example.backend.entities.enums.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MovieVersionRepository extends JpaRepository<MovieVersion, Long> {
    List<MovieVersion> findByMovie(Movie movie);
    Optional<MovieVersion> findByMovieAndRoomTypeAndLanguage(Movie movie, RoomType roomType, Language language);
}

