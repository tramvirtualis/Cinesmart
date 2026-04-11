package com.example.backend.controllers;

import com.example.backend.dtos.PriceDTO;
import com.example.backend.dtos.UpdatePricesRequestDTO;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.entities.enums.RoomType;
import com.example.backend.entities.enums.SeatType;
import com.example.backend.services.ActivityLogService;
import com.example.backend.services.PriceService;
import com.example.backend.utils.JwtUtils;
import com.example.backend.utils.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class PriceController {
    
    private final PriceService priceService;
    private final ActivityLogService activityLogService;
    private final JwtUtils jwtUtils;
    
    // ============ PUBLIC ENDPOINTS ============
    
    /**
     * Lấy tất cả giá (public - không cần đăng nhập)
     */
    @GetMapping("/api/public/prices")
    public ResponseEntity<?> getPublicPrices() {
        try {
            List<PriceDTO> prices = priceService.getAllPrices();
            return ResponseEntity.ok(
                    createSuccessResponse("Lấy danh sách bảng giá thành công", prices)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Lỗi khi lấy danh sách bảng giá: " + e.getMessage()));
        }
    }
    
    // ============ ADMIN ENDPOINTS ============
    
    @GetMapping("/api/admin/prices")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllPrices() {
        try {
            List<PriceDTO> prices = priceService.getAllPrices();
            return ResponseEntity.ok(
                    createSuccessResponse("Lấy danh sách bảng giá thành công", prices)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Lỗi khi lấy danh sách bảng giá: " + e.getMessage()));
        }
    }
    
    @PutMapping("/api/admin/prices")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updatePrices(@RequestBody Map<String, Object> requestBody,
                                          HttpServletRequest request) {
        try {
            // Log incoming request for debugging
            System.out.println("=== RECEIVED UPDATE PRICES REQUEST ===");
            System.out.println("Request body: " + requestBody);
            System.out.println("Request body class: " + (requestBody != null ? requestBody.getClass() : "null"));
            
            // Manually parse the request to handle enum conversion
            Object pricesObj = requestBody.get("prices");
            System.out.println("Prices object: " + pricesObj);
            System.out.println("Prices object class: " + (pricesObj != null ? pricesObj.getClass() : "null"));
            
            if (pricesObj == null) {
                System.err.println("ERROR: prices is null in request body");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("Danh sách giá không được để trống"));
            }
            
            List<Map<String, Object>> pricesList;
            if (pricesObj instanceof List) {
                pricesList = (List<Map<String, Object>>) pricesObj;
            } else {
                System.err.println("ERROR: prices is not a List, it's: " + pricesObj.getClass());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("Định dạng dữ liệu không hợp lệ"));
            }
            
            if (pricesList.isEmpty()) {
                System.err.println("ERROR: prices list is empty");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("Danh sách giá không được để trống"));
            }
            
            System.out.println("Number of prices: " + pricesList.size());
            
            // Convert to UpdatePricesRequestDTO with proper enum conversion
            UpdatePricesRequestDTO updateRequest = new UpdatePricesRequestDTO();
            List<PriceDTO> priceDTOs = new java.util.ArrayList<>();
            
            for (int i = 0; i < pricesList.size(); i++) {
                Map<String, Object> priceMap = pricesList.get(i);
                System.out.println("Processing price item " + i + ": " + priceMap);
                
                PriceDTO priceDTO = new PriceDTO();
                
                // Handle id
                Object idObj = priceMap.get("id");
                if (idObj != null) {
                    try {
                        priceDTO.setId(Long.valueOf(idObj.toString()));
                    } catch (NumberFormatException e) {
                        System.err.println("Warning: Invalid id format: " + idObj);
                    }
                }
                
                // Handle roomType - convert from frontend format to backend enum
                Object roomTypeObj = priceMap.get("roomType");
                String roomTypeStr = roomTypeObj != null ? roomTypeObj.toString() : null;
                System.out.println("  roomTypeStr: " + roomTypeStr);
                
                if (roomTypeStr != null && !roomTypeStr.isEmpty()) {
                    RoomType roomType = convertRoomType(roomTypeStr);
                    if (roomType == null) {
                        System.err.println("ERROR: Invalid roomType: " + roomTypeStr + " in item " + i);
                        continue;
                    }
                    priceDTO.setRoomType(roomType);
                    System.out.println("  Converted roomType: " + roomType);
                } else {
                    System.err.println("ERROR: roomType is null or empty in item " + i + ": " + priceMap);
                    continue;
                }
                
                // Handle seatType
                Object seatTypeObj = priceMap.get("seatType");
                String seatTypeStr = seatTypeObj != null ? seatTypeObj.toString() : null;
                System.out.println("  seatTypeStr: " + seatTypeStr);
                
                if (seatTypeStr != null && !seatTypeStr.isEmpty()) {
                    try {
                        SeatType seatType = SeatType.valueOf(seatTypeStr.toUpperCase());
                        priceDTO.setSeatType(seatType);
                        System.out.println("  Converted seatType: " + seatType);
                    } catch (IllegalArgumentException e) {
                        System.err.println("ERROR: Invalid seatType: " + seatTypeStr + " in item " + i);
                        continue;
                    }
                } else {
                    System.err.println("ERROR: seatType is null or empty in item " + i + ": " + priceMap);
                    continue;
                }
                
                // Handle price - convert to BigDecimal
                Object priceObj = priceMap.get("price");
                System.out.println("  priceObj: " + priceObj + " (type: " + (priceObj != null ? priceObj.getClass() : "null") + ")");
                
                if (priceObj != null) {
                    BigDecimal price;
                    try {
                        if (priceObj instanceof Number) {
                            price = BigDecimal.valueOf(((Number) priceObj).doubleValue());
                        } else if (priceObj instanceof String) {
                            String priceStr = ((String) priceObj).trim();
                            if (priceStr.isEmpty()) {
                                System.err.println("ERROR: price string is empty in item " + i);
                                continue;
                            }
                            price = new BigDecimal(priceStr);
                        } else {
                            System.err.println("ERROR: Invalid price type: " + priceObj.getClass() + " in item " + i);
                            continue;
                        }
                        priceDTO.setPrice(price);
                        System.out.println("  Converted price: " + price);
                    } catch (NumberFormatException e) {
                        System.err.println("ERROR: Invalid price format: " + priceObj + " in item " + i);
                        continue;
                    }
                } else {
                    System.err.println("ERROR: price is null in item " + i + ": " + priceMap);
                    continue;
                }
                
                System.out.println("  Final PriceDTO: id=" + priceDTO.getId() + ", roomType=" + priceDTO.getRoomType() + ", seatType=" + priceDTO.getSeatType() + ", price=" + priceDTO.getPrice());
                priceDTOs.add(priceDTO);
            }
            
            System.out.println("Total valid PriceDTOs: " + priceDTOs.size());
            
            if (priceDTOs.isEmpty()) {
                System.err.println("ERROR: No valid PriceDTOs after conversion");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("Không có dữ liệu giá hợp lệ để lưu"));
            }
            
            updateRequest.setPrices(priceDTOs);
            
            // Lấy username từ JWT token (giống VoucherController)
            String username = getUsernameFromRequest(request);
            System.out.println("=== PRICE UPDATE ===");
            System.out.println("Username from request: " + (username != null ? username : "NULL"));
            
            System.out.println("Calling priceService.updatePrices with " + priceDTOs.size() + " items");
            List<PriceDTO> updatedPrices = priceService.updatePrices(updateRequest);
            System.out.println("Service returned " + updatedPrices.size() + " prices");
            
            // Log activity SAU KHI cập nhật giá thành công
            System.out.println("=== PRICE UPDATE ACTIVITY LOG ===");
            System.out.println("Username: " + (username != null ? username : "NULL"));
            if (username != null && !username.isEmpty()) {
                try {
                    // Tạo mô tả chi tiết về các giá đã cập nhật
                    StringBuilder description = new StringBuilder("Cập nhật bảng giá: ");
                    int count = 0;
                    for (PriceDTO priceDTO : priceDTOs) {
                        if (count > 0) description.append(", ");
                        description.append(priceDTO.getRoomType())
                                   .append(" - ")
                                   .append(priceDTO.getSeatType())
                                   .append(" = ")
                                   .append(priceDTO.getPrice());
                        count++;
                        if (count >= 3) { // Giới hạn hiển thị 3 giá đầu tiên
                            description.append("...");
                            break;
                        }
                    }
                    if (priceDTOs.size() > 3) {
                        description.append(" (tổng cộng ").append(priceDTOs.size()).append(" giá)");
                    }
                    
                    System.out.println("About to log activity:");
                    System.out.println("  - Username: " + username);
                    System.out.println("  - Action: UPDATE");
                    System.out.println("  - ObjectType: PRICE");
                    System.out.println("  - ObjectId: 0L (no specific ID for price table)");
                    System.out.println("  - ObjectName: Bảng giá");
                    System.out.println("  - Description: " + description.toString());
                    
                    // Gọi logActivity - sử dụng 0L thay vì null để tránh vấn đề với database constraint
                    System.out.println("Calling activityLogService.logActivity with:");
                    System.out.println("  username=" + username);
                    System.out.println("  action=UPDATE");
                    System.out.println("  objectType=PRICE");
                    System.out.println("  objectId=0L");
                    System.out.println("  objectName=Bảng giá");
                    System.out.println("  description=" + description.toString());
                    
                    activityLogService.logActivity(
                        username,
                        Action.UPDATE,
                        ObjectType.PRICE,
                        0L, // Sử dụng 0L thay vì null vì cập nhật nhiều giá (không có ID cụ thể)
                        "Bảng giá",
                        description.toString()
                    );
                    
                    System.out.println("✓ Activity logged successfully - method returned without exception");
                } catch (Exception e) {
                    System.err.println("✗ ERROR: Failed to log price activity");
                    System.err.println("  Exception type: " + e.getClass().getName());
                    System.err.println("  Exception message: " + e.getMessage());
                    e.printStackTrace();
                }
            } else {
                System.err.println("✗ WARNING: Username is null or empty, cannot log activity");
                System.err.println("  This might be because:");
                System.err.println("  1. JWT token is missing from request");
                System.err.println("  2. JWT token is invalid");
                System.err.println("  3. JWT token does not contain username");
            }
            
            return ResponseEntity.ok(
                    createSuccessResponse("Cập nhật bảng giá thành công", updatedPrices)
            );
        } catch (IllegalArgumentException e) {
            System.err.println("IllegalArgumentException: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.err.println("Exception in updatePrices: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Lỗi khi cập nhật bảng giá: " + e.getMessage()));
        }
    }
    
    private RoomType convertRoomType(String roomTypeStr) {
        if (roomTypeStr == null) return null;
        
        String upper = roomTypeStr.toUpperCase();
        switch (upper) {
            case "2D":
            case "TYPE_2D":
                return RoomType.TYPE_2D;
            case "3D":
            case "TYPE_3D":
                return RoomType.TYPE_3D;
            case "DELUXE":
                return RoomType.DELUXE;
            default:
                try {
                    return RoomType.valueOf(upper);
                } catch (IllegalArgumentException e) {
                    return null;
                }
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createOrUpdatePrice(@RequestBody PriceDTO priceDTO) {
        try {
            PriceDTO result = priceService.createOrUpdatePrice(priceDTO);
            return ResponseEntity.ok(
                    createSuccessResponse("Tạo/cập nhật giá thành công", result)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Lỗi khi tạo/cập nhật giá: " + e.getMessage()));
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePrice(@PathVariable Long id) {
        try {
            priceService.deletePrice(id);
            return ResponseEntity.ok(
                    createSuccessResponse("Xóa giá thành công", null)
            );
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Lỗi khi xóa giá: " + e.getMessage()));
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
}

