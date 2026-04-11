package com.example.backend.controllers;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dtos.CreatePinRequestDTO;
import com.example.backend.dtos.ForgotPinRequestDTO;
import com.example.backend.dtos.PinStatusResponseDTO;
import com.example.backend.dtos.ResetPinRequestDTO;
import com.example.backend.dtos.UpdatePinRequestDTO;
import com.example.backend.dtos.VerifyPinRequestDTO;
import com.example.backend.entities.Customer;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.services.WalletPinService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Controller để quản lý mã PIN của ví Cinesmart
 * Tất cả endpoints yêu cầu authentication và role CUSTOMER
 */
@RestController
@RequestMapping("/api/wallet/pin")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
        allowedHeaders = "*",
        allowCredentials = "true")
public class WalletPinController {

    private final WalletPinService walletPinService;
    private final CustomerRepository customerRepository;

    /**
     * Lấy trạng thái PIN của user hiện tại
     */
    @GetMapping("/status")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getPinStatus() {
        try {
            Long userId = getCurrentCustomerId();
            PinStatusResponseDTO status = walletPinService.getPinStatus(userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", status);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    /**
     * Tạo mã PIN mới
     */
    @PostMapping("/create")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createPin(@Valid @RequestBody CreatePinRequestDTO request) {
        try {
            Long userId = getCurrentCustomerId();
            walletPinService.createPin(userId, request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Tạo mã PIN thành công");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    /**
     * Cập nhật mã PIN
     */
    @PutMapping("/update")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> updatePin(@Valid @RequestBody UpdatePinRequestDTO request) {
        try {
            Long userId = getCurrentCustomerId();
            walletPinService.updatePin(userId, request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đổi mã PIN thành công");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    /**
     * Xác thực mã PIN (dùng cho các giao dịch quan trọng)
     */
    @PostMapping("/verify")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> verifyPin(@Valid @RequestBody VerifyPinRequestDTO request) {
        try {
            Long userId = getCurrentCustomerId();
            boolean isValid = walletPinService.verifyPin(userId, request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("valid", isValid);
            response.put("message", "Mã PIN hợp lệ");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    /**
     * Lấy ID của customer hiện tại từ JWT token
     */
    private Long getCurrentCustomerId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với username: " + username));
        return customer.getUserId();
    }

    /**
     * Gửi OTP để quên mã PIN (public endpoint - không cần authentication)
     * Nhưng nếu user đã đăng nhập, chỉ cho phép đổi PIN của chính họ
     */
    @PostMapping("/forgot/send-otp")
    public ResponseEntity<?> sendForgotPinOtp(@Valid @RequestBody ForgotPinRequestDTO request, HttpSession session) {
        try {
            // Kiểm tra nếu user đã đăng nhập, chỉ cho phép đổi PIN của chính họ
            try {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                if (username != null && !username.equals("anonymousUser")) {
                    // User đã đăng nhập, kiểm tra email có khớp không
                    Customer currentCustomer = customerRepository.findByUsername(username)
                            .orElse(null);
                    if (currentCustomer != null && !currentCustomer.getEmail().equals(request.getEmail())) {
                        return ResponseEntity.badRequest().body(createError("Email không đúng. Vui lòng kiểm tra lại email của bạn."));
                    }
                }
            } catch (Exception e) {
                // User chưa đăng nhập, cho phép tiếp tục (tính năng Forgot PIN)
            }
            
            walletPinService.sendForgotPinOtp(request, session);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Mã OTP đã được gửi đến email của bạn");
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }
    
    /**
     * Đặt lại mã PIN sau khi xác thực OTP (public endpoint - không cần authentication)
     * Nhưng nếu user đã đăng nhập, chỉ cho phép đổi PIN của chính họ
     */
    @PostMapping("/forgot/reset")
    public ResponseEntity<?> resetPinWithOtp(@Valid @RequestBody ResetPinRequestDTO request, HttpSession session) {
        try {
            // Kiểm tra nếu user đã đăng nhập, chỉ cho phép đổi PIN của chính họ
            try {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                if (username != null && !username.equals("anonymousUser")) {
                    // User đã đăng nhập, kiểm tra email có khớp không
                    Customer currentCustomer = customerRepository.findByUsername(username)
                            .orElse(null);
                    if (currentCustomer != null && !currentCustomer.getEmail().equals(request.getEmail())) {
                        return ResponseEntity.badRequest().body(createError("Email không đúng. Vui lòng kiểm tra lại email của bạn."));
                    }
                }
            } catch (Exception e) {
                // User chưa đăng nhập, cho phép tiếp tục (tính năng Forgot PIN)
            }
            
            walletPinService.resetPinWithOtp(request, session);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đặt lại mã PIN thành công");
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    /**
     * Tạo error response
     */
    private Map<String, Object> createError(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("message", message);
        return error;
    }
}

