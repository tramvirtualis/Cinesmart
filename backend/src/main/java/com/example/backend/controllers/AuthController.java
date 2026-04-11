package com.example.backend.controllers;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dtos.GoogleLoginRequestDTO;
import com.example.backend.dtos.LoginResponseDTO;
import com.example.backend.dtos.RegisterRequestDTO;
import com.example.backend.dtos.RegisterResponseDTO;
import com.example.backend.dtos.ResetPasswordRequestDTO;
import com.example.backend.dtos.SendOtpRequestDTO;
import com.example.backend.dtos.VerifyOtpRequestDTO;
import com.example.backend.services.AuthService;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class AuthController {
    
    private final AuthService authService;
    
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequestDTO request,
                                      BindingResult bindingResult,
                                      HttpSession session) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(
                    createErrorResponse(bindingResult)
            );
        }
        
        try {
            String message = authService.sendOtp(request, session);
            return ResponseEntity.ok(createSuccessResponse(message));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<?> sendForgotPasswordOtp(@Valid @RequestBody SendOtpRequestDTO request,
                                                   HttpSession session) {
        try {
            authService.sendForgotPasswordOtp(request.getEmail(), session);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Mã OTP đã được gửi đến email của bạn");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PostMapping("/forgot-password/resend-otp")
    public ResponseEntity<?> resendForgotPasswordOtp(@Valid @RequestBody SendOtpRequestDTO request,
                                                     HttpSession session) {
        return sendForgotPasswordOtp(request, session);
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<?> verifyForgotPasswordOtp(@Valid @RequestBody VerifyOtpRequestDTO request,
                                                     HttpSession session) {
        try {
            String resetToken = authService.verifyForgotPasswordOtp(
                    request.getEmail(),
                    request.getOtp(),
                    session
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Xác thực OTP thành công");
            response.put("token", resetToken);
            response.put("email", request.getEmail());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PostMapping("/forgot-password/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequestDTO request,
                                           HttpSession session) {
        try {
            authService.resetForgotPassword(request.getToken(), request.getNewPassword(), session);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đặt lại mật khẩu thành công");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @GetMapping("/forgot-password/otp-remaining-time")
    public ResponseEntity<?> getForgotPasswordOtpRemainingTime(HttpSession session) {
        try {
            long remainingSeconds = authService.getForgotPasswordOtpRemainingSeconds(session);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("remainingSeconds", remainingSeconds);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra"));
        }
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequestDTO request,
                                       BindingResult bindingResult,
                                       HttpSession session) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(
                    createErrorResponse(bindingResult)
            );
        }
        
        try {
            RegisterResponseDTO response = authService.register(request, session);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");
            LoginResponseDTO loginResponseDTO = authService.login(username, password);

            return ResponseEntity.ok(loginResponseDTO);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequestDTO request) {
        try {
            LoginResponseDTO loginResponseDTO = authService.loginWithGoogle(request.getCode());
            return ResponseEntity.ok(loginResponseDTO);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    private Map<String, Object> createSuccessResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
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