package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDTO {
    private Long notificationId; // ID từ database
    private String type; // REVIEW_SUCCESS, VOUCHER_ADDED, VOUCHER_SAVED, BOOKING_SUCCESS
    private String title;
    private String message;
    private String timestamp; // Changed to String to ensure correct serialization
    private Object data; // Optional additional data
    private Boolean isRead; // Trạng thái đã đọc
}



