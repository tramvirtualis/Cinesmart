package com.example.backend.dtos.n8n;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class N8nFoodComboSummaryDTO {
    @JsonIgnore
    private Long foodComboId;

    private String name;
    private BigDecimal price;
    private String description;
}
