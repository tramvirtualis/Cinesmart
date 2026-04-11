package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderComboDTO {
    private Long comboId;
    private String comboName;
    private String comboImage;
    private Integer quantity;
    private BigDecimal price;
}

