package com.example.backend.controllers;

import com.example.backend.dtos.CreateStaffRequestDTO;
import com.example.backend.dtos.UserResponseDTO;
import com.example.backend.services.UserService;
import com.example.backend.utils.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@CrossOrigin(
    origins = {"http://localhost:5173", "http://localhost:3000"}, 
    allowedHeaders = "*", 
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowCredentials = "true"
)
public class UserController {
    
    private final UserService userService;
    private final JwtUtils jwtUtils;
    
    /**
     * Lấy danh sách tất cả users với filter
     * GET /api/admin/users?searchTerm=...&role=...&status=...&province=...
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean status,
            @RequestParam(required = false) String province) {
        try {
            log.info("Getting all users with filters - searchTerm: {}, role: {}, status: {}, province: {}", 
                    searchTerm, role, status, province);
            
            List<UserResponseDTO> users = userService.getAllUsers(searchTerm, role, status, province);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", users);
            
            log.info("Found {} users", users.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting users: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Tạo tài khoản staff (Admin hoặc Manager)
     * POST /api/admin/users
     */
    @PostMapping
    public ResponseEntity<?> createStaff(@Valid @RequestBody CreateStaffRequestDTO request,
                                         BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            log.warn("Validation errors: {}", bindingResult.getAllErrors());
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            log.info("Creating staff with username: {}, role: {}", request.getUsername(), request.getRole());
            
            UserResponseDTO createdUser = userService.createStaff(request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Tạo tài khoản thành công");
            response.put("data", createdUser);
            
            log.info("Staff created successfully with ID: {}", createdUser.getUserId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Error creating staff: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Toggle status của user (chặn/bỏ chặn)
     * PUT /api/admin/users/{userId}/status
     */
    @PutMapping("/{userId}/status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long userId,
                                             HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            log.info("Toggling status for user ID: {} by admin: {}", userId, username);
            
            UserResponseDTO updatedUser = userService.toggleUserStatus(userId, username);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Cập nhật trạng thái thành công");
            response.put("data", updatedUser);
            
            log.info("User status updated successfully. New status: {}", updatedUser.getStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error toggling user status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Lấy username từ JWT token trong request
     */
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
            log.error("Error getting username from request: {}", e.getMessage());
        }
        return null;
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
    
    private Map<String, Object> createErrorResponse(BindingResult bindingResult) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        
        String errors = bindingResult.getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        
        response.put("error", errors);
        return response;
    }
}