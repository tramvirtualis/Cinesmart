package com.example.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "n8n")
public class N8nProperties {

    /**
     * API key dùng cho header X-API-Key khi n8n gọi vào backend.
     * Cấu hình qua N8N_API_KEY trong backend/.env
     */
    private String apiKey = "";

    /**
     * URL webhook của n8n (node Webhook) — cấu hình qua N8N_WEBHOOK_URL trong backend/.env
     * Ví dụ: http://localhost:5678/webhook/popcorn
     */
    private String webhookUrl = "";

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }
}
