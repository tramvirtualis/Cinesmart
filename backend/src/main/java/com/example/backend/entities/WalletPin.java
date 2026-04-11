package com.example.backend.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity để lưu trữ mã PIN của ví Cinesmart
 * PIN được hash bằng BCrypt để đảm bảo bảo mật tuyệt đối
 */
@Entity
@Table(name = "wallet_pins")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WalletPin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long pinId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false, unique = true)
    private Customer customer;

    /**
     * PIN đã được hash bằng BCrypt
     * Không bao giờ lưu PIN dạng plain text
     */
    @Column(nullable = false, length = 255)
    private String hashedPin;

    /**
     * Số lần nhập sai liên tiếp
     * Reset về 0 khi nhập đúng
     */
    @Builder.Default
    @Column(nullable = false)
    private Integer failedAttempts = 0;

    /**
     * Thời điểm bị lock (nếu có)
     * Null nếu không bị lock
     */
    private LocalDateTime lockedUntil;

    /**
     * Thời điểm tạo PIN
     */
    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * Thời điểm cập nhật PIN lần cuối
     */
    private LocalDateTime updatedAt;
}

