package com.example.backend.controllers;

import com.example.backend.dtos.CreateFoodComboDTO;
import com.example.backend.dtos.FoodComboResponseDTO;
import com.example.backend.services.FoodComboService;
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
public class FoodComboController {
    
    private final FoodComboService foodComboService;
    private final JwtUtils jwtUtils;
    
    @PostMapping("/api/admin/food-combos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createFoodCombo(@Valid @RequestBody CreateFoodComboDTO createDTO,
                                            BindingResult bindingResult,
                                            HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            FoodComboResponseDTO response = foodComboService.createFoodCombo(createDTO, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                createSuccessResponse("Tạo sản phẩm thành công", response)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PutMapping("/api/admin/food-combos/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateFoodCombo(@PathVariable Long id,
                                            @Valid @RequestBody CreateFoodComboDTO updateDTO,
                                            BindingResult bindingResult,
                                            HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }
        
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            FoodComboResponseDTO response = foodComboService.updateFoodCombo(id, updateDTO, username);
            return ResponseEntity.ok(createSuccessResponse("Cập nhật sản phẩm thành công", response));
        } catch (RuntimeException e) {
            // Kiểm tra xem có phải lỗi ràng buộc không (thông báo dài hơn)
            if (e.getMessage() != null && e.getMessage().contains("đã có đơn hàng")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ PUBLIC ENDPOINTS ============
    
    /**
     * Lấy danh sách food combos theo cinema complex ID (public - không cần đăng nhập)
     */
    @GetMapping("/api/public/food-combos/cinema-complex/{complexId}")
    public ResponseEntity<?> getFoodCombosByCinemaComplex(@PathVariable Long complexId) {
        try {
            List<FoodComboResponseDTO> combos = foodComboService.getFoodCombosByCinemaComplexId(complexId);
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách sản phẩm thành công", combos));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ ADMIN ENDPOINTS ============
    
    @GetMapping("/api/admin/food-combos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllFoodCombos() {
        try {
            List<FoodComboResponseDTO> combos = foodComboService.getAllFoodCombos();
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách sản phẩm thành công", combos));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    
    @GetMapping("/api/admin/food-combos/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getFoodComboById(@PathVariable Long id) {
        try {
            FoodComboResponseDTO combo = foodComboService.getFoodComboById(id);
            return ResponseEntity.ok(createSuccessResponse("Lấy thông tin sản phẩm thành công", combo));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @DeleteMapping("/api/admin/food-combos/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteFoodCombo(@PathVariable Long id,
                                             HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            foodComboService.deleteFoodCombo(id, username);
            return ResponseEntity.ok(createSuccessResponse("Xóa sản phẩm thành công", null));
        } catch (RuntimeException e) {
            // Kiểm tra xem có phải lỗi ràng buộc không (thông báo dài hơn)
            if (e.getMessage() != null && e.getMessage().contains("đã có đơn hàng")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
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

