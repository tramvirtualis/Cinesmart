package com.example.backend.services;

import com.example.backend.dtos.CreateVoucherDTO;
import com.example.backend.dtos.UpdateVoucherDTO;
import com.example.backend.dtos.VoucherResponseDTO;
import com.example.backend.dtos.VoucherValidationFact;
import com.example.backend.dtos.VoucherDiscountFact;
import com.example.backend.entities.Voucher;
import com.example.backend.entities.Customer;
import com.example.backend.entities.enums.VoucherScope;
import com.example.backend.repositories.VoucherRepository;
import com.example.backend.repositories.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieSession;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.utils.SecurityUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class VoucherService {
    
    private final VoucherRepository voucherRepository;
    private final CustomerRepository customerRepository;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;
    private final KieContainer kieContainer;
    
    @Transactional
    public VoucherResponseDTO createVoucher(CreateVoucherDTO createDTO, String username) {
        // Kiểm tra mã voucher đã tồn tại chưa
        if (voucherRepository.existsByCode(createDTO.getCode())) {
            throw new RuntimeException("Mã voucher đã tồn tại: " + createDTO.getCode());
        }
        
        // Validate voucher sử dụng Drools
        validateVoucherWithDrools(createDTO.getDiscountType(), createDTO.getDiscountValue(),
                createDTO.getMaxDiscountAmount(), createDTO.getMinOrderAmount(),
                createDTO.getStartDate(), createDTO.getEndDate(), createDTO.getScope());
        
        Voucher voucher = Voucher.builder()
                .code(createDTO.getCode().trim().toUpperCase())
                .name(createDTO.getName().trim())
                .description(createDTO.getDescription() != null ? createDTO.getDescription().trim() : null)
                .discountType(createDTO.getDiscountType())
                .discountValue(createDTO.getDiscountValue())
                .maxDiscountAmount(createDTO.getMaxDiscountAmount() != null ? createDTO.getMaxDiscountAmount() : java.math.BigDecimal.ZERO)
                .minOrderAmount(createDTO.getMinOrderAmount() != null ? createDTO.getMinOrderAmount() : java.math.BigDecimal.ZERO)
                .startDate(createDTO.getStartDate())
                .endDate(createDTO.getEndDate())
                .scope(createDTO.getScope())
                .image(createDTO.getImage() != null ? createDTO.getImage().trim() : null)
                .build();
        
        Voucher savedVoucher = voucherRepository.save(voucher);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.CREATE,
                    ObjectType.VOUCHER,
                    savedVoucher.getVoucherId(),
                    savedVoucher.getName(),
                    "Thêm voucher mới: " + savedVoucher.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log voucher activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return convertToDTO(savedVoucher);
    }
    
    @Transactional
    public VoucherResponseDTO updateVoucher(Long voucherId, UpdateVoucherDTO updateDTO, String username) {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với ID: " + voucherId));
        
        // Kiểm tra mã voucher đã tồn tại chưa (nếu thay đổi mã)
        if (updateDTO.getCode() != null && !updateDTO.getCode().equals(voucher.getCode())) {
            if (voucherRepository.existsByCode(updateDTO.getCode())) {
                throw new RuntimeException("Mã voucher đã tồn tại: " + updateDTO.getCode());
            }
            voucher.setCode(updateDTO.getCode().trim().toUpperCase());
        }
        
        if (updateDTO.getName() != null) {
            voucher.setName(updateDTO.getName().trim());
        }
        if (updateDTO.getDescription() != null) {
            voucher.setDescription(updateDTO.getDescription().trim());
        }
        if (updateDTO.getDiscountType() != null) {
            voucher.setDiscountType(updateDTO.getDiscountType());
        }
        if (updateDTO.getDiscountValue() != null) {
            voucher.setDiscountValue(updateDTO.getDiscountValue());
        }
        if (updateDTO.getMaxDiscountAmount() != null) {
            voucher.setMaxDiscountAmount(updateDTO.getMaxDiscountAmount());
        }
        if (updateDTO.getMinOrderAmount() != null) {
            voucher.setMinOrderAmount(updateDTO.getMinOrderAmount());
        }
        if (updateDTO.getStartDate() != null) {
            voucher.setStartDate(updateDTO.getStartDate());
        }
        if (updateDTO.getEndDate() != null) {
            voucher.setEndDate(updateDTO.getEndDate());
        }
        if (updateDTO.getScope() != null) {
            voucher.setScope(updateDTO.getScope());
        }
        if (updateDTO.getImage() != null) {
            voucher.setImage(updateDTO.getImage().trim());
        }
        
        // Validate voucher sử dụng Drools
        validateVoucherWithDrools(voucher.getDiscountType(), voucher.getDiscountValue(),
                voucher.getMaxDiscountAmount(), voucher.getMinOrderAmount(),
                voucher.getStartDate(), voucher.getEndDate(), voucher.getScope());
        
        Voucher updatedVoucher = voucherRepository.save(voucher);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.UPDATE,
                    ObjectType.VOUCHER,
                    updatedVoucher.getVoucherId(),
                    updatedVoucher.getName(),
                    "Cập nhật voucher: " + updatedVoucher.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log voucher activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return convertToDTO(updatedVoucher);
    }
    
    @Transactional
    public void deleteVoucher(Long voucherId, String username) {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với ID: " + voucherId));
        
        String voucherName = voucher.getName();
        voucherRepository.delete(voucher);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.DELETE,
                    ObjectType.VOUCHER,
                    voucherId,
                    voucherName,
                    "Xóa voucher: " + voucherName
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log voucher activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }
    
    public VoucherResponseDTO getVoucherById(Long voucherId) {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với ID: " + voucherId));
        return convertToDTO(voucher);
    }
    
    public List<VoucherResponseDTO> getAllVouchers() {
        return voucherRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<VoucherResponseDTO> getVouchersByScope(VoucherScope scope) {
        return voucherRepository.findByScope(scope).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public VoucherResponseDTO assignVoucherToCustomer(Long voucherId, Long customerId) throws Exception {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new Exception("Không tìm thấy voucher với ID: " + voucherId));
        
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new Exception("Không tìm thấy khách hàng với ID: " + customerId));
        
        // Kiểm tra voucher đã được gán cho customer chưa
        if (customer.getVouchers().stream().anyMatch(v -> v.getVoucherId().equals(voucherId))) {
            throw new Exception("Voucher này đã được gán cho khách hàng rồi");
        }
        
        // Thêm voucher vào danh sách vouchers của customer
        customer.getVouchers().add(voucher);
        customerRepository.save(customer);
        
        // Gửi thông báo WebSocket khi voucher được assign
        notificationService.notifyVoucherAdded(customerId, voucher.getCode(), voucher.getName());
        
        log.info("Assigned voucher ID: {} to customer ID: {}", voucherId, customerId);
        return convertToDTO(voucher);
    }
    
    @Transactional
    public void unassignVoucherFromCustomer(Long voucherId, Long customerId) throws Exception {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new Exception("Không tìm thấy voucher với ID: " + voucherId));
        
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new Exception("Không tìm thấy khách hàng với ID: " + customerId));
        
        // Kiểm tra voucher có được gán cho customer không
        if (!customer.getVouchers().stream().anyMatch(v -> v.getVoucherId().equals(voucherId))) {
            throw new Exception("Voucher này chưa được gán cho khách hàng");
        }
        
        // Xóa voucher khỏi danh sách vouchers của customer
        customer.getVouchers().removeIf(v -> v.getVoucherId().equals(voucherId));
        customerRepository.save(customer);
        
        log.info("Unassigned voucher ID: {} from customer ID: {}", voucherId, customerId);
    }
    
    /**
     * Validate voucher sử dụng Drools
     */
    private void validateVoucherWithDrools(
            com.example.backend.entities.enums.DiscountType discountType,
            java.math.BigDecimal discountValue,
            java.math.BigDecimal maxDiscountAmount,
            java.math.BigDecimal minOrderAmount,
            java.time.LocalDateTime startDate,
            java.time.LocalDateTime endDate,
            com.example.backend.entities.enums.VoucherScope scope) {
        
        // Tạo fact cho Drools
        VoucherValidationFact fact = VoucherValidationFact.builder()
                .code(null) // Không cần code cho validation
                .discountType(discountType)
                .discountValue(discountValue)
                .maxDiscountAmount(maxDiscountAmount)
                .minOrderAmount(minOrderAmount)
                .startDate(startDate)
                .endDate(endDate)
                .scope(scope)
                .valid(true) // Mặc định là hợp lệ
                .build();
        
        // Tạo KieSession từ KieContainer
        KieSession kieSession = kieContainer.newKieSession();
        
        try {
            // Insert fact vào KieSession
            kieSession.insert(fact);
            
            // Fire rules
            kieSession.fireAllRules();
            
            // Kiểm tra kết quả
            if (!fact.isValid() && fact.getErrorMessage() != null) {
                throw new RuntimeException(fact.getErrorMessage());
            }
        } finally {
            kieSession.dispose();
        }
    }
    
    /**
     * Tính giảm giá voucher sử dụng Drools
     * @param voucher Voucher cần tính
     * @param orderAmount Tổng tiền đơn hàng
     * @param orderDate Ngày đặt hàng
     * @return VoucherDiscountFact chứa kết quả tính toán
     */
    public VoucherDiscountFact calculateVoucherDiscount(Voucher voucher, BigDecimal orderAmount, LocalDateTime orderDate) {
        if (voucher == null || orderAmount == null) {
            VoucherDiscountFact fact = VoucherDiscountFact.builder()
                    .discountAmount(BigDecimal.ZERO)
                    .finalAmount(orderAmount != null ? orderAmount : BigDecimal.ZERO)
                    .applicable(false)
                    .errorMessage("Voucher hoặc tổng tiền đơn hàng không hợp lệ")
                    .build();
            return fact;
        }
        
        // Tạo fact cho Drools
        VoucherDiscountFact fact = VoucherDiscountFact.builder()
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .maxDiscountAmount(voucher.getMaxDiscountAmount())
                .minOrderAmount(voucher.getMinOrderAmount())
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .scope(voucher.getScope())
                .orderAmount(orderAmount)
                .orderDate(orderDate != null ? orderDate : LocalDateTime.now())
                .isPublicVoucher(voucher.getScope() == VoucherScope.PUBLIC)
                .build();
        
        // Tạo KieSession từ KieContainer
        KieSession kieSession = kieContainer.newKieSession();
        
        try {
            // Insert fact vào KieSession
            kieSession.insert(fact);
            
            // Fire rules
            kieSession.fireAllRules();
            
            return fact;
        } finally {
            kieSession.dispose();
        }
    }
    
    private VoucherResponseDTO convertToDTO(Voucher voucher) {
        return VoucherResponseDTO.builder()
                .voucherId(voucher.getVoucherId())
                .code(voucher.getCode())
                .name(voucher.getName())
                .description(voucher.getDescription())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .maxDiscountAmount(voucher.getMaxDiscountAmount())
                .minOrderAmount(voucher.getMinOrderAmount())
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .scope(voucher.getScope())
                .image(voucher.getImage())
                .build();
    }
}


