package com.example.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class PaymentUrlResolver {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String defaultFrontendUrl;

    @Value("${app.extra-allowed-origins:http://localhost:3000,https://cinesmart-movie-ticket-booking.vercel.app}")
    private String extraAllowedOrigins;

    public String resolveFrontendUrl(String requestedUrl, HttpServletRequest request) {
        List<String> candidates = new ArrayList<>();
        if (requestedUrl != null && !requestedUrl.isBlank()) {
            candidates.add(normalizeOrigin(requestedUrl));
        }
        if (request != null) {
            if (request.getHeader("Origin") != null) {
                candidates.add(normalizeOrigin(request.getHeader("Origin")));
            }
            if (request.getHeader("Referer") != null) {
                candidates.add(extractOrigin(request.getHeader("Referer")));
            }
        }
        candidates.add(normalizeOrigin(defaultFrontendUrl));

        for (String candidate : candidates) {
            if (isAllowedFrontendOrigin(candidate)) {
                return candidate;
            }
        }
        return normalizeOrigin(defaultFrontendUrl);
    }

    public String resolveBackendBaseUrl(HttpServletRequest request) {
        if (request == null) {
            return normalizeOrigin(defaultFrontendUrl).replace(":5173", ":8080");
        }
        String base = ServletUriComponentsBuilder.fromRequest(request)
                .replacePath(null)
                .build()
                .toUriString();
        return normalizeOrigin(base);
    }

    public String buildFrontendReturnUrl(String frontendBase, String path) {
        String base = normalizeOrigin(frontendBase);
        String suffix = path.startsWith("/") ? path : "/" + path;
        return base + suffix;
    }

    public String buildBackendCallbackUrl(HttpServletRequest request, String path) {
        String base = resolveBackendBaseUrl(request);
        String suffix = path.startsWith("/") ? path : "/" + path;
        return base + suffix;
    }

    private boolean isAllowedFrontendOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return false;
        }
        try {
            URI uri = URI.create(origin);
            String host = uri.getHost();
            if (host == null) {
                return false;
            }
            if ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)) {
                return "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
            }
            Set<String> allowed = new LinkedHashSet<>();
            allowed.add(normalizeOrigin(defaultFrontendUrl));
            if (extraAllowedOrigins != null && !extraAllowedOrigins.isBlank()) {
                for (String part : extraAllowedOrigins.split(",")) {
                    if (!part.isBlank()) {
                        allowed.add(normalizeOrigin(part.trim()));
                    }
                }
            }
            String normalized = normalizeOrigin(origin);
            return allowed.contains(normalized);
        } catch (Exception e) {
            return false;
        }
    }

    private String extractOrigin(String referer) {
        try {
            URI uri = URI.create(referer.trim());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            int port = uri.getPort();
            if (port > 0 && port != 80 && port != 443) {
                return uri.getScheme() + "://" + uri.getHost() + ":" + port;
            }
            return uri.getScheme() + "://" + uri.getHost();
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizeOrigin(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String trimmed = url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
