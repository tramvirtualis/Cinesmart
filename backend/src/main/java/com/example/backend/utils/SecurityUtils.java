package com.example.backend.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Slf4j
public class SecurityUtils {
    
    /**
     * Lấy username từ SecurityContext (JWT authentication)
     * @return Username của user hiện tại hoặc null nếu không có authentication
     */
    public static String getCurrentUsername() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                Object principal = authentication.getPrincipal();
                if (principal instanceof String) {
                    String username = (String) principal;
                    log.debug("Current username from SecurityContext: {}", username);
                    return username;
                } else {
                    log.warn("Authentication principal is not a String: {}", principal != null ? principal.getClass().getName() : "null");
                }
            } else {
                log.warn("No authentication found in SecurityContext");
            }
        } catch (Exception e) {
            log.error("Error getting current username: {}", e.getMessage(), e);
        }
        return null;
    }
}

