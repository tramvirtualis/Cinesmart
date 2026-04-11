package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    private String username;
    private String password;

    @OneToOne
    @JoinColumn(name = "address_id", referencedColumnName = "addressId")
    private Address address;

    private String email;
    private String phone;
    private Boolean status;
    private String avatar; // URL của avatar từ Cloudinary
}
