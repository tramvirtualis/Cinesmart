package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "movie_id")
    private Movie movie;

    private Integer rating;
    private String context;
    private LocalDateTime createdAt;
    private LocalDateTime createdUpdate;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean isHidden = false; // Admin can hide inappropriate reviews
    
    @Column(nullable = false)
    @Builder.Default
    private Integer reportCount = 0; // Number of times this review has been reported
}
