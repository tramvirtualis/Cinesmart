package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponseDTO {
    private Long reviewId;
    private Long userId;
    private String username;
    private Long movieId;
    private String movieTitle;
    private Integer rating;
    private String context;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isHidden; // Whether the review is hidden by admin
    private Integer reportCount; // Number of times this review has been reported
    private String avatar; // User avatar URL
}


