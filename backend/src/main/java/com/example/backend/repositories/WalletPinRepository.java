package com.example.backend.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.backend.entities.WalletPin;

@Repository
public interface WalletPinRepository extends JpaRepository<WalletPin, Long> {
    /**
     * Tìm PIN theo customer ID
     */
    Optional<WalletPin> findByCustomerUserId(Long userId);
    
    /**
     * Kiểm tra xem customer đã có PIN chưa
     */
    boolean existsByCustomerUserId(Long userId);
}

