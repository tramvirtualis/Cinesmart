package com.example.backend.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dtos.CreateReviewDTO;
import com.example.backend.dtos.ReviewResponseDTO;
import com.example.backend.entities.Movie;
import com.example.backend.entities.Review;
import com.example.backend.entities.ReviewReport;
import com.example.backend.entities.User;
import com.example.backend.repositories.MovieRepository;
import com.example.backend.repositories.ReviewRepository;
import com.example.backend.repositories.ReviewReportRepository;
import com.example.backend.repositories.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewService {
    
    private final ReviewRepository reviewRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final ReviewReportRepository reviewReportRepository;
    private final NotificationService notificationService;
    
    @Transactional
    public ReviewResponseDTO createReview(CreateReviewDTO createReviewDTO) {
        // Lấy username từ SecurityContext
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        
        // Tìm user
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy người dùng");
        }
        User user = userOpt.get();
        
        // Tìm movie
        Optional<Movie> movieOpt = movieRepository.findById(createReviewDTO.getMovieId());
        if (movieOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy phim");
        }
        Movie movie = movieOpt.get();
        
        // Kiểm tra xem user đã đánh giá phim này chưa
        Optional<Review> existingReview = reviewRepository.findByUserUserIdAndMovieMovieId(
            user.getUserId(), 
            createReviewDTO.getMovieId()
        );
        
        Review review;
        if (existingReview.isPresent()) {
            // Cập nhật đánh giá đã có
            review = existingReview.get();
            review.setRating(createReviewDTO.getRating());
            review.setContext(createReviewDTO.getContext());
            review.setCreatedUpdate(LocalDateTime.now());
        } else {
            // Tạo đánh giá mới
            review = Review.builder()
                .user(user)
                .movie(movie)
                .rating(createReviewDTO.getRating())
                .context(createReviewDTO.getContext())
                .createdAt(LocalDateTime.now())
                .createdUpdate(LocalDateTime.now())
                .build();
        }
        
        Review savedReview = reviewRepository.save(review);
        
        // Gửi thông báo WebSocket khi đánh giá thành công
        notificationService.notifyReviewSuccess(user.getUserId(), movie.getTitle());
        
        return mapToDTO(savedReview);
    }
    
    public List<ReviewResponseDTO> getReviewsByMovie(Long movieId) {
        // Only return reviews that are not hidden
        List<Review> reviews = reviewRepository.findByMovieMovieIdAndIsHiddenFalse(movieId);
        return reviews.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<ReviewResponseDTO> getReviewsByUser(Long userId) {
        List<Review> reviews = reviewRepository.findByUserUserId(userId);
        return reviews.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public void deleteReview(Long reviewId) {
        // Lấy username từ SecurityContext
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        
        // Tìm user
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy người dùng");
        }
        User user = userOpt.get();
        
        // Tìm review
        Optional<Review> reviewOpt = reviewRepository.findById(reviewId);
        if (reviewOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy đánh giá");
        }
        Review review = reviewOpt.get();
        
        // Kiểm tra quyền: chỉ user tạo review mới được xóa
        if (!review.getUser().getUserId().equals(user.getUserId())) {
            throw new RuntimeException("Bạn không có quyền xóa đánh giá này");
        }
        
        // Xóa tất cả reports liên quan
        List<ReviewReport> reports = reviewReportRepository.findByReviewReviewIdOrderByReportedAtDesc(reviewId);
        reviewReportRepository.deleteAll(reports);
        
        // Xóa review
        reviewRepository.delete(review);
    }
    
    @Transactional
    public void reportReview(Long reviewId, String reason) {
        // Lấy username từ SecurityContext
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        
        // Tìm user
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy người dùng");
        }
        User user = userOpt.get();
        
        // Tìm review
        Optional<Review> reviewOpt = reviewRepository.findById(reviewId);
        if (reviewOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy đánh giá");
        }
        Review review = reviewOpt.get();
        
        // Kiểm tra xem user đã report review này chưa
        Optional<ReviewReport> existingReport = reviewReportRepository.findByReviewReviewIdAndUserUserId(
            reviewId, 
            user.getUserId()
        );
        
        if (existingReport.isPresent()) {
            throw new RuntimeException("Bạn đã báo cáo đánh giá này rồi");
        }
        
        // Tạo report mới
        ReviewReport report = ReviewReport.builder()
            .review(review)
            .user(user)
            .reason(reason)
            .build();
        
        reviewReportRepository.save(report);
        
        // Tăng reportCount
        review.setReportCount(review.getReportCount() + 1);
        reviewRepository.save(review);
    }
    
    public List<ReviewResponseDTO> getAllReviews() {
        // Get all reviews for admin management
        List<Review> reviews = reviewRepository.findAllByOrderByCreatedAtDesc();
        return reviews.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<ReviewResponseDTO> getReportedReviews() {
        // Get all reviews that have been reported (reportCount > 0)
        List<Review> reviews = reviewRepository.findByReportCountGreaterThanOrderByReportCountDesc(0);
        return reviews.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public ReviewResponseDTO toggleReviewVisibility(Long reviewId) {
        Optional<Review> reviewOpt = reviewRepository.findById(reviewId);
        if (reviewOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy đánh giá");
        }
        
        Review review = reviewOpt.get();
        review.setIsHidden(!review.getIsHidden());
        Review savedReview = reviewRepository.save(review);
        
        return mapToDTO(savedReview);
    }
    
    public List<com.example.backend.dtos.ReviewReportResponseDTO> getReviewReports(Long reviewId) {
        List<ReviewReport> reports = reviewReportRepository.findByReviewReviewIdOrderByReportedAtDesc(reviewId);
        return reports.stream()
            .map(this::mapReportToDTO)
            .collect(Collectors.toList());
    }
    
    private com.example.backend.dtos.ReviewReportResponseDTO mapReportToDTO(ReviewReport report) {
        return com.example.backend.dtos.ReviewReportResponseDTO.builder()
            .reportId(report.getReportId())
            .userId(report.getUser().getUserId())
            .username(report.getUser().getUsername())
            .reason(report.getReason())
            .reportedAt(report.getReportedAt())
            .build();
    }
    
    private ReviewResponseDTO mapToDTO(Review review) {
        return ReviewResponseDTO.builder()
            .reviewId(review.getReviewId())
            .userId(review.getUser().getUserId())
            .username(review.getUser().getUsername())
            .movieId(review.getMovie().getMovieId())
            .movieTitle(review.getMovie().getTitle())
            .rating(review.getRating())
            .context(review.getContext())
            .createdAt(review.getCreatedAt())
            .updatedAt(review.getCreatedUpdate())
            .isHidden(review.getIsHidden())
            .reportCount(review.getReportCount())
            .avatar(review.getUser().getAvatar())
            .build();
    }
}


