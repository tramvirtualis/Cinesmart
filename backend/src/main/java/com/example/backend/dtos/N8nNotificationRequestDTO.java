package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class N8nNotificationRequestDTO {
    private Long userId;
    private String type;
    private String title;
    private String message;
    private Map<String, Object> data;
}
