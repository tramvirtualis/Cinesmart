package com.example.backend.services;

import com.example.backend.dtos.FoodComboResponseDTO;
import com.example.backend.entities.CinemaComplex;
import com.example.backend.entities.FoodCombo;
import com.example.backend.entities.Manager;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.repositories.CinemaComplexRepository;
import com.example.backend.repositories.FoodComboRepository;
import com.example.backend.repositories.ManagerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CinemaComplexMenuService {
    
    private final CinemaComplexRepository cinemaComplexRepository;
    private final FoodComboRepository foodComboRepository;
    private final ManagerRepository managerRepository;
    private final ActivityLogService activityLogService;
    
    public List<FoodComboResponseDTO> getMenuByComplexId(Long complexId, String username) {
        // Lấy manager hiện tại
        Manager manager = managerRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy manager"));
        
        // Kiểm tra manager có quyền quản lý cinema complex này không
        if (manager.getCinemaComplex() == null || 
            !manager.getCinemaComplex().getComplexId().equals(complexId)) {
            throw new RuntimeException("Bạn không có quyền quản lý cụm rạp này");
        }
        
        CinemaComplex complex = cinemaComplexRepository.findById(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp"));
        
        return complex.getFoodCombos().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<FoodComboResponseDTO> getAvailableFoodCombos(Long complexId, String username) {
        // Lấy manager hiện tại
        Manager manager = managerRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy manager"));
        
        // Kiểm tra manager có quyền quản lý cinema complex này không
        if (manager.getCinemaComplex() == null || 
            !manager.getCinemaComplex().getComplexId().equals(complexId)) {
            throw new RuntimeException("Bạn không có quyền quản lý cụm rạp này");
        }
        
        CinemaComplex complex = cinemaComplexRepository.findById(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp"));
        
        // Lấy tất cả food combos và loại bỏ những cái đã có trong menu
        List<FoodCombo> allFoodCombos = foodComboRepository.findAll();
        List<FoodCombo> complexFoodCombos = complex.getFoodCombos();
        
        return allFoodCombos.stream()
            .filter(foodCombo -> !complexFoodCombos.contains(foodCombo))
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public FoodComboResponseDTO addFoodComboToMenu(Long complexId, Long foodComboId, String username) {
        // Lấy manager hiện tại
        Manager manager = managerRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy manager"));
        
        // Kiểm tra manager có quyền quản lý cinema complex này không
        if (manager.getCinemaComplex() == null || 
            !manager.getCinemaComplex().getComplexId().equals(complexId)) {
            throw new RuntimeException("Bạn không có quyền quản lý cụm rạp này");
        }
        
        CinemaComplex complex = cinemaComplexRepository.findById(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp"));
        
        FoodCombo foodCombo = foodComboRepository.findById(foodComboId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        
        if (complex.getFoodCombos().contains(foodCombo)) {
            throw new RuntimeException("Sản phẩm đã có trong menu");
        }
        
        complex.getFoodCombos().add(foodCombo);
        cinemaComplexRepository.save(complex);
        
        logMenuActivity(
            username,
            Action.CREATE,
            complex,
            foodCombo,
            "Thêm sản phẩm " + foodCombo.getName() + " vào menu " + complex.getName()
        );
        
        return mapToDTO(foodCombo);
    }
    
    @Transactional
    public void removeFoodComboFromMenu(Long complexId, Long foodComboId, String username) {
        // Lấy manager hiện tại
        Manager manager = managerRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy manager"));
        
        // Kiểm tra manager có quyền quản lý cinema complex này không
        if (manager.getCinemaComplex() == null || 
            !manager.getCinemaComplex().getComplexId().equals(complexId)) {
            throw new RuntimeException("Bạn không có quyền quản lý cụm rạp này");
        }
        
        CinemaComplex complex = cinemaComplexRepository.findById(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp"));
        
        FoodCombo foodCombo = foodComboRepository.findById(foodComboId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));
        
        if (!complex.getFoodCombos().contains(foodCombo)) {
            throw new RuntimeException("Sản phẩm không có trong menu");
        }
        
        complex.getFoodCombos().remove(foodCombo);
        cinemaComplexRepository.save(complex);

        logMenuActivity(
            username,
            Action.DELETE,
            complex,
            foodCombo,
            "Xóa sản phẩm " + foodCombo.getName() + " khỏi menu " + complex.getName()
        );
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

    private void logMenuActivity(String username,
                                 Action action,
                                 CinemaComplex complex,
                                 FoodCombo foodCombo,
                                 String description) {
        if (username == null || username.isBlank() || complex == null || complex.getComplexId() == null) {
            return;
        }

        try {
            String objectName = String.format("%s - %s", foodCombo != null ? foodCombo.getName() : "Sản phẩm", complex.getName());
            activityLogService.logActivity(
                username,
                action,
                ObjectType.FOOD,
                foodCombo != null ? foodCombo.getFoodComboId() : null,
                objectName,
                description
            );
        } catch (Exception e) {
            System.err.println("ERROR logging menu activity: " + e.getMessage());
        }
    }
}

