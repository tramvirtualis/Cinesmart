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
public class N8nWebhookRequestDTO {
    /**
     * Hành động n8n muốn thực hiện: send_notification, push_event
     */
    private String action;
    private Map<String, Object> payload;
}
