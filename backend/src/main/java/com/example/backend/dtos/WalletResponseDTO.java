package com.example.backend.dtos;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletResponseDTO {
    private Long walletId;
    private BigDecimal balance;
    private LocalDateTime updatedAt;
    private boolean locked;
    private int monthlyCancellationLimit;
    private int monthlyCancellationUsed;
    private List<WalletTransactionDTO> recentTransactions;
}

