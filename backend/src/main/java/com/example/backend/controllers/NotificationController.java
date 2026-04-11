package com.example.backend.controllers;

import com.example.backend.dtos.NotificationDTO;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import com.example.backend.services.NotificationService;
import com.example.backend.utils.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
             allowedHeaders = "*",
             allowCredentials = "true")
public class NotificationController {
    
    private final NotificationService notificationService;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;
    
    /**
     * Trigger notification cho order khi thanh toán thành công
     */
    @PostMapping("/api/notifications/trigger-order-success/{orderId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> triggerOrderSuccessNotification(@PathVariable Long orderId, HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            notificationService.triggerOrderSuccessNotification(userId, orderId);
            return ResponseEntity.ok(createSuccessResponse("Thông báo đã được tạo", null));
        } catch (Exception e) {
            log.error("Error triggering order success notification: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy tất cả thông báo của user hiện tại
     */
    @GetMapping("/api/notifications")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> getUserNotifications(HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            List<NotificationDTO> notifications = notificationService.getUserNotifications(userId);
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách thông báo thành công", notifications));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy số lượng thông báo chưa đọc
     */
    @GetMapping("/api/notifications/unread-count")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> getUnreadCount(HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            Long count = notificationService.getUnreadCount(userId);
            return ResponseEntity.ok(createSuccessResponse("Lấy số lượng thông báo chưa đọc thành công", count));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Đánh dấu thông báo đã đọc
     */
    @PutMapping("/api/notifications/{notificationId}/read")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId, HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            notificationService.markAsRead(notificationId, userId);
            return ResponseEntity.ok(createSuccessResponse("Đánh dấu đã đọc thành công", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Đánh dấu tất cả thông báo đã đọc
     */
    @PutMapping("/api/notifications/read-all")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> markAllAsRead(HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            notificationService.markAllAsRead(userId);
            return ResponseEntity.ok(createSuccessResponse("Đánh dấu tất cả đã đọc thành công", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Xóa thông báo
     */
    @DeleteMapping("/api/notifications/{notificationId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'MANAGER')")
    public ResponseEntity<?> deleteNotification(@PathVariable Long notificationId, HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            notificationService.deleteNotification(notificationId, userId);
            return ResponseEntity.ok(createSuccessResponse("Xóa thông báo thành công", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy userId từ JWT token
     */
    private Long getUserIdFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token không hợp lệ");
        }
        
        String token = authHeader.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            throw new RuntimeException("Token không hợp lệ");
        }
        
        String username = jwtUtils.getUsernameFromJwtToken(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getUserId();
    }
    
    private Map<String, Object> createSuccessResponse(String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("data", data);
        return response;
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}

