package com.example.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO để xác thực mã PIN (dùng cho các giao dịch quan trọng)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyPinRequestDTO {
    
    @NotBlank(message = "Mã PIN không được để trống")
    @Size(min = 6, max = 6, message = "Mã PIN phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Mã PIN chỉ được chứa 6 chữ số")
    private String pin;
}

