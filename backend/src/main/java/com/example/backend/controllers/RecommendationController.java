package com.example.backend.controllers;

import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import com.example.backend.services.RecommendationService;
import com.example.backend.utils.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/recommendations")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "https://cinesmart-movie-ticket-booking.vercel.app"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    @GetMapping("/cinemas")
    public ResponseEntity<List<CinemaComplexResponseDTO>> recommendCinemas(
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {
        try {
            List<CinemaComplexResponseDTO> recommendations = recommendationService.recommendNearbyCinemas(latitude, longitude);
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/movies")
    public ResponseEntity<List<MovieResponseDTO>> recommendMovies(HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            List<MovieResponseDTO> recommendations = recommendationService.recommendMovies(userId);
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private Long getUserIdFromRequest(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtils.validateJwtToken(token)) {
                    String username = jwtUtils.getUsernameFromJwtToken(token);
                    Optional<User> user = userRepository.findByUsername(username);
                    if (user.isPresent()) {
                        return user.get().getUserId();
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error getting username from request: " + e.getMessage());
        }
        return null;
    }
}
