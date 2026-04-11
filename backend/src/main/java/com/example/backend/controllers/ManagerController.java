package com.example.backend.controllers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.OrderResponseDTO;
import com.example.backend.entities.Manager;
import com.example.backend.entities.Movie;
import com.example.backend.repositories.ManagerRepository;
import com.example.backend.services.CinemaComplexService;
import com.example.backend.services.MovieService;
import com.example.backend.services.OrderService;
import com.example.backend.services.CustomerService;
import com.example.backend.repositories.UserRepository;
import com.example.backend.repositories.ManagerRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
             allowedHeaders = "*",
             allowCredentials = "true")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerController {
    
    private final CinemaComplexService cinemaComplexService;
    private final ManagerRepository managerRepository;
    private final MovieService movieService;
    private final OrderService orderService;
    private final CustomerService customerService;
    private final UserRepository userRepository;
    
    @GetMapping("/cinema-complex")
    public ResponseEntity<?> getManagerCinemaComplex() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            
            // Native query để lấy cinema_complex_id trực tiếp
            Optional<Long> complexIdOpt = managerRepository.findCinemaComplexIdByUsername(username);
            
            if (complexIdOpt.isPresent() && complexIdOpt.get() != null) {
                Long complexId = complexIdOpt.get();
                
                try {
                    CinemaComplexResponseDTO complex = cinemaComplexService.getCinemaComplexById(complexId);
                    List<CinemaComplexResponseDTO> resultList = List.of(complex);
                    return ResponseEntity.ok(createSuccessResponse("Lấy thông tin cụm rạp thành công", resultList));
                } catch (Exception e) {
                    System.out.println("Error getting cinema complex by ID: " + e.getMessage());
                }
            }
            
            // Fallback: Thử query Manager với fetch
            Optional<Manager> managerOpt = managerRepository.findByUsernameWithCinemaComplex(username);
            
            if (managerOpt.isPresent()) {
                Manager manager = managerOpt.get();
                
                if (manager.getCinemaComplex() != null) {
                    Long complexId = manager.getCinemaComplex().getComplexId();
                    
                    try {
                        CinemaComplexResponseDTO complex = cinemaComplexService.getCinemaComplexById(complexId);
                        return ResponseEntity.ok(createSuccessResponse("Lấy thông tin cụm rạp thành công", List.of(complex)));
                    } catch (Exception e) {
                        System.out.println("Error getting cinema complex: " + e.getMessage());
                    }
                }
            }
            
            // Fallback 2: Query Manager thông thường
            managerOpt = managerRepository.findByUsername(username);
            if (managerOpt.isPresent()) {
                Manager manager = managerOpt.get();
                
                try {
                    if (manager.getCinemaComplex() != null) {
                        Long complexId = manager.getCinemaComplex().getComplexId();
                        CinemaComplexResponseDTO complex = cinemaComplexService.getCinemaComplexById(complexId);
                        return ResponseEntity.ok(createSuccessResponse("Lấy thông tin cụm rạp thành công", List.of(complex)));
                    }
                } catch (Exception e) {
                    System.out.println("Error accessing cinema complex: " + e.getMessage());
                }
            }
            
            return ResponseEntity.ok(createSuccessResponse("Manager chưa được gán cụm rạp", List.of()));
        } catch (Exception e) {
            System.out.println("Exception in getManagerCinemaComplex: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse("Lỗi: " + e.getMessage()));
        }
    }

    // ============ MOVIE MANAGEMENT ENDPOINTS ============

    /**
     * Lấy danh sách tất cả phim trong hệ thống (Manager)
     */
    @GetMapping("/movies")
    public ResponseEntity<?> getAllMoviesManager() {
        try {
            List<MovieResponseDTO> movies = movieService.getAllMovies();
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách phim thành công", movies));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse("Có lỗi xảy ra: " + e.getMessage()));
        }
    }

    /**
     * Lấy danh sách phim của cụm rạp (Manager)
     */
    @GetMapping("/cinema-complex/{complexId}/movies")
    public ResponseEntity<?> getComplexMovies(@PathVariable Long complexId) {
        try {
            // Verify manager owns this complex
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            Optional<Long> managerComplexId = managerRepository.findCinemaComplexIdByUsername(username);
            
            if (!managerComplexId.isPresent() || !managerComplexId.get().equals(complexId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Bạn không có quyền truy cập cụm rạp này"));
            }
            
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
                .collect(java.util.stream.Collectors.toList());
            
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách phim thành công", movieDTOs));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse("Có lỗi xảy ra: " + e.getMessage()));
        }
    }

    /**
     * Thêm phim vào cụm rạp (Manager)
     */
    @PostMapping("/cinema-complex/{complexId}/movies/{movieId}")
    public ResponseEntity<?> addMovieToComplex(@PathVariable Long complexId, @PathVariable Long movieId) {
        try {
            // Verify manager owns this complex
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            Optional<Long> managerComplexId = managerRepository.findCinemaComplexIdByUsername(username);
            
            if (!managerComplexId.isPresent() || !managerComplexId.get().equals(complexId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Bạn không có quyền truy cập cụm rạp này"));
            }
            
            cinemaComplexService.addMovieToComplex(complexId, movieId, username);
            
            return ResponseEntity.ok(createSuccessResponse("Thêm phim vào cụm rạp thành công", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Có lỗi xảy ra: " + e.getMessage()));
        }
    }

    /**
     * Xóa phim khỏi cụm rạp (Manager)
     */
    @DeleteMapping("/cinema-complex/{complexId}/movies/{movieId}")
    public ResponseEntity<?> removeMovieFromComplex(@PathVariable Long complexId, @PathVariable Long movieId) {
        try {
            // Verify manager owns this complex
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            Optional<Long> managerComplexId = managerRepository.findCinemaComplexIdByUsername(username);
            
            if (!managerComplexId.isPresent() || !managerComplexId.get().equals(complexId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Bạn không có quyền truy cập cụm rạp này"));
            }
            
            cinemaComplexService.removeMovieFromComplex(complexId, movieId, username);
            
            return ResponseEntity.ok(createSuccessResponse("Xóa phim khỏi cụm rạp thành công", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Có lỗi xảy ra: " + e.getMessage()));
        }
    }
    
    // ============ ORDER MANAGEMENT ENDPOINTS ============
    
    /**
     * Lấy danh sách đơn hàng của cụm rạp (Manager)
     */
    @GetMapping("/orders")
    public ResponseEntity<?> getManagerOrders() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            System.out.println("=== Manager getOrders - Username: " + username + " ===");
            
            Optional<Long> complexIdOpt = managerRepository.findCinemaComplexIdByUsername(username);
            
            if (!complexIdOpt.isPresent() || complexIdOpt.get() == null) {
                System.out.println("Manager chưa được gán cụm rạp");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Manager chưa được gán cụm rạp"));
            }
            
            Long complexId = complexIdOpt.get();
            System.out.println("Complex ID: " + complexId);
            
            List<OrderResponseDTO> orders = orderService.getOrdersByComplexId(complexId);
            System.out.println("Total orders found: " + orders.size());
            
            if (!orders.isEmpty()) {
                System.out.println("First order ID: " + orders.get(0).getOrderId());
                System.out.println("First order items count: " + (orders.get(0).getItems() != null ? orders.get(0).getItems().size() : 0));
            }
            
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách đơn hàng thành công", orders));
        } catch (Exception e) {
            System.err.println("Error in getManagerOrders: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Có lỗi xảy ra: " + e.getMessage()));
        }
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
    
    // ============ PASSWORD MANAGEMENT ENDPOINTS ============
    
    private Long getCurrentManagerId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Manager> managerOpt = managerRepository.findByUsername(username);
        if (managerOpt.isPresent()) {
            return managerOpt.get().getUserId();
        }
        throw new RuntimeException("Không tìm thấy manager với username: " + username);
    }
    
    @GetMapping("/password/check")
    public ResponseEntity<?> checkPassword() {
        try {
            Long userId = getCurrentManagerId();
            boolean hasPassword = customerService.hasPassword(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("hasPassword", hasPassword);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PutMapping("/password/update")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request) {
        try {
            System.out.println("=== Manager Update Password ===");
            Long userId = getCurrentManagerId();
            System.out.println("User ID: " + userId);
            String oldPassword = request.get("oldPassword");
            String newPassword = request.get("newPassword");
            String confirmPassword = request.get("confirmPassword");
            System.out.println("Old password provided: " + (oldPassword != null && !oldPassword.isEmpty()));
            System.out.println("New password provided: " + (newPassword != null && !newPassword.isEmpty()));
            System.out.println("Confirm password provided: " + (confirmPassword != null && !confirmPassword.isEmpty()));

            // Validate input
            if (oldPassword == null || oldPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng nhập mật khẩu cũ"));
            }
            if (newPassword == null || newPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng nhập mật khẩu mới"));
            }
            if (confirmPassword == null || confirmPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng xác nhận mật khẩu mới"));
            }
            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Mật khẩu mới và xác nhận mật khẩu không khớp"));
            }

            customerService.updatePassword(userId, oldPassword, newPassword);
            System.out.println("Password updated successfully");
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đổi mật khẩu thành công");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error updating password: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/password/create")
    public ResponseEntity<?> createPassword(@RequestBody Map<String, String> request) {
        try {
            Long userId = getCurrentManagerId();
            String newPassword = request.get("newPassword");
            String confirmPassword = request.get("confirmPassword");

            // Validate input
            if (newPassword == null || newPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng nhập mật khẩu mới"));
            }
            if (confirmPassword == null || confirmPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng xác nhận mật khẩu mới"));
            }
            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Mật khẩu mới và xác nhận mật khẩu không khớp"));
            }

            customerService.createPassword(userId, newPassword);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Tạo mật khẩu thành công");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }
}