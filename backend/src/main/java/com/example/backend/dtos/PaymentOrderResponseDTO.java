package com.example.backend.dtos;

import com.example.backend.entities.enums.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderResponseDTO {
    private Long orderId;
    private String txnRef;
    private BigDecimal totalAmount;
    private PaymentMethod paymentMethod;
    private String responseCode;
    private String transactionNo;
    private String bankCode;
    private LocalDateTime orderDate;
    private LocalDateTime payDate;
    private Boolean isTopUp;
}


