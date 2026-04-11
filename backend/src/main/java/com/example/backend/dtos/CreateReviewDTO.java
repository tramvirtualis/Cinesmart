package com.example.backend.dtos;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReviewDTO {
    @NotNull(message = "Movie ID không được để trống")
    private Long movieId;
    
    @NotNull(message = "Đánh giá sao không được để trống")
    @Min(value = 1, message = "Đánh giá sao phải từ 1 đến 5")
    @Max(value = 5, message = "Đánh giá sao phải từ 1 đến 5")
    private Integer rating;
    
    @Size(max = 255, message = "Nội dung đánh giá không được vượt quá 255 ký tự")
    private String context;
}

