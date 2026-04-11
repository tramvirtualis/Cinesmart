package com.example.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO để cập nhật mã PIN
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePinRequestDTO {
    
    @NotBlank(message = "Mã PIN hiện tại không được để trống")
    @Size(min = 6, max = 6, message = "Mã PIN hiện tại phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Mã PIN hiện tại chỉ được chứa 6 chữ số")
    private String currentPin;
    
    @NotBlank(message = "Mã PIN mới không được để trống")
    @Size(min = 6, max = 6, message = "Mã PIN mới phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Mã PIN mới chỉ được chứa 6 chữ số")
    private String newPin;
    
    @NotBlank(message = "Xác nhận mã PIN mới không được để trống")
    @Size(min = 6, max = 6, message = "Xác nhận mã PIN mới phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Xác nhận mã PIN mới chỉ được chứa 6 chữ số")
    private String confirmPin;
}

