package com.example.backend.repositories;

import com.example.backend.entities.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByMovieMovieId(Long movieId);
    List<Review> findByMovieMovieIdAndIsHiddenFalse(Long movieId); // Only get visible reviews
    List<Review> findByUserUserId(Long userId);
    Optional<Review> findByUserUserIdAndMovieMovieId(Long userId, Long movieId);
    List<Review> findByReportCountGreaterThanOrderByReportCountDesc(Integer reportCount); // Get reported reviews sorted by report count
    List<Review> findAllByOrderByCreatedAtDesc(); // Get all reviews sorted by creation date descending
}


