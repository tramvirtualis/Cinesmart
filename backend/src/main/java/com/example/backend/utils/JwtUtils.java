package com.example.backend.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

public class JwtUtils {

    // Fixed secret key - phải đủ 64 bytes (512 bits) cho HS512
    private static final String SECRET_KEY_STRING = "CinesmartMovieTicketBookingSecretKey2024VeryLongAndSecureKeyForHS512Algorithm!@#$%";
    private final SecretKey jwtSecret = Keys.hmacShaKeyFor(SECRET_KEY_STRING.getBytes(StandardCharsets.UTF_8));
    private final long jwtExpirationMs = 86400000; // 1 ngày

    public String generateJwtToken(String username, String role) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(jwtSecret, SignatureAlgorithm.HS512)
                .compact();
    }

    public String getUsernameFromJwtToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(jwtSecret)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public String getRoleFromJwtToken(String token) {
        return (String) Jwts.parserBuilder()
                .setSigningKey(jwtSecret)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get("role");
    }

    public boolean validateJwtToken(String authToken) {
        System.out.println(">>> JwtUtils.validateJwtToken() - START");
        System.out.println(">>> Token to validate (first 50 chars): "
                + (authToken.length() > 50 ? authToken.substring(0, 50) + "..." : authToken));
        System.out.println(">>> Token length: " + authToken.length());

        try {
            System.out.println(">>> Attempting to parse token...");
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(jwtSecret)
                    .build()
                    .parseClaimsJws(authToken)
                    .getBody();

            System.out.println(">>> Token parsed successfully!");
            System.out.println(">>> Subject (username): " + claims.getSubject());
            System.out.println(">>> Role: " + claims.get("role"));
            System.out.println(">>> Issued At: " + claims.getIssuedAt());
            System.out.println(">>> Expiration: " + claims.getExpiration());

            // Kiểm tra token có hết hạn không
            Date expiration = claims.getExpiration();
            Date now = new Date();
            System.out.println(">>> Current time: " + now);
            System.out.println(
                    ">>> Time until expiration: " + (expiration.getTime() - now.getTime()) / 1000 + " seconds");

            if (expiration.before(now)) {
                System.out.println(">>> ✗✗✗ JWT token has expired!");
                System.out.println(">>> Expiration: " + expiration);
                System.out.println(">>> Current time: " + now);
                return false;
            }

            System.out.println(">>> ✓✓✓ Token is VALID!");
            return true;
        } catch (ExpiredJwtException e) {
            System.out.println(">>> ✗✗✗ JWT token expired (caught ExpiredJwtException)");
            System.out.println(">>> Exception message: " + e.getMessage());
            System.out.println(">>> Expiration from exception: " + e.getClaims().getExpiration());
            return false;
        } catch (JwtException e) {
            System.out.println(">>> ✗✗✗ Invalid JWT (caught JwtException)");
            System.out.println(">>> Exception type: " + e.getClass().getName());
            System.out.println(">>> Exception message: " + e.getMessage());
            e.printStackTrace();
            return false;
        } catch (Exception e) {
            System.out.println(">>> ✗✗✗ Error validating JWT (caught general Exception)");
            System.out.println(">>> Exception type: " + e.getClass().getName());
            System.out.println(">>> Exception message: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
}
