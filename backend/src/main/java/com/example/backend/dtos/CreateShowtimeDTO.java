package com.example.backend.dtos;

import com.example.backend.entities.enums.Language;
import com.example.backend.entities.enums.RoomType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateShowtimeDTO {
    // cinemaRoomId chỉ bắt buộc khi tạo mới, không bắt buộc khi update
    private Long cinemaRoomId;
    
    @NotNull(message = "Movie ID không được để trống")
    private Long movieId;
    
    @NotNull(message = "Ngôn ngữ không được để trống")
    private Language language;
    
    @NotNull(message = "Loại phòng không được để trống")
    private RoomType roomType;
    
    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalDateTime startTime;
    
    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalDateTime endTime;
}

