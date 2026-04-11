package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtpSessionDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String email;
    private String otpCode;
    private long createdAtMillis;  // Timestamp in milliseconds
    private long expiresAtMillis;  // Timestamp in milliseconds
    private long lastSentAtMillis; // Timestamp in milliseconds
}