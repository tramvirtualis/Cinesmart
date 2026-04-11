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
 * Fact class cho Drools validation voucher
 * Chứa thông tin voucher cần validate
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherValidationFact {
    // Thông tin voucher
    private String code;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal maxDiscountAmount;
    private BigDecimal minOrderAmount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private VoucherScope scope;
    
    // Kết quả validation
    private boolean valid;
    private String errorMessage;
    
    public boolean isValid() {
        return valid;
    }
    
    public void setValid(boolean valid) {
        this.valid = valid;
    }
}

