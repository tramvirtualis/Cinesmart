package com.example.backend.dtos.n8n;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class N8nFoodMenuDTO {
    private Long cinemaId;
    private String cinemaName;
    private String province;
    private String address;
    private List<N8nFoodComboSummaryDTO> items;
}
