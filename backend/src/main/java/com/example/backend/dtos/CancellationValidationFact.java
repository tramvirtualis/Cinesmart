package com.example.backend.dtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancellationValidationFact {
    // Input
    private Long orderId;
    private Long userId;
    private LocalDateTime orderDate;
    private LocalDateTime paymentDate;
    private LocalDateTime earliestShowtime;
    private LocalDateTime currentTime;
    private String orderStatus;
    private BigDecimal totalAmount;
    private long monthlyCancellationCount;
    private int monthlyCancellationLimit;
    private boolean admin;
    
    // Output
    @Builder.Default
    private boolean canCancel = false;
    
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;
    
    @Builder.Default
    private String errorMessage = null;
    
    @Builder.Default
    private String validationResult = null; // "VALID", "INVALID", "EXCEED_LIMIT", "SHOWTIME_STARTED", etc.
}

