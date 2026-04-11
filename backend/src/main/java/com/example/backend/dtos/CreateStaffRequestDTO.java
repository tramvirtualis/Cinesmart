package com.example.backend.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStaffRequestDTO {
    
    @NotBlank(message = "Username không được để trống")
    private String username;
    
    @NotBlank(message = "Password không được để trống")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,32}$", 
            message = "Password phải có 8-32 ký tự, bao gồm chữ hoa, chữ thường và số")
    private String password;
    
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;
    
    @NotBlank(message = "Phone không được để trống")
    @Pattern(regexp = "^[0-9]{10,11}$", message = "Phone phải có 10-11 chữ số")
    private String phone;
    
    @NotBlank(message = "Địa chỉ mô tả không được để trống")
    private String addressDescription;
    
    @NotBlank(message = "Tỉnh/Thành phố không được để trống")
    private String addressProvince;
    
    @NotNull(message = "Status không được để trống")
    private Boolean status;
    
    @NotBlank(message = "Role không được để trống")
    @Pattern(regexp = "^(ADMIN|MANAGER)$", message = "Role phải là ADMIN hoặc MANAGER")
    private String role;
    
    // Chỉ bắt buộc khi role là MANAGER
    private Long cinemaComplexId;
}

