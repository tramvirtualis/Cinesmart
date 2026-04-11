package com.example.backend.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class ZaloPayService {

    @Value("${zalopay.app.id}")
    private String appId;

    @Value("${zalopay.key1}")
    private String key1;

    @Value("${zalopay.key2}")
    private String key2;

    @Value("${zalopay.endpoint}")
    private String createOrderEndpoint;

    @Value("${zalopay.callback.url}")
    private String callbackUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Tạo đơn hàng thanh toán ZaloPay
     * 
     * @param amount      Số tiền (VND)
     * @param description Mô tả đơn hàng
     * @param orderId     ID đơn hàng trong hệ thống
     * @return URL thanh toán hoặc null nếu lỗi
     */
    /**
     * Tạo đơn hàng thanh toán ZaloPay
     * 
     * @param amount       Số tiền (VND)
     * @param description  Mô tả đơn hàng
     * @param orderId      ID đơn hàng trong hệ thống
     * @param embedDataStr JSON string chứa dữ liệu nhúng (optional)
     * @return URL thanh toán hoặc null nếu lỗi
     */
    public Map<String, Object> createPaymentOrder(Long amount, String description, String orderId,
            String embedDataStr) {
        try {
            System.out.println("=== ZaloPayService.createPaymentOrder ===");
            System.out.println("Amount: " + amount);
            System.out.println("Description: " + description);
            System.out.println("OrderId: " + orderId);
            System.out.println("AppId: " + appId);
            System.out.println("Key1: " + key1);

            // 1. Tạo app_trans_id theo format: yymmddOrder_identifier
            // Ví dụ: 250210_OrderID (phải có yymmdd ở đầu)
            SimpleDateFormat sdf = new SimpleDateFormat("yyMMdd");
            String dateStr = sdf.format(new Date());
            String appTransId = dateStr + "_" + orderId;

            System.out.println("AppTransId: " + appTransId);

            // 2. Tạo app_time (milliseconds)
            long appTime = System.currentTimeMillis();

            // 3. Tạo embed_data (JSON string) nếu chưa có
            if (embedDataStr == null || embedDataStr.isEmpty()) {
                Map<String, Object> embedData = new HashMap<>();
                embedData.put("redirecturl", "http://localhost:5173/payment/success");
                embedDataStr = objectMapper.writeValueAsString(embedData);
            }

            // 4. Tạo item (JSON array string)
            List<Map<String, Object>> items = new ArrayList<>();
            Map<String, Object> item = new HashMap<>();
            item.put("itemid", "ticket");
            item.put("itemname", description);
            item.put("itemprice", amount);
            item.put("itemquantity", 1);
            items.add(item);
            String itemStr = objectMapper.writeValueAsString(items);

            String appUser = "demo";
            String macData = appId + "|" + appTransId + "|" + appUser + "|" + amount + "|" +
                    appTime + "|" + embedDataStr + "|" + itemStr;

            System.out.println("=== MAC Calculation ===");
            System.out.println("MAC data: " + macData);

            String mac = HMacHexStringEncode(key1, macData);
            System.out.println("Generated MAC: " + mac);

            Map<String, String> formParams = new LinkedHashMap<>();
            formParams.put("app_id", appId);
            formParams.put("app_user", appUser);
            formParams.put("app_time", String.valueOf(appTime));
            formParams.put("amount", String.valueOf(amount));
            formParams.put("app_trans_id", appTransId);
            formParams.put("embed_data", embedDataStr);
            formParams.put("item", itemStr);
            formParams.put("description", description);
            formParams.put("bank_code", ""); // Để trống để hiển thị tất cả phương thức thanh toán
            formParams.put("mac", mac);

            System.out.println("=== Final Request Parameters ===");
            formParams.forEach((key, value) -> {
                if (!key.equals("mac")) {
                    System.out.println(key + ": " + value);
                }
            });
            System.out.println("mac: " + mac);

            System.out.println("=== Request to ZaloPay ===");
            System.out.println("Endpoint: " + createOrderEndpoint);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            org.springframework.util.MultiValueMap<String, String> formData = new org.springframework.util.LinkedMultiValueMap<>();
            formData.add("appid", appId);
            formData.add("appuser", appUser);
            formData.add("apptime", String.valueOf(appTime));
            formData.add("amount", String.valueOf(amount));
            formData.add("apptransid", appTransId);
            formData.add("embeddata", embedDataStr);
            formData.add("item", itemStr);
            formData.add("description", description);
            formData.add("bankcode", "");
            formData.add("mac", mac);

            System.out.println("=== Form Data ===");
            formData.forEach((key, value) -> System.out.println(key + ": " + value));

            HttpEntity<org.springframework.util.MultiValueMap<String, String>> request = new HttpEntity<>(formData,
                    headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    createOrderEndpoint,
                    HttpMethod.POST,
                    request,
                    Map.class);

            System.out.println("=== Response from ZaloPay ===");
            System.out.println("Status: " + response.getStatusCode());
            System.out.println("Body: " + response.getBody());

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                // CHÚ Ý: v001 dùng "returncode" KHÔNG có dấu gạch dưới
                Integer returnCode = (Integer) responseBody.get("returncode");

                System.out.println("Return code: " + returnCode);
                System.out.println("Return message: " + responseBody.get("returnmessage"));
                System.out.println("ZP Trans Token: " + responseBody.get("zptranstoken"));
                System.out.println("Order URL: " + responseBody.get("orderurl"));

                if (returnCode != null && returnCode == 1) {
                    // Thành công
                    Map<String, Object> result = new HashMap<>();
                    result.put("order_url", responseBody.get("orderurl"));
                    result.put("zp_trans_token", responseBody.get("zptranstoken"));
                    result.put("qr_code", responseBody.get("qrcode"));
                    result.put("app_trans_id", appTransId);
                    result.put("return_code", returnCode);
                    result.put("return_message", responseBody.get("returnmessage"));
                    return result;
                } else {
                    // Lỗi từ ZaloPay
                    Map<String, Object> result = new HashMap<>();
                    result.put("return_code", returnCode);
                    result.put("return_message", responseBody.get("returnmessage"));
                    System.err.println("ZaloPay Error: " + responseBody);
                    return result;
                }
            }

            System.err.println("ZaloPay returned non-OK status or null body");
            return null;

        } catch (Exception e) {
            System.err.println("Exception in createPaymentOrder: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Xác thực callback từ ZaloPay
     */
    public boolean verifyCallback(String data, String mac) {
        try {
            String calculatedMac = HMacHexStringEncode(key2, data);
            return calculatedMac.equals(mac);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Tính HMAC SHA256 và trả về hex string
     */
    private String HMacHexStringEncode(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            // Convert to hex string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error calculating HMAC", e);
        }
    }

    /**
     * Kiểm tra trạng thái đơn hàng
     */
    public Map<String, Object> getPaymentStatus(String appTransId) {
        try {
            String queryEndpoint = "https://sb-openapi.zalopay.vn/v2/query";

            long appTime = System.currentTimeMillis();
            String macData = appId + "|" + appTransId + "|" + key1;
            String mac = HMacHexStringEncode(key1, macData);

            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("app_id", appId);
            params.add("app_trans_id", appTransId);
            params.add("mac", mac);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    queryEndpoint,
                    request,
                    Map.class);

            return response.getBody();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
