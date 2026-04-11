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
public class WalletTransactionDTO {
    private Long transactionId;
    private BigDecimal amount;
    private String type;
    private String description;
    private BigDecimal balanceAfter;
    private LocalDateTime createdAt;
    private String referenceCode;
}

