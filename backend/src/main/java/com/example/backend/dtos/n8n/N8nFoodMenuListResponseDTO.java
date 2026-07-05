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
public class N8nFoodMenuListResponseDTO {
    private String description;
    private String url;
    private List<N8nFoodMenuDTO> menus;
}
