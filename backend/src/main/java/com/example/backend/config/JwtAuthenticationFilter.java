package com.example.backend.config;

import com.example.backend.utils.JwtUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    public JwtAuthenticationFilter(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        String requestPath = request.getRequestURI();
        
        // Skip JWT processing for public endpoints (but not wallet/create - we still need to set auth)
        if (requestPath.startsWith("/api/public/") || 
            requestPath.startsWith("/api/auth/") ||
            requestPath.startsWith("/api/enums/") ||
            requestPath.startsWith("/api/reviews/movie/") ||
            requestPath.startsWith("/ws/")) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Skip OPTIONS requests (CORS preflight)
        if ("OPTIONS".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Process JWT for all API endpoints that require authentication
        if (requestPath.startsWith("/api/")) {
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    String token = authHeader.substring(7);
                    
                    if (jwtUtils.validateJwtToken(token)) {
                        String username = jwtUtils.getUsernameFromJwtToken(token);
                        String role = jwtUtils.getRoleFromJwtToken(token);
                        
                        if (role != null && !role.isEmpty()) {
                            // Chuyển đổi role thành uppercase để đảm bảo consistency
                            String normalizedRole = role.toUpperCase();
                            String authority = "ROLE_" + normalizedRole;
                            
                            UsernamePasswordAuthenticationToken authentication = 
                                new UsernamePasswordAuthenticationToken(
                                    username,
                                    null,
                                    Collections.singletonList(new SimpleGrantedAuthority(authority))
                                );
                            
                            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        }
                    }
                } catch (Exception e) {
                    // Token không hợp lệ, tiếp tục filter chain mà không set authentication
                }
            }
        }
        
        filterChain.doFilter(request, response);
    }
}

