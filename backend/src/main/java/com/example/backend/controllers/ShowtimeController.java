package com.example.backend.controllers;

import com.example.backend.dtos.CreateShowtimeDTO;
import com.example.backend.dtos.ShowtimeResponseDTO;
import com.example.backend.services.ShowtimeService;
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
public class ShowtimeController {
    
    private final ShowtimeService showtimeService;
    private final JwtUtils jwtUtils;
    
    // ============ MANAGER ENDPOINTS ============
    
    /**
     * Lấy danh sách lịch chiếu theo roomId (Manager)
     */
    @GetMapping("/api/manager/showtimes/room/{roomId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getShowtimesByRoomId(@PathVariable Long roomId) {
        try {
            List<ShowtimeResponseDTO> showtimes = showtimeService.getShowtimesByRoomId(roomId);
            return ResponseEntity.ok(
                createSuccessResponse("Lấy danh sách lịch chiếu thành công", showtimes)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Tạo lịch chiếu mới (Manager)
     */
    @PostMapping("/api/manager/showtimes")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createShowtime(@Valid @RequestBody CreateShowtimeDTO createDTO,
                                            BindingResult bindingResult,
                                            HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            ShowtimeResponseDTO showtimeResponse = showtimeService.createShowtime(createDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                createSuccessResponse("Tạo lịch chiếu thành công", showtimeResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }
    
    /**
     * Cập nhật lịch chiếu (Manager)
     */
    @PutMapping("/api/manager/showtimes/{showtimeId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateShowtime(@PathVariable Long showtimeId,
                                            @Valid @RequestBody CreateShowtimeDTO updateDTO,
                                            BindingResult bindingResult,
                                            HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            ShowtimeResponseDTO showtimeResponse = showtimeService.updateShowtime(showtimeId, updateDTO, username);
            return ResponseEntity.ok(
                createSuccessResponse("Cập nhật lịch chiếu thành công", showtimeResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Xóa lịch chiếu (Manager)
     */
    @DeleteMapping("/api/manager/showtimes/{showtimeId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteShowtime(@PathVariable Long showtimeId,
                                            HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            showtimeService.deleteShowtime(showtimeId, username);
            return ResponseEntity.ok(
                createSuccessResponse("Xóa lịch chiếu thành công", null)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ ADMIN ENDPOINTS (Optional - for future use) ============
    
    /**
     * Lấy danh sách lịch chiếu theo roomId (Admin)
     */
    @GetMapping("/api/admin/showtimes/room/{roomId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getShowtimesByRoomIdAdmin(@PathVariable Long roomId) {
        try {
            List<ShowtimeResponseDTO> showtimes = showtimeService.getShowtimesByRoomId(roomId);
            return ResponseEntity.ok(
                createSuccessResponse("Lấy danh sách lịch chiếu thành công", showtimes)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Tạo lịch chiếu mới (Admin)
     */
    @PostMapping("/api/admin/showtimes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createShowtimeAdmin(@Valid @RequestBody CreateShowtimeDTO createDTO,
                                                 BindingResult bindingResult,
                                                 HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            ShowtimeResponseDTO showtimeResponse = showtimeService.createShowtime(createDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                createSuccessResponse("Tạo lịch chiếu thành công", showtimeResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }
    
    /**
     * Cập nhật lịch chiếu (Admin)
     */
    @PutMapping("/api/admin/showtimes/{showtimeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateShowtimeAdmin(@PathVariable Long showtimeId,
                                                 @Valid @RequestBody CreateShowtimeDTO updateDTO,
                                                 BindingResult bindingResult,
                                                 HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            ShowtimeResponseDTO showtimeResponse = showtimeService.updateShowtime(showtimeId, updateDTO, username);
            return ResponseEntity.ok(
                createSuccessResponse("Cập nhật lịch chiếu thành công", showtimeResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Xóa lịch chiếu (Admin)
     */
    @DeleteMapping("/api/admin/showtimes/{showtimeId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteShowtimeAdmin(@PathVariable Long showtimeId,
                                                 HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            showtimeService.deleteShowtime(showtimeId, username);
            return ResponseEntity.ok(
                createSuccessResponse("Xóa lịch chiếu thành công", null)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ PUBLIC ENDPOINTS ============
    
    /**
     * Lấy showtimes public theo movieId, province và date (không cần đăng nhập)
     */
    @GetMapping("/api/public/showtimes")
    public ResponseEntity<?> getPublicShowtimes(
            @RequestParam Long movieId,
            @RequestParam(required = false) String province,
            @RequestParam String date) {
        try {
            System.out.println("=== ShowtimeController.getPublicShowtimes ===");
            System.out.println("movieId: " + movieId);
            System.out.println("province: " + province);
            System.out.println("date: " + date);
            
            java.time.LocalDate localDate = java.time.LocalDate.parse(date);
            List<ShowtimeResponseDTO> showtimes = showtimeService.getPublicShowtimes(movieId, province, localDate);
            
            System.out.println("Returning " + showtimes.size() + " showtimes");
            
            return ResponseEntity.ok(
                createSuccessResponse("Lấy danh sách lịch chiếu thành công", showtimes)
            );
        } catch (Exception e) {
            System.err.println("ERROR in getPublicShowtimes: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * DEBUG endpoint: Kiểm tra showtimes trong database (không filter)
     */
    @GetMapping("/api/debug/showtimes/{movieId}")
    public ResponseEntity<?> debugShowtimes(@PathVariable Long movieId) {
        try {
            List<ShowtimeResponseDTO> allShowtimes = showtimeService.debugGetAllShowtimesByMovie(movieId);
            Map<String, Object> debugInfo = new HashMap<>();
            debugInfo.put("movieId", movieId);
            debugInfo.put("totalShowtimes", allShowtimes.size());
            debugInfo.put("showtimes", allShowtimes);
            return ResponseEntity.ok(debugInfo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy showtime theo ID (public - không cần đăng nhập)
     */
    @GetMapping("/api/public/showtimes/{showtimeId}")
    public ResponseEntity<?> getShowtimeById(@PathVariable Long showtimeId) {
        try {
            System.out.println("=== ShowtimeController.getShowtimeById ===");
            System.out.println("showtimeId: " + showtimeId);
            
            ShowtimeResponseDTO showtime = showtimeService.getShowtimeById(showtimeId);
            
            System.out.println("Returning showtime: " + (showtime != null ? showtime.getShowtimeId() : "null"));
            
            return ResponseEntity.ok(showtime);
        } catch (RuntimeException e) {
            System.err.println("ERROR in getShowtimeById: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.err.println("ERROR in getShowtimeById: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy danh sách ghế đã đặt cho showtime (public - không cần đăng nhập)
     */
    @GetMapping("/api/public/showtimes/{showtimeId}/booked-seats")
    public ResponseEntity<?> getBookedSeats(@PathVariable Long showtimeId) {
        try {
            List<String> bookedSeatIds = showtimeService.getBookedSeatIds(showtimeId);
            return ResponseEntity.ok(
                createSuccessResponse("Lấy danh sách ghế đã đặt thành công", bookedSeatIds)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // Helper methods
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
        response.put("message", "Dữ liệu không hợp lệ");
        response.put("errors", bindingResult.getFieldErrors().stream()
            .collect(Collectors.toMap(
                error -> error.getField(),
                error -> error.getDefaultMessage()
            )));
        return response;
    }
}

