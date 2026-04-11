package com.example.backend.repositories;

import com.example.backend.entities.ReviewReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {
    // Check if a user has already reported a review
    Optional<ReviewReport> findByReviewReviewIdAndUserUserId(Long reviewId, Long userId);
    
    // Count reports for a review
    long countByReviewReviewId(Long reviewId);
    
    // Get all reports for a review
    List<ReviewReport> findByReviewReviewIdOrderByReportedAtDesc(Long reviewId);
}


