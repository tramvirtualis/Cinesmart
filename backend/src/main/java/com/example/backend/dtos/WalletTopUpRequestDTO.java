package com.example.backend.dtos;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class WalletTopUpRequestDTO {
    private BigDecimal amount;
    private String note;
}

