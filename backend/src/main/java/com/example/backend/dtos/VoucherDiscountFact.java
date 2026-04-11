package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.backend.entities.enums.DiscountType;
import com.example.backend.entities.enums.VoucherScope;

/**
 * Fact class cho Drools tính giảm giá voucher
 * Chứa thông tin voucher và đơn hàng để tính discount
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherDiscountFact {
    // Thông tin voucher
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minOrderAmount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private VoucherScope scope;
    
    // Thông tin đơn hàng
    private BigDecimal orderAmount;
    private LocalDateTime orderDate;
    private boolean isPublicVoucher; // Voucher có phải PUBLIC không
    
    // Kết quả tính toán
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
    private boolean applicable; // Voucher có thể áp dụng không
    private String errorMessage; // Lý do không thể áp dụng
    
    public BigDecimal getDiscountAmount() {
        return discountAmount != null ? discountAmount : BigDecimal.ZERO;
    }
    
    public BigDecimal getFinalAmount() {
        return finalAmount != null ? finalAmount : orderAmount;
    }
    
    public boolean isApplicable() {
        return applicable;
    }
}

