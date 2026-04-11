package com.example.backend.controllers;

import com.example.backend.dtos.CreateMovieDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.UpdateMovieDTO;
import com.example.backend.services.MovieService;
import com.example.backend.utils.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class MovieController {
    
    private final MovieService movieService;
    private final JwtUtils jwtUtils;
    
    // ============ ADMIN ENDPOINTS (CẦN AUTHENTICATION) ============
    
    @PostMapping("/api/admin/movies")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createMovie(@Valid @RequestBody CreateMovieDTO createMovieDTO,
                                         BindingResult bindingResult,
                                         HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(
                    createErrorResponse(bindingResult)
            );
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            MovieResponseDTO movieResponse = movieService.createMovie(createMovieDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    createSuccessResponse("Tạo phim thành công", movieResponse)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/api/admin/movies/{movieId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateMovie(@PathVariable Long movieId,
                                         @Valid @RequestBody UpdateMovieDTO updateMovieDTO,
                                         BindingResult bindingResult,
                                         HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(
                    createErrorResponse(bindingResult)
            );
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            MovieResponseDTO movieResponse = movieService.updateMovie(movieId, updateMovieDTO, username);
            return ResponseEntity.ok(
                    createSuccessResponse("Cập nhật phim thành công", movieResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/api/admin/movies/{movieId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteMovie(@PathVariable Long movieId,
                                         HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            movieService.deleteMovie(movieId, username);
            return ResponseEntity.ok(
                    createSuccessResponse("Xóa phim thành công", null)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/movies/{movieId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getMovieByIdAdmin(@PathVariable Long movieId) {
        try {
            MovieResponseDTO movieResponse = movieService.getMovieById(movieId);
            return ResponseEntity.ok(
                    createSuccessResponse("Lấy thông tin phim thành công", movieResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/movies")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllMoviesAdmin() {
        try {
            List<MovieResponseDTO> movies = movieService.getAllMovies();
            return ResponseEntity.ok(
                    createSuccessResponse("Lấy danh sách phim thành công", movies)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ PUBLIC ENDPOINTS (KHÔNG CẦN AUTHENTICATION) ============
    
    @GetMapping("/api/public/movies/now-showing")
    public ResponseEntity<List<MovieResponseDTO>> getNowShowingMovies() {
        try {
            List<MovieResponseDTO> movies = movieService.getNowShowingMovies();
            return ResponseEntity.ok(movies);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/api/public/movies/coming-soon")
    public ResponseEntity<List<MovieResponseDTO>> getComingSoonMovies() {
        try {
            List<MovieResponseDTO> movies = movieService.getComingSoonMovies();
            return ResponseEntity.ok(movies);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/api/public/movies")
    public ResponseEntity<List<MovieResponseDTO>> getAllMovies() {
        try {
            List<MovieResponseDTO> movies = movieService.getAllMovies();
            return ResponseEntity.ok(movies);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/api/public/movies/{id}")
    public ResponseEntity<MovieResponseDTO> getMovieById(@PathVariable Long id) {
        try {
            MovieResponseDTO movie = movieService.getMovieById(id);
            return ResponseEntity.ok(movie);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // ============ HELPER METHODS ============
    
    private String getUsernameFromRequest(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtils.validateJwtToken(token)) {
                    return jwtUtils.getUsernameFromJwtToken(token);
                }
            }
        } catch (Exception e) {
            System.err.println("Error getting username from request: " + e.getMessage());
        }
        return null;
    }
    
    private Map<String, Object> createSuccessResponse(String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        if (data != null) {
            response.put("data", data);
        }
        return response;
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
    
    private Map<String, Object> createErrorResponse(BindingResult bindingResult) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        
        String errors = bindingResult.getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        
        response.put("message", errors);
        return response;
    }
}