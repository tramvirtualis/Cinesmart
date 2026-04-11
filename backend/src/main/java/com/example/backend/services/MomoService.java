package com.example.backend.services;

import com.example.backend.config.MomoProperties;
import com.example.backend.dtos.MomoCreatePaymentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MomoService {

    private final MomoProperties properties;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MomoCreatePaymentResponse createPayment(String orderId,
            String requestId,
            BigDecimal amount,
            String orderInfo,
            String extraData) {
        try {
            String amountStr = amount.setScale(0, RoundingMode.HALF_UP).toPlainString();

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("partnerCode", properties.getPartnerCode());
            payload.put("partnerName", properties.getPartnerName());
            payload.put("storeId", properties.getStoreId());
            payload.put("requestType", properties.getRequestType());
            payload.put("ipnUrl", properties.getIpnUrl());
            payload.put("redirectUrl", properties.getRedirectUrl());
            payload.put("orderId", orderId);
            payload.put("amount", amountStr);
            payload.put("lang", properties.getLang());
            payload.put("orderInfo", orderInfo);
            payload.put("requestId", requestId);
            payload.put("extraData", extraData != null ? extraData : "");
            if (properties.getPaymentCode() != null && !properties.getPaymentCode().isEmpty()) {
                payload.put("paymentCode", properties.getPaymentCode());
            }
            if (properties.getOrderGroupId() != null && !properties.getOrderGroupId().isEmpty()) {
                payload.put("orderGroupId", properties.getOrderGroupId());
            }
            payload.put("autoCapture", properties.isAutoCapture());

            String rawSignature = buildCreateSignature(orderId, requestId, amountStr, orderInfo,
                    extraData != null ? extraData : "");
            payload.put("signature", hmacSHA256(properties.getSecretKey(), rawSignature));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(payload), headers);
            ResponseEntity<MomoCreatePaymentResponse> response = restTemplate.postForEntity(
                    properties.getEndpoint(),
                    entity,
                    MomoCreatePaymentResponse.class);

            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to create MoMo payment", e);
            throw new IllegalStateException("Không thể tạo giao dịch MoMo", e);
        }
    }

    public Map<String, Object> queryTransaction(String orderId) {
        try {
            String requestId = UUID.randomUUID().toString();
            String rawSignature = "accessKey=" + properties.getAccessKey()
                    + "&orderId=" + orderId
                    + "&partnerCode=" + properties.getPartnerCode()
                    + "&requestId=" + requestId;
            
            String signature = hmacSHA256(properties.getSecretKey(), rawSignature);
            
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("partnerCode", properties.getPartnerCode());
            payload.put("requestId", requestId);
            payload.put("orderId", orderId);
            payload.put("signature", signature);
            payload.put("lang", properties.getLang());
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            
            // Derive query endpoint from create endpoint if possible, otherwise use default
            String queryEndpoint = "https://test-payment.momo.vn/v2/gateway/api/query";
            if (properties.getEndpoint() != null && properties.getEndpoint().contains("/create")) {
                queryEndpoint = properties.getEndpoint().replace("/create", "/query");
            }
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    queryEndpoint,
                    entity,
                    Map.class);
            
            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to query MoMo transaction", e);
            return null;
        }
    }

    public boolean validateIpnSignature(Map<String, String> params) {
        if (params == null || !params.containsKey("signature")) {
            return false;
        }
        String receivedSignature = params.get("signature");
        String rawSignature = buildIpnSignature(params);
        String calculated = hmacSHA256(properties.getSecretKey(), rawSignature);
        return calculated.equals(receivedSignature);
    }

    private String buildCreateSignature(String orderId,
            String requestId,
            String amount,
            String orderInfo,
            String extraData) {
        return "accessKey=" + properties.getAccessKey()
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&ipnUrl=" + properties.getIpnUrl()
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + properties.getPartnerCode()
                + "&redirectUrl=" + properties.getRedirectUrl()
                + "&requestId=" + requestId
                + "&requestType=" + properties.getRequestType();
    }

    private String buildIpnSignature(Map<String, String> fields) {
        String[] signatureFields = {
                "accessKey",
                "amount",
                "extraData",
                "message",
                "orderId",
                "orderInfo",
                "orderType",
                "partnerCode",
                "payType",
                "requestId",
                "responseTime",
                "resultCode",
                "transId"
        };
        StringBuilder builder = new StringBuilder();
        boolean first = true;
        for (String key : signatureFields) {
            if (!fields.containsKey(key)) {
                continue;
            }
            if (!first) {
                builder.append('&');
            } else {
                first = false;
            }
            builder.append(key).append('=').append(fields.get(key));
        }
        return builder.toString();
    }

    private String hmacSHA256(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            byte[] bytes = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash = new StringBuilder();
            for (byte b : bytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hash.append('0');
                }
                hash.append(hex);
            }
            return hash.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo chữ ký MoMo", e);
        }
    }
}
