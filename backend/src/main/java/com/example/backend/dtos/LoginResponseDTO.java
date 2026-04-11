package com.example.backend.dtos;

import com.example.backend.entities.Address;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDTO {
    private Long userId;
    private String username;
    private String name;
    private LocalDate dob;
    private String email;
    private String phone;
    private Boolean status;
    private Address address;
    private String role;
    private String token;
    private Long cinemaComplexId;
    private String avatar; // URL của avatar từ Cloudinary
}
