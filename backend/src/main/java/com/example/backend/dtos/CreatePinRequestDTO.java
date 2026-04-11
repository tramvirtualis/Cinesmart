package com.example.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO để tạo mã PIN mới
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePinRequestDTO {
    
    @NotBlank(message = "Mã PIN không được để trống")
    @Size(min = 6, max = 6, message = "Mã PIN phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Mã PIN chỉ được chứa 6 chữ số")
    private String pin;
    
    @NotBlank(message = "Xác nhận mã PIN không được để trống")
    @Size(min = 6, max = 6, message = "Xác nhận mã PIN phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Xác nhận mã PIN chỉ được chứa 6 chữ số")
    private String confirmPin;
}

