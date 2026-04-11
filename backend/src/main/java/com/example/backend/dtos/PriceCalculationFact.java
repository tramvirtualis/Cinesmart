package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fact class cho Drools tính giá vé
 * Chứa thông tin để tính giá vé dựa trên các quy tắc
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceCalculationFact {
    // Thông tin đầu vào
    private BigDecimal basePrice;
    private LocalDateTime showtimeDateTime;
    
    // Kết quả tính toán
    private BigDecimal finalPrice;
    private String calculationReason; // Lý do tính giá (ví dụ: "Weekend surcharge applied")
    
    public BigDecimal getFinalPrice() {
        return finalPrice != null ? finalPrice : basePrice;
    }
}

