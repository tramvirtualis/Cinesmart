package com.example.backend.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO để đặt lại mã PIN sau khi xác thực OTP
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResetPinRequestDTO {
    
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;
    
    @NotBlank(message = "Mã OTP không được để trống")
    @Size(min = 6, max = 6, message = "Mã OTP phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Mã OTP chỉ được chứa 6 chữ số")
    private String otp;
    
    @NotBlank(message = "Mã PIN mới không được để trống")
    @Size(min = 6, max = 6, message = "Mã PIN phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Mã PIN chỉ được chứa 6 chữ số")
    private String newPin;
    
    @NotBlank(message = "Xác nhận mã PIN không được để trống")
    @Size(min = 6, max = 6, message = "Xác nhận mã PIN phải có đúng 6 chữ số")
    @Pattern(regexp = "^\\d{6}$", message = "Xác nhận mã PIN chỉ được chứa 6 chữ số")
    private String confirmPin;
}

