package com.example.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component("customGlobalCorsFilter")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CustomCorsFilter implements Filter {

    /**
     * Wildcard (*) is NOT valid for Allow-Headers when Allow-Credentials is true.
     * Browsers reject preflight with: "content-type is not allowed by Access-Control-Allow-Headers".
     */
    private static final String DEFAULT_ALLOWED_HEADERS =
            "Content-Type, Authorization, Accept, Origin, X-Requested-With, X-API-Key, Cache-Control";

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.extra-allowed-origins:}")
    private String extraAllowedOrigins;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse res = (HttpServletResponse) response;
        HttpServletRequest req = (HttpServletRequest) request;

        String origin = req.getHeader("Origin");
        
        List<String> allowedOrigins = new ArrayList<>();
        allowedOrigins.add(frontendUrl);
        if (extraAllowedOrigins != null && !extraAllowedOrigins.isBlank()) {
            for (String o : extraAllowedOrigins.split(",")) {
                String trimmed = o.trim();
                if (!trimmed.isEmpty()) allowedOrigins.add(trimmed);
            }
        }

        // Add typical origins for development and production safety
        if (!allowedOrigins.contains("http://localhost:3000")) {
            allowedOrigins.add("http://localhost:3000");
        }
        if (!allowedOrigins.contains("https://cinesmart-movie-ticket-booking.vercel.app")) {
            allowedOrigins.add("https://cinesmart-movie-ticket-booking.vercel.app");
        }

        if (origin != null) {
            boolean allowed = false;
            for (String allowedOrigin : allowedOrigins) {
                if (allowedOrigin.equals(origin) || 
                    (allowedOrigin.contains("*") && origin.matches(allowedOrigin.replace("*", ".*")))) {
                    res.setHeader("Access-Control-Allow-Origin", origin);
                    allowed = true;
                    break;
                }
            }
            if (!allowed) {
                res.setHeader("Access-Control-Allow-Origin", frontendUrl);
            }
        } else {
            res.setHeader("Access-Control-Allow-Origin", frontendUrl);
        }

        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
        res.setHeader("Access-Control-Max-Age", "3600");

        // Reflect requested headers on preflight, or use explicit list (never "*" with credentials)
        String requestedHeaders = req.getHeader("Access-Control-Request-Headers");
        if (requestedHeaders != null && !requestedHeaders.isBlank()) {
            res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
        } else {
            res.setHeader("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS);
        }

        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Expose-Headers", "Authorization");

        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            res.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        chain.doFilter(request, response);
    }
}
