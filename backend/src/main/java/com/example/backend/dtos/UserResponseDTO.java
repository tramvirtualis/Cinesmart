package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDTO {
    private Long userId;
    private String username;
    private String email;
    private String phone;
    private String address; // Format: "description, province"
    private Boolean status;
    private String role; // ADMIN, MANAGER, USER
    private Long cinemaComplexId; // Chỉ có khi role là MANAGER
    private String avatar; // URL của avatar từ Cloudinary
}

