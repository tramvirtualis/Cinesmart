package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatbotMessageRequestDTO {
    private String message;
    private String chatMessage;
    private String sessionId;
    private Long userId;
}
