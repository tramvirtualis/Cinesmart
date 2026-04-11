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
public class CancelOrderResponseDTO {
    private Long orderId;
    private String status;
    private BigDecimal refundAmount;
    private LocalDateTime cancelledAt;
    private BigDecimal walletBalance;
    private int monthlyCancellationLimit;
    private int monthlyCancellationUsed;
}

