package com.example.backend.services;

import com.example.backend.dtos.BannerResponseDTO;
import com.example.backend.dtos.CreateBannerDTO;
import com.example.backend.dtos.UpdateBannerDTO;
import com.example.backend.entities.Banner;
import com.example.backend.repositories.BannerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.utils.SecurityUtils;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class BannerService {
    
    private final BannerRepository bannerRepository;
    private final ActivityLogService activityLogService;
    
    @Transactional
    public BannerResponseDTO createBanner(CreateBannerDTO createDTO, String username) {
        // Nếu không có displayOrder, tự động gán giá trị lớn nhất + 1
        Integer displayOrder = createDTO.getDisplayOrder();
        if (displayOrder == null) {
            Integer maxOrder = bannerRepository.findAll().stream()
                    .map(Banner::getDisplayOrder)
                    .filter(order -> order != null)
                    .max(Integer::compareTo)
                    .orElse(-1);
            displayOrder = maxOrder + 1;
        }
        
        Banner banner = Banner.builder()
                .name(createDTO.getName() != null ? createDTO.getName().trim() : null)
                .image(createDTO.getImage() != null ? createDTO.getImage().trim() : null)
                .displayOrder(displayOrder)
                .build();
        
        Banner savedBanner = bannerRepository.save(banner);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.CREATE,
                    ObjectType.BANNER,
                    savedBanner.getId(),
                    savedBanner.getName(),
                    "Thêm banner mới: " + savedBanner.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log banner activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return convertToDTO(savedBanner);
    }
    
    @Transactional
    public BannerResponseDTO updateBanner(Long bannerId, UpdateBannerDTO updateDTO, String username) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner với ID: " + bannerId));
        
        if (updateDTO.getName() != null) {
            banner.setName(updateDTO.getName().trim());
        }
        
        if (updateDTO.getImage() != null) {
            banner.setImage(updateDTO.getImage().trim());
        }
        
        if (updateDTO.getIsActive() != null) {
            banner.setIsActive(updateDTO.getIsActive());
        }
        
        if (updateDTO.getDisplayOrder() != null) {
            banner.setDisplayOrder(updateDTO.getDisplayOrder());
        }
        
        Banner updatedBanner = bannerRepository.save(banner);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.UPDATE,
                    ObjectType.BANNER,
                    updatedBanner.getId(),
                    updatedBanner.getName(),
                    "Cập nhật banner: " + updatedBanner.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log banner activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return convertToDTO(updatedBanner);
    }
    
    @Transactional
    public BannerResponseDTO toggleBannerActive(Long bannerId, String username) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner với ID: " + bannerId));
        
        banner.setIsActive(!banner.getIsActive());
        Banner updatedBanner = bannerRepository.save(banner);
        
        // Log activity
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.UPDATE,
                    ObjectType.BANNER,
                    updatedBanner.getId(),
                    updatedBanner.getName(),
                    (updatedBanner.getIsActive() ? "Kích hoạt" : "Vô hiệu hóa") + " banner: " + updatedBanner.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log banner activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return convertToDTO(updatedBanner);
    }
    
    @Transactional
    public void deleteBanner(Long bannerId, String username) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner với ID: " + bannerId));
        
        String bannerName = banner.getName();
        bannerRepository.deleteById(bannerId);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.DELETE,
                    ObjectType.BANNER,
                    bannerId,
                    bannerName,
                    "Xóa banner: " + bannerName
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log banner activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }
    
    public BannerResponseDTO getBannerById(Long bannerId) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner với ID: " + bannerId));
        return convertToDTO(banner);
    }
    
    public List<BannerResponseDTO> getAllBanners() {
        return bannerRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<BannerResponseDTO> getActiveBanners() {
        return bannerRepository.findByIsActiveTrueOrderByDisplayOrderAsc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    private BannerResponseDTO convertToDTO(Banner banner) {
        return BannerResponseDTO.builder()
                .id(banner.getId())
                .name(banner.getName())
                .image(banner.getImage())
                .isActive(banner.getIsActive())
                .displayOrder(banner.getDisplayOrder())
                .build();
    }
}

