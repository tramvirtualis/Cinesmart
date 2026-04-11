package com.example.backend.controllers;

import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.CreateCinemaComplexDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.entities.Movie;
import com.example.backend.services.CinemaComplexService;
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
public class CinemaComplexController {
    
    private final CinemaComplexService cinemaComplexService;
    private final MovieService movieService;
    private final JwtUtils jwtUtils;
    
    // ============ PUBLIC ENDPOINTS ============
    
    /**
     * Lấy danh sách tất cả cụm rạp (Public - không cần authentication)
     */
    @GetMapping("/api/public/cinema-complexes")
    public ResponseEntity<?> getAllCinemaComplexesPublic() {
        try {
            List<CinemaComplexResponseDTO> complexes = cinemaComplexService.getAllCinemaComplexes();
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách cụm rạp thành công", complexes));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy cụm rạp theo ID (Public - không cần authentication)
     */
    @GetMapping("/api/public/cinema-complexes/{complexId}")
    public ResponseEntity<?> getCinemaComplexByIdPublic(@PathVariable Long complexId) {
        try {
            CinemaComplexResponseDTO complex = cinemaComplexService.getCinemaComplexById(complexId);
            return ResponseEntity.ok(createSuccessResponse("Lấy thông tin cụm rạp thành công", complex));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy danh sách phim của cụm rạp (Public - không cần authentication)
     */
    @GetMapping("/api/public/cinema-complexes/{complexId}/movies")
    public ResponseEntity<?> getComplexMoviesPublic(@PathVariable Long complexId) {
        try {
            List<Movie> movies = cinemaComplexService.getMoviesByComplexId(complexId);
            
            // Convert to MovieResponseDTO using MovieService
            List<MovieResponseDTO> movieDTOs = movies.stream()
                .map(movie -> {
                    try {
                        return movieService.getMovieById(movie.getMovieId());
                    } catch (Exception e) {
                        // If movie not found, return null and filter it out
                        return null;
                    }
                })
                .filter(dto -> dto != null)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách phim thành công", movieDTOs));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse("Có lỗi xảy ra: " + e.getMessage()));
        }
    }
    
    // ============ ADMIN ENDPOINTS (CẦN AUTHENTICATION) ============
    
    @GetMapping("/api/admin/cinema-complexes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllCinemaComplexes() {
        try {
            List<CinemaComplexResponseDTO> complexes = cinemaComplexService.getAllCinemaComplexes();
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách cụm rạp thành công", complexes));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/cinema-complexes/{complexId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getCinemaComplexById(@PathVariable Long complexId) {
        try {
            CinemaComplexResponseDTO complex = cinemaComplexService.getCinemaComplexById(complexId);
            return ResponseEntity.ok(createSuccessResponse("Lấy thông tin cụm rạp thành công", complex));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PostMapping("/api/admin/cinema-complexes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createCinemaComplex(@Valid @RequestBody CreateCinemaComplexDTO createDTO,
                                                  BindingResult bindingResult,
                                                  HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            CinemaComplexResponseDTO response = cinemaComplexService.createCinemaComplex(createDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                createSuccessResponse("Tạo cụm rạp thành công", response)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/api/admin/cinema-complexes/{complexId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateCinemaComplex(@PathVariable Long complexId,
                                                @Valid @RequestBody CreateCinemaComplexDTO updateDTO,
                                                BindingResult bindingResult,
                                                HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            CinemaComplexResponseDTO response = cinemaComplexService.updateCinemaComplex(complexId, updateDTO, username);
            return ResponseEntity.ok(createSuccessResponse("Cập nhật cụm rạp thành công", response));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/api/admin/cinema-complexes/{complexId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCinemaComplex(@PathVariable Long complexId,
                                                 HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            cinemaComplexService.deleteCinemaComplex(complexId, username);
            return ResponseEntity.ok(createSuccessResponse("Xóa cụm rạp thành công", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
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

