package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO để trả về trạng thái PIN của user
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PinStatusResponseDTO {
    /**
     * true nếu user đã có PIN, false nếu chưa có
     */
    private boolean hasPin;
    
    /**
     * true nếu PIN đang bị lock, false nếu không
     */
    private boolean locked;
    
    /**
     * Số lần nhập sai liên tiếp
     */
    private Integer failedAttempts;
}

