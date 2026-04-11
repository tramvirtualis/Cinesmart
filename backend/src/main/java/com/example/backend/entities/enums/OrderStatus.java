package com.example.backend.entities.enums;

public enum OrderStatus {
    PENDING,       // Order has been created but payment not confirmed
    PAID,          // Payment succeeded
    CANCELLED      // User cancelled and refund issued
}

