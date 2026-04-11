package com.example.backend.controllers;

import com.example.backend.dtos.CreateVoucherDTO;
import com.example.backend.dtos.UpdateVoucherDTO;
import com.example.backend.dtos.VoucherResponseDTO;
import com.example.backend.entities.enums.VoucherScope;
import com.example.backend.services.VoucherService;
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
public class VoucherController {
    
    private final VoucherService voucherService;
    private final JwtUtils jwtUtils;
    
    // ============ ADMIN ENDPOINTS ============
    
    @PostMapping("/api/admin/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createVoucher(@Valid @RequestBody CreateVoucherDTO createDTO,
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
            VoucherResponseDTO voucherResponse = voucherService.createVoucher(createDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    createSuccessResponse("Tạo voucher thành công", voucherResponse)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/api/admin/vouchers/{voucherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateVoucher(@PathVariable Long voucherId,
                                          @Valid @RequestBody UpdateVoucherDTO updateDTO,
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
            VoucherResponseDTO voucherResponse = voucherService.updateVoucher(voucherId, updateDTO, username);
            return ResponseEntity.ok(
                    createSuccessResponse("Cập nhật voucher thành công", voucherResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/api/admin/vouchers/{voucherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteVoucher(@PathVariable Long voucherId,
                                          HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            voucherService.deleteVoucher(voucherId, username);
            return ResponseEntity.ok(
                    createSuccessResponse("Xóa voucher thành công", null)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/vouchers/{voucherId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getVoucherById(@PathVariable Long voucherId) {
        try {
            VoucherResponseDTO voucherResponse = voucherService.getVoucherById(voucherId);
            return ResponseEntity.ok(
                    createSuccessResponse("Lấy thông tin voucher thành công", voucherResponse)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/admin/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllVouchers(@RequestParam(required = false) VoucherScope scope) {
        try {
            List<VoucherResponseDTO> vouchers;
            if (scope != null) {
                vouchers = voucherService.getVouchersByScope(scope);
            } else {
                vouchers = voucherService.getAllVouchers();
            }
            return ResponseEntity.ok(
                    createSuccessResponse("Lấy danh sách voucher thành công", vouchers)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PostMapping("/api/admin/vouchers/{voucherId}/assign/{customerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignVoucherToCustomer(@PathVariable Long voucherId,
                                                      @PathVariable Long customerId) {
        try {
            VoucherResponseDTO voucherResponse = voucherService.assignVoucherToCustomer(voucherId, customerId);
            return ResponseEntity.ok(
                    createSuccessResponse("Gán voucher cho khách hàng thành công", voucherResponse)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/api/admin/vouchers/{voucherId}/unassign/{customerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> unassignVoucherFromCustomer(@PathVariable Long voucherId,
                                                          @PathVariable Long customerId) {
        try {
            voucherService.unassignVoucherFromCustomer(voucherId, customerId);
            return ResponseEntity.ok(
                    createSuccessResponse("Bỏ gán voucher khỏi khách hàng thành công", null)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ PUBLIC ENDPOINTS ============
    
    @GetMapping("/api/public/vouchers")
    public ResponseEntity<?> getPublicVouchers() {
        try {
            List<VoucherResponseDTO> vouchers = voucherService.getVouchersByScope(VoucherScope.PUBLIC);
            return ResponseEntity.ok(vouchers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
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
        response.put("message", "Dữ liệu không hợp lệ");
        response.put("errors", bindingResult.getFieldErrors().stream()
                .collect(Collectors.toMap(
                        error -> error.getField(),
                        error -> error.getDefaultMessage()
                )));
        return response;
    }
}


