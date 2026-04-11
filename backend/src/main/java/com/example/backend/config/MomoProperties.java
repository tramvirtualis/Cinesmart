package com.example.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "momo")
public class MomoProperties {
    private String partnerCode;
    private String accessKey;
    private String secretKey;
    private String endpoint;
    private String redirectUrl;
    private String ipnUrl;
    private String requestType = "captureWallet";
    private String partnerName = "Cinesmart";
    private String storeId = "CinesmartStore";
    private String lang = "vi";
    private String extraData = "";
    private String paymentCode = "";
    private String orderGroupId = "";
    private boolean autoCapture = true;
    private String returnPageUrl = "http://localhost:5173/payment/momo-return";
    
    // Explicit getter để đảm bảo IDE nhận diện
    public String getReturnPageUrl() {
        return returnPageUrl;
    }
}


