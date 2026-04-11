package com.example.backend.services;

import com.example.backend.dtos.CreateFoodComboDTO;
import com.example.backend.dtos.FoodComboResponseDTO;
import com.example.backend.entities.FoodCombo;
import com.example.backend.repositories.FoodComboRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.utils.SecurityUtils;

@Service
@RequiredArgsConstructor
public class FoodComboService {
    
    private final FoodComboRepository foodComboRepository;
    private final ActivityLogService activityLogService;
    
    @Transactional
    public FoodComboResponseDTO createFoodCombo(CreateFoodComboDTO createDTO, String username) {
        FoodCombo foodCombo = FoodCombo.builder()
            .name(createDTO.getName())
            .price(createDTO.getPrice())
            .description(createDTO.getDescription())
            .image(createDTO.getImage())
            .build();
        
        FoodCombo saved = foodComboRepository.save(foodCombo);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.CREATE,
                    ObjectType.FOOD,
                    saved.getFoodComboId(),
                    saved.getName(),
                    "Thêm đồ ăn mới: " + saved.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log food combo activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return mapToDTO(saved);
    }
    
    @Transactional
    public FoodComboResponseDTO updateFoodCombo(Long id, CreateFoodComboDTO updateDTO, String username) {
        FoodCombo foodCombo = foodComboRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        
        // Kiểm tra ràng buộc: nếu có đơn hàng đã thanh toán, không cho phép thay đổi name và price
        boolean hasPaidOrders = foodComboRepository.existsPaidOrderCombosByFoodComboId(id);
        
        if (hasPaidOrders) {
            // Kiểm tra xem có thay đổi name hoặc price không
            boolean nameChanged = !foodCombo.getName().equals(updateDTO.getName());
            boolean priceChanged = foodCombo.getPrice().compareTo(updateDTO.getPrice()) != 0;
            
            if (nameChanged || priceChanged) {
                throw new RuntimeException("Không thể thay đổi tên hoặc giá của đồ ăn vì đã có đơn hàng đã thanh toán sử dụng sản phẩm này. Chỉ có thể thay đổi mô tả và hình ảnh.");
            }
        }
        
        foodCombo.setName(updateDTO.getName());
        foodCombo.setPrice(updateDTO.getPrice());
        foodCombo.setDescription(updateDTO.getDescription());
        foodCombo.setImage(updateDTO.getImage());
        
        FoodCombo saved = foodComboRepository.save(foodCombo);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.UPDATE,
                    ObjectType.FOOD,
                    saved.getFoodComboId(),
                    saved.getName(),
                    "Cập nhật đồ ăn: " + saved.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log food combo activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return mapToDTO(saved);
    }
    
    public List<FoodComboResponseDTO> getAllFoodCombos() {
        // Chỉ lấy các FoodCombo của hệ thống (không thuộc order nào)
        return foodComboRepository.findAll().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<FoodComboResponseDTO> getAvailableFoodCombos() {
        // Chỉ lấy các FoodCombo của hệ thống (không thuộc order nào)
        return foodComboRepository.findAll().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<FoodComboResponseDTO> getFoodCombosByCinemaComplexId(Long complexId) {
        return foodComboRepository.findByCinemaComplexId(complexId).stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public FoodComboResponseDTO getFoodComboById(Long id) {
        FoodCombo foodCombo = foodComboRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        return mapToDTO(foodCombo);
    }
    
    @Transactional
    public void deleteFoodCombo(Long id, String username) {
        FoodCombo foodCombo = foodComboRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        
        // Kiểm tra ràng buộc: không cho phép xóa nếu có đơn hàng đã thanh toán sử dụng combo này
        if (foodComboRepository.existsPaidOrderCombosByFoodComboId(id)) {
            throw new RuntimeException("Không thể xóa đồ ăn vì đã có đơn hàng đã thanh toán sử dụng sản phẩm này. Vui lòng xóa các đơn hàng liên quan trước.");
        }
        
        String foodComboName = foodCombo.getName();
        foodComboRepository.deleteById(id);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.DELETE,
                    ObjectType.FOOD,
                    id,
                    foodComboName,
                    "Xóa đồ ăn: " + foodComboName
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log food combo activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }
    
    private FoodComboResponseDTO mapToDTO(FoodCombo foodCombo) {
        return FoodComboResponseDTO.builder()
            .foodComboId(foodCombo.getFoodComboId())
            .name(foodCombo.getName())
            .price(foodCombo.getPrice())
            .description(foodCombo.getDescription())
            .image(foodCombo.getImage())
            .build();
    }
}

