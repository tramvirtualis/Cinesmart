package com.example.backend.dtos;

import lombok.Data;

@Data
public class MomoCreatePaymentResponse {
    private String partnerCode;
    private String orderId;
    private String requestId;
    private String responseTime;
    private String message;
    private int resultCode;
    private String payUrl;
    private String deeplink;
    private String qrCodeUrl;
    
    // Explicit getter để đảm bảo IDE nhận diện
    public String getPayUrl() {
        return payUrl;
    }
}


