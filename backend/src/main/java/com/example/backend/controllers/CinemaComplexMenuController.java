package com.example.backend.controllers;

import com.example.backend.dtos.FoodComboResponseDTO;
import com.example.backend.entities.CinemaComplex;
import com.example.backend.entities.FoodCombo;
import com.example.backend.repositories.CinemaComplexRepository;
import com.example.backend.services.CinemaComplexMenuService;
import com.example.backend.utils.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
public class CinemaComplexMenuController {
    
    private final CinemaComplexMenuService menuService;
    private final CinemaComplexRepository cinemaComplexRepository;
    private final JwtUtils jwtUtils;
    
    // ============ PUBLIC ENDPOINTS ============
    
    /**
     * Lấy menu của cinema complex (Public - không cần authentication)
     */
    @GetMapping("/api/public/menu/complex/{complexId}")
    public ResponseEntity<?> getMenuByComplexIdPublic(@PathVariable Long complexId) {
        System.out.println("CinemaComplexMenuController: getMenuByComplexIdPublic called with complexId: " + complexId);
        try {
            CinemaComplex complex = cinemaComplexRepository.findByIdWithFoodCombos(complexId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp"));
            
            System.out.println("CinemaComplexMenuController: Found complex: " + complex.getName());
            System.out.println("CinemaComplexMenuController: Food combos count: " + (complex.getFoodCombos() != null ? complex.getFoodCombos().size() : 0));
            
            // Fetch foodCombos eagerly
            List<FoodCombo> foodCombos = complex.getFoodCombos() != null ? complex.getFoodCombos() : java.util.Collections.emptyList();
            List<FoodComboResponseDTO> menu = foodCombos.stream()
                .map(foodCombo -> FoodComboResponseDTO.builder()
                    .foodComboId(foodCombo.getFoodComboId())
                    .name(foodCombo.getName())
                    .price(foodCombo.getPrice())
                    .description(foodCombo.getDescription())
                    .image(foodCombo.getImage())
                    .build())
                .collect(Collectors.toList());
            
            System.out.println("CinemaComplexMenuController: Returning menu with " + menu.size() + " items");
            return ResponseEntity.ok(createSuccessResponse("Lấy menu thành công", menu));
        } catch (RuntimeException e) {
            System.out.println("CinemaComplexMenuController: RuntimeException: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.out.println("CinemaComplexMenuController: Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    // ============ MANAGER ENDPOINTS (CẦN AUTHENTICATION) ============
    
    @GetMapping("/api/manager/menu/complex/{complexId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getMenuByComplexId(@PathVariable Long complexId,
                                                HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            List<FoodComboResponseDTO> menu = menuService.getMenuByComplexId(complexId, username);
            return ResponseEntity.ok(createSuccessResponse("Lấy menu thành công", menu));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("không có quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/api/manager/menu/available/{complexId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> getAvailableFoodCombos(@PathVariable Long complexId,
                                                    HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            List<FoodComboResponseDTO> combos = menuService.getAvailableFoodCombos(complexId, username);
            return ResponseEntity.ok(createSuccessResponse("Lấy danh sách sản phẩm thành công", combos));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        }
    }
    
    @PostMapping("/api/manager/menu/complex/{complexId}/add/{foodComboId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> addFoodComboToMenu(@PathVariable Long complexId,
                                                @PathVariable Long foodComboId,
                                                HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            FoodComboResponseDTO added = menuService.addFoodComboToMenu(complexId, foodComboId, username);
            return ResponseEntity.ok(createSuccessResponse("Thêm sản phẩm vào menu thành công", added));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("không có quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }
    
    @DeleteMapping("/api/manager/menu/complex/{complexId}/remove/{foodComboId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<?> removeFoodComboFromMenu(@PathVariable Long complexId,
                                                      @PathVariable Long foodComboId,
                                                      HttpServletRequest request) {
        try {
            // Lấy username từ JWT token
            String username = getUsernameFromRequest(request);
            menuService.removeFoodComboFromMenu(complexId, foodComboId, username);
            return ResponseEntity.ok(createSuccessResponse("Xóa sản phẩm khỏi menu thành công", null));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("không có quyền")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
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
}


