package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Fact class cho Drools validation
 * Chứa thông tin showtime cần validate và các showtime hiện có để so sánh
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShowtimeValidationFact {
    // Showtime mới cần validate
    private Long newShowtimeId; // null nếu là tạo mới
    private Long cinemaRoomId;
    private LocalDateTime newStartTime;
    private LocalDateTime newEndTime;
    private LocalDate newDate; // Ngày của showtime mới
    
    // Showtime hiện có để so sánh
    private Long existingShowtimeId;
    private LocalDateTime existingStartTime;
    private LocalDateTime existingEndTime;
    private LocalDate existingDate; // Ngày của showtime hiện có
    
    // Kết quả validation
    private boolean valid;
    private String errorMessage;
    
    // Getter/Setter cho isValid để tương thích
    public boolean isValid() {
        return valid;
    }
    
    public void setValid(boolean valid) {
        this.valid = valid;
    }
    
    /**
     * Kiểm tra xem có cùng ngày không
     */
    public boolean isSameDate() {
        if (newDate == null || existingDate == null) {
            return false;
        }
        return newDate.equals(existingDate);
    }
    
    /**
     * Kiểm tra xem có cùng phòng không
     */
    public boolean isSameRoom() {
        if (cinemaRoomId == null || existingShowtimeId == null) {
            return false;
        }
        // Note: existingShowtimeId được dùng để identify, 
        // cinemaRoomId sẽ được so sánh trong service
        return true;
    }
}

