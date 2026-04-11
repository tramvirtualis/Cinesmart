package com.example.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCinemaComplexDTO {
    @NotBlank(message = "Tên cụm rạp không được để trống")
    private String name;
    
    @NotBlank(message = "Mô tả địa chỉ không được để trống")
    private String addressDescription;
    
    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String addressProvince;
}

