package com.example.backend.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportReviewDTO {
    @NotNull(message = "Lý do báo cáo không được để trống")
    private String reason; // Optional reason for reporting
}


