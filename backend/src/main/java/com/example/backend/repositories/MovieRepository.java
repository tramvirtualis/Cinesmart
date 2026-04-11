package com.example.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.backend.entities.Movie;
import com.example.backend.entities.enums.MovieStatus;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {
    
    // Tìm phim theo trạng thái
    List<Movie> findByStatus(MovieStatus status);
    
    // Tìm phim đang chiếu: Phim đã có ít nhất 1 showtime (dù quá khứ hay tương lai)
    // Logic mới: Phim có showtime = "Đang chiếu", Phim chưa có showtime = "Sắp chiếu"
    @Query("SELECT DISTINCT m FROM Movie m " +
           "INNER JOIN m.versions mv " +
           "INNER JOIN mv.showtimes s " +
           "WHERE m.status != 'ENDED' " +
           "ORDER BY m.releaseDate DESC")
    List<Movie> findNowShowingMovies();
    
    // Tìm phim sắp chiếu: Phim chưa có showtime nào
    // Logic mới: Phim chưa có showtime = "Sắp chiếu"
    @Query("SELECT m FROM Movie m " +
           "WHERE m.status != 'ENDED' " +
           "AND NOT EXISTS (SELECT 1 FROM MovieVersion mv WHERE mv.movie = m AND EXISTS (SELECT 1 FROM Showtime s WHERE s.movieVersion = mv)) " +
           "ORDER BY m.releaseDate ASC")
    List<Movie> findComingSoonMovies();
}