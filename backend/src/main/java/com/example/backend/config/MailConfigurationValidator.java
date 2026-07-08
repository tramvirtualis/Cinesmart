package com.example.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Cảnh báo sớm khi thiếu cấu hình mail trên production (Render không có file .env local).
 */
@Component
@Profile("prod")
@Slf4j
public class MailConfigurationValidator {

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @EventListener(ApplicationReadyEvent.class)
    public void validateMailConfiguration() {
        if (mailUsername == null || mailUsername.isBlank()) {
            log.error("MAIL_USERNAME chưa được cấu hình — OTP / email xác nhận vé sẽ KHÔNG hoạt động");
        }
        if (mailPassword == null || mailPassword.isBlank()) {
            log.error("MAIL_PASSWORD chưa được cấu hình — OTP / email xác nhận vé sẽ KHÔNG hoạt động");
        }
        if (mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank()) {
            log.info("Mail SMTP đã cấu hình cho: {}", mailUsername);
        }
    }
}
