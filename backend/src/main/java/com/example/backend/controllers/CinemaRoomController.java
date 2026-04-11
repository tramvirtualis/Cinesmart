package com.example.backend.controllers;

import com.example.backend.dtos.AddSeatRequestDTO;
import com.example.backend.dtos.CinemaRoomResponseDTO;
import com.example.backend.dtos.CreateCinemaRoomDTO;
import com.example.backend.dtos.SeatResponseDTO;
import com.example.backend.entities.enums.SeatType;
import com.example.backend.services.CinemaRoomService;
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
public class CinemaRoomController {
    
    private final CinemaRoomService cinemaRoomService;
    private final JwtUtils jwtUtils;
    
    // ============ ADMIN ENDPOINTS ============
    
    @PostMapping("/api/admin/cinema-rooms")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createCinemaRoom(@Valid @RequestBody CreateCinemaRoomDTO createDTO,
                                              BindingResult bindingResult,
                                              HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            CinemaRoomResponseDTO roomResponse = cinemaRoomService.createCinemaRoom(createDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                createSuccessResponse("Tạo phòng chiếu thành công", roomResponse)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/cinema-rooms/complex/{complexId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getRoomsByComplexId(@PathVariable Long complexId) {
        try {
            List<CinemaRoomResponseDTO> rooms = cinemaRoomService.getRoomsByComplexId(complexId);
            return ResponseEntity.ok(
                createSuccessResponse("Lấy danh sách phòng chiếu thành công", rooms)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/cinema-rooms/{roomId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getRoomById(@PathVariable Long roomId) {
        try {
            CinemaRoomResponseDTO room = cinemaRoomService.getRoomById(roomId);
            return ResponseEntity.ok(
                createSuccessResponse("Lấy thông tin phòng chiếu thành công", room)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/cinema-rooms/{roomId}/has-bookings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> checkRoomHasBookings(@PathVariable Long roomId) {
        try {
            boolean hasBookings = cinemaRoomService.hasBookings(roomId);
            Map<String, Object> response = new HashMap<>();
            response.put("hasBookings", hasBookings);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/api/admin/cinema-rooms/{roomId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateCinemaRoom(@PathVariable Long roomId,
                                              @Valid @RequestBody CreateCinemaRoomDTO updateDTO,
                                              BindingResult bindingResult,
                                              HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            CinemaRoomResponseDTO roomResponse = cinemaRoomService.updateCinemaRoom(roomId, updateDTO, username);
            return ResponseEntity.ok(
                createSuccessResponse("Cập nhật phòng chiếu thành công", roomResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/api/admin/cinema-rooms/{roomId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteCinemaRoom(@PathVariable Long roomId,
                                              HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            cinemaRoomService.deleteCinemaRoom(roomId, username);
            return ResponseEntity.ok(
                createSuccessResponse("Xóa phòng chiếu thành công", null)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ MANAGER ENDPOINTS ============
    
    @PostMapping("/api/manager/cinema-rooms")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> createCinemaRoomManager(@Valid @RequestBody CreateCinemaRoomDTO createDTO,
                                                     BindingResult bindingResult,
                                                     HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            // Manager chỉ có thể tạo phòng cho cụm rạp của mình
            // Kiểm tra quyền sẽ được thực hiện trong service hoặc filter
            CinemaRoomResponseDTO roomResponse = cinemaRoomService.createCinemaRoom(createDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                createSuccessResponse("Tạo phòng chiếu thành công", roomResponse)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/manager/cinema-rooms/complex/{complexId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getRoomsByComplexIdManager(@PathVariable Long complexId) {
        try {
            List<CinemaRoomResponseDTO> rooms = cinemaRoomService.getRoomsByComplexId(complexId);
            return ResponseEntity.ok(
                createSuccessResponse("Lấy danh sách phòng chiếu thành công", rooms)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/manager/cinema-rooms/{roomId}/has-bookings")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> checkRoomHasBookingsManager(@PathVariable Long roomId) {
        try {
            boolean hasBookings = cinemaRoomService.hasBookings(roomId);
            Map<String, Object> response = new HashMap<>();
            response.put("hasBookings", hasBookings);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/api/manager/cinema-rooms/{roomId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateCinemaRoomManager(@PathVariable Long roomId,
                                                     @Valid @RequestBody CreateCinemaRoomDTO updateDTO,
                                                     BindingResult bindingResult,
                                                     HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            CinemaRoomResponseDTO roomResponse = cinemaRoomService.updateCinemaRoom(roomId, updateDTO, username);
            return ResponseEntity.ok(
                createSuccessResponse("Cập nhật phòng chiếu thành công", roomResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/api/manager/cinema-rooms/{roomId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteCinemaRoomManager(@PathVariable Long roomId,
                                                     HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            cinemaRoomService.deleteCinemaRoom(roomId, username);
            return ResponseEntity.ok(
                createSuccessResponse("Xóa phòng chiếu thành công", null)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }

    // ============ SEAT ENDPOINTS ============

    @PutMapping("/api/admin/seats/{seatId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateSeatType(@PathVariable Long seatId,
                                             @RequestBody Map<String, String> seatRequest,
                                             HttpServletRequest httpRequest) {
        try {
            String seatTypeStr = seatRequest.get("type");
            if (seatTypeStr == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Thiếu thông tin loại ghế"));
            }
            
            SeatType seatType;
            try {
                seatType = SeatType.valueOf(seatTypeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Loại ghế không hợp lệ: " + seatTypeStr));
            }
            
            String username = getUsernameFromRequest(httpRequest);
            SeatResponseDTO seatResponse = cinemaRoomService.updateSeatType(seatId, seatType, username);
            return ResponseEntity.ok(
                    createSuccessResponse("Cập nhật loại ghế thành công", seatResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    @PutMapping("/api/manager/seats/{seatId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> updateSeatTypeManager(@PathVariable Long seatId,
                                                    @RequestBody Map<String, String> seatRequest,
                                                    HttpServletRequest httpRequest) {
        try {
            String seatTypeStr = seatRequest.get("type");
            if (seatTypeStr == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Thiếu thông tin loại ghế"));
            }
            
            SeatType seatType;
            try {
                seatType = SeatType.valueOf(seatTypeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Loại ghế không hợp lệ: " + seatTypeStr));
            }
            
            String username = getUsernameFromRequest(httpRequest);
            SeatResponseDTO seatResponse = cinemaRoomService.updateSeatType(seatId, seatType, username);
            return ResponseEntity.ok(
                    createSuccessResponse("Cập nhật loại ghế thành công", seatResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/api/admin/seats/{seatId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteSeatAdmin(@PathVariable Long seatId, HttpServletRequest httpRequest) {
        try {
            String username = getUsernameFromRequest(httpRequest);
            cinemaRoomService.deleteSeat(seatId, username);
            return ResponseEntity.ok(createSuccessResponse("Đã xóa ghế (ô trống)", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/api/manager/seats/{seatId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> deleteSeatManager(@PathVariable Long seatId, HttpServletRequest httpRequest) {
        try {
            String username = getUsernameFromRequest(httpRequest);
            cinemaRoomService.deleteSeat(seatId, username);
            return ResponseEntity.ok(createSuccessResponse("Đã xóa ghế (ô trống)", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/api/admin/cinema-rooms/{roomId}/seats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addSeatAdmin(@PathVariable Long roomId,
                                         @Valid @RequestBody AddSeatRequestDTO body,
                                         HttpServletRequest httpRequest) {
        try {
            String username = getUsernameFromRequest(httpRequest);
            SeatResponseDTO dto = cinemaRoomService.addSeat(roomId, body, username);
            return ResponseEntity.ok(createSuccessResponse("Đã thêm ghế", dto));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/api/manager/cinema-rooms/{roomId}/seats")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> addSeatManager(@PathVariable Long roomId,
                                           @Valid @RequestBody AddSeatRequestDTO body,
                                           HttpServletRequest httpRequest) {
        try {
            String username = getUsernameFromRequest(httpRequest);
            SeatResponseDTO dto = cinemaRoomService.addSeat(roomId, body, username);
            return ResponseEntity.ok(createSuccessResponse("Đã thêm ghế", dto));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ PUBLIC ENDPOINTS ============
    
    /**
     * Lấy thông tin phòng chiếu với ghế (public - không cần đăng nhập)
     */
    @GetMapping("/api/public/cinema-rooms/{roomId}")
    public ResponseEntity<?> getPublicRoomById(@PathVariable Long roomId) {
        try {
            CinemaRoomResponseDTO room = cinemaRoomService.getRoomById(roomId);
            return ResponseEntity.ok(
                createSuccessResponse("Lấy thông tin phòng chiếu thành công", room)
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

