package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaComplexResponseDTO {
    private Long complexId;
    private String name;
    private String addressDescription;
    private String addressProvince;
    private String fullAddress; // Combined address for display
}

