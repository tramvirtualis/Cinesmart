package com.example.backend.controllers;

import com.example.backend.repositories.AdminRepository;
import com.example.backend.repositories.UserRepository;
import com.example.backend.entities.Admin;
import com.example.backend.services.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
        allowedHeaders = "*",
        allowCredentials = "true")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    
    private final CustomerService customerService;
    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    
    private Long getCurrentAdminId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<Admin> adminOpt = adminRepository.findByUsername(username);
        if (adminOpt.isPresent()) {
            return adminOpt.get().getUserId();
        }
        throw new RuntimeException("Không tìm thấy admin với username: " + username);
    }
    
    @GetMapping("/password/check")
    public ResponseEntity<?> checkPassword() {
        try {
            Long userId = getCurrentAdminId();
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
            System.out.println("=== Admin Update Password ===");
            Long userId = getCurrentAdminId();
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
            Long userId = getCurrentAdminId();
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
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}

