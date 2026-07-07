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
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Expose-Headers", "Authorization");

        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            res.setStatus(HttpServletResponse.SC_OK);
        } else {
            chain.doFilter(request, response);
        }
    }
}
