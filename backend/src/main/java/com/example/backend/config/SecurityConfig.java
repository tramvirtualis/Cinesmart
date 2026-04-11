package com.example.backend.config;

import com.example.backend.utils.JwtUtils;
import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public JwtUtils jwtUtils() {
        return new JwtUtils();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        configuration.setExposedHeaders(Arrays.asList("Authorization")); // Thêm dòng này

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtUtils jwtUtils) throws Exception {
        // Instantiate filter manually to avoid double registration by Spring Boot
        JwtAuthenticationFilter jwtAuthenticationFilter = new JwtAuthenticationFilter(jwtUtils);

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints - không cần authentication
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/payment/wallet/**").permitAll() // Wallet - xử lý auth trong controller
                        .requestMatchers("/api/reviews/movie/**").permitAll() // Public access to movie reviews
                        .requestMatchers("/api/enums/**").permitAll() // Public access to enum values
                        .requestMatchers("/api/public/showtimes/**").permitAll() // Public access to showtimes
                        // Payment callbacks - không cần auth
                        .requestMatchers("/api/payment/zalopay/callback").permitAll() // ZaloPay callback không cần auth
                        .requestMatchers("/api/payment/momo/ipn").permitAll() // MoMo IPN không cần auth
                        // Forgot PIN endpoints - không cần authentication
                        .requestMatchers("/api/wallet/pin/forgot/**").permitAll() // Forgot PIN endpoints

                        // WebSocket endpoints - không cần authentication
                        .requestMatchers("/ws/**").permitAll()

                        // Customer endpoints - cần authentication, controller sẽ kiểm tra role
                        // Phone update endpoints cũng cần authenticated để JWT filter chạy
                        .requestMatchers("/api/customer/**").authenticated()

                        // Payment endpoints - cần authentication, @PreAuthorize sẽ kiểm tra role
                        .requestMatchers("/api/payment/**").authenticated()

                        // Admin endpoints - cần role ADMIN
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Manager endpoints - cần authenticated
                        .requestMatchers("/api/manager/**").authenticated()

                        // Wallet endpoints - cần authentication, @PreAuthorize sẽ kiểm tra role
                        .requestMatchers("/api/wallet/**").authenticated()

                        // Tất cả request khác cần authentication
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // Đảm bảo JWT filter luôn chạy trước tất cả các filter khác
                .exceptionHandling(exceptions -> exceptions
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            System.out.println("SecurityConfig: AccessDeniedException for " + request.getRequestURI());
                            accessDeniedException.printStackTrace();
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setCharacterEncoding("UTF-8");
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write(
                                    "{\"success\":false,\"message\":\"Bạn không có quyền truy cập. Vui lòng đăng nhập lại.\",\"error\":\"Access denied\"}");
                        })
                        .authenticationEntryPoint((request, response, authException) -> {
                            System.out
                                    .println("SecurityConfig: AuthenticationEntryPoint for " + request.getRequestURI());
                            authException.printStackTrace();

                            String authError = (String) request.getAttribute("AuthError");
                            String errorMessage = "Vui lòng đăng nhập để truy cập.";
                            String errorDetail = "Authentication required";

                            if (authError != null) {
                                errorMessage = "Lỗi xác thực: " + authError;
                                errorDetail = authError;
                            }

                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setCharacterEncoding("UTF-8");
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write(
                                    "{\"success\":false,\"message\":\"" + errorMessage + "\",\"error\":\"" + errorDetail
                                            + "\"}");
                        }));

        return http.build();
    }
}
