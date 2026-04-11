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
public class ReviewReportResponseDTO {
    private Long reportId;
    private Long userId;
    private String username;
    private String reason;
    private LocalDateTime reportedAt;
}

