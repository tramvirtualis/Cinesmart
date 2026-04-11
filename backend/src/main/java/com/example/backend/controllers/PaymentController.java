package com.example.backend.controllers;

import com.example.backend.config.MomoProperties;
import com.example.backend.dtos.CreatePaymentRequest;
import com.example.backend.dtos.PaymentOrderResponseDTO;
import com.example.backend.dtos.MomoCreatePaymentResponse;
import com.example.backend.entities.Order;
import com.example.backend.entities.User;
import com.example.backend.entities.Voucher;
import com.example.backend.entities.Customer;
import com.example.backend.entities.WalletTransaction;
import com.example.backend.entities.enums.OrderStatus;
import com.example.backend.entities.enums.PaymentMethod;
import com.example.backend.repositories.OrderRepository;
import com.example.backend.repositories.UserRepository;
import com.example.backend.repositories.VoucherRepository;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.WalletTransactionRepository;
import com.example.backend.services.OrderCreationService;
import com.example.backend.services.OrderService;
import com.example.backend.services.MomoService;
import com.example.backend.services.ZaloPayService;
import com.example.backend.services.NotificationService;
import com.example.backend.services.EmailService;
import com.example.backend.services.WalletService;
import com.example.backend.services.WalletPinService;
import com.example.backend.dtos.VerifyPinRequestDTO;
import com.example.backend.utils.JwtUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
        allowedHeaders = "*",
        allowCredentials = "true")
public class PaymentController {

    // ZaloPay dependencies
    private final ZaloPayService zaloPayService;
    private final OrderCreationService orderCreationService;
    private final OrderService orderService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // MoMo dependencies
    private final UserRepository userRepository;
    private final VoucherRepository voucherRepository;
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final MomoService momoService;
    private final MomoProperties momoProperties;
    
    // Wallet dependencies
    private final WalletService walletService;
    private final WalletPinService walletPinService;
    private final JwtUtils jwtUtils;
    private final WalletTransactionRepository walletTransactionRepository;

    // ==================== ZaloPay Endpoints ====================

    /**
     * Tạo payment URL cho ZaloPay và tạo Order trực tiếp (giống MoMo)
     */
    @PostMapping("/zalopay/create")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createZaloPayOrder(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("=== ZaloPay Create Order Request ===");
            System.out.println("Request body: " + request);
            
            // Lấy user hiện tại
            User user = getCurrentUser().orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
            
            // Kiểm tra user có bị chặn không
            if (Boolean.FALSE.equals(user.getStatus())) {
                return ResponseEntity.badRequest().body(createErrorResponse("Tài khoản của bạn đã bị chặn. Vui lòng liên hệ quản trị viên để được hỗ trợ.", null));
            }
            
            // Xử lý amount - có thể là Integer, Long, Double, hoặc String
            Object amountObj = request.get("amount");
            BigDecimal totalAmount;
            if (amountObj instanceof Number) {
                totalAmount = BigDecimal.valueOf(((Number) amountObj).doubleValue());
            } else if (amountObj instanceof String) {
                totalAmount = new BigDecimal((String) amountObj);
            } else {
                throw new IllegalArgumentException("Amount phải là số");
            }
            
            System.out.println("Parsed amount: " + totalAmount);
            
            String description = request.get("description") != null ? 
                request.get("description").toString() : "Thanh toán vé xem phim";
            
            // Lấy booking info từ request
            Map<String, Object> bookingInfo = (Map<String, Object>) request.get("bookingInfo");
            
            System.out.println("=== Parsing Booking Info ===");
            System.out.println("bookingInfo: " + bookingInfo);
            if (bookingInfo != null) {
                System.out.println("bookingInfo.containsKey('showtimeId'): " + bookingInfo.containsKey("showtimeId"));
                System.out.println("bookingInfo.containsKey('seatIds'): " + bookingInfo.containsKey("seatIds"));
                if (bookingInfo.containsKey("showtimeId")) {
                    System.out.println("showtimeId value: " + bookingInfo.get("showtimeId") + " (type: " + (bookingInfo.get("showtimeId") != null ? bookingInfo.get("showtimeId").getClass().getName() : "null") + ")");
                }
                if (bookingInfo.containsKey("seatIds")) {
                    System.out.println("seatIds value: " + bookingInfo.get("seatIds"));
                }
            }
            
            // Parse booking info
            Long showtimeId = null;
            List<String> seatIds = List.of();
            List<Map<String, Object>> foodComboMaps = List.of();
            String voucherCode = null;
            Voucher voucher = null;
            Long cinemaComplexId = null; // Declare outside if block to use later
            
            if (bookingInfo != null) {
                // Parse seatIds trước để kiểm tra xem có đặt vé phim không
                seatIds = bookingInfo.get("seatIds") != null ?
                    (List<String>) bookingInfo.get("seatIds") : List.of();
                
                System.out.println("Parsed seatIds: " + seatIds + " (size: " + (seatIds != null ? seatIds.size() : 0) + ")");
                
                // CHỈ parse showtimeId nếu:
                // 1. bookingInfo có key "showtimeId" VÀ
                // 2. Có seats (tức là có đặt vé phim)
                boolean hasSeats = seatIds != null && !seatIds.isEmpty();
                boolean hasShowtimeIdKey = bookingInfo.containsKey("showtimeId");
                
                System.out.println("hasSeats: " + hasSeats + ", hasShowtimeIdKey: " + hasShowtimeIdKey);
                
                if (hasSeats && hasShowtimeIdKey) {
                    // Có seats VÀ có showtimeId key -> cần parse showtimeId
                    Object showtimeIdObj = bookingInfo.get("showtimeId");
                    if (showtimeIdObj != null) {
                        String showtimeIdStr = showtimeIdObj.toString().trim();
                        if (!showtimeIdStr.isEmpty() && !showtimeIdStr.equalsIgnoreCase("null")) {
                            try {
                                showtimeId = Long.parseLong(showtimeIdStr);
                                System.out.println("Parsed showtimeId: " + showtimeId);
                            } catch (NumberFormatException e) {
                                System.err.println("Invalid showtimeId format: " + showtimeIdStr + ", treating as null");
                                showtimeId = null;
                            }
                        } else {
                            showtimeId = null;
                            System.out.println("showtimeId is empty or 'null' string, setting to null");
                        }
                    } else {
                        showtimeId = null;
                        System.out.println("showtimeIdObj is null, setting showtimeId to null");
                    }
                } else {
                    // Không có seats HOẶC không có showtimeId key -> không cần showtimeId (chỉ đặt đồ ăn)
                    showtimeId = null;
                    System.out.println("Food-only order: hasSeats=" + hasSeats + ", hasShowtimeIdKey=" + hasShowtimeIdKey + " -> showtimeId = null");
                }
                
                foodComboMaps = bookingInfo.get("foodCombos") != null ?
                    (List<Map<String, Object>>) bookingInfo.get("foodCombos") : List.of();
                voucherCode = bookingInfo.get("voucherCode") != null ?
                    bookingInfo.get("voucherCode").toString() : null;
                
                // Parse cinemaComplexId cho đơn hàng chỉ có đồ ăn
                if (bookingInfo.get("cinemaComplexId") != null) {
                    try {
                        Object cinemaComplexIdObj = bookingInfo.get("cinemaComplexId");
                        if (cinemaComplexIdObj instanceof Number) {
                            cinemaComplexId = ((Number) cinemaComplexIdObj).longValue();
                        } else {
                            cinemaComplexId = Long.parseLong(cinemaComplexIdObj.toString());
                        }
                        System.out.println("Parsed cinemaComplexId: " + cinemaComplexId);
                    } catch (Exception e) {
                        System.err.println("Invalid cinemaComplexId format: " + bookingInfo.get("cinemaComplexId") + ", treating as null");
                        cinemaComplexId = null;
                    }
                }
                
                System.out.println("Final parsed values - showtimeId: " + showtimeId + ", seatIds size: " + (seatIds != null ? seatIds.size() : 0) + ", foodCombos size: " + (foodComboMaps != null ? foodComboMaps.size() : 0) + ", cinemaComplexId: " + cinemaComplexId);
                
                // Lấy voucher nếu có
                if (voucherCode != null && !voucherCode.isEmpty()) {
                    voucher = voucherRepository.findByCode(voucherCode).orElse(null);
                }
            } else {
                System.out.println("bookingInfo is null - food-only order");
            }
            
            // Check for duplicate order trong vòng 10 giây gần đây (tránh double-click và race condition)
            // Tạo final copies để sử dụng trong lambda
            final Long finalShowtimeId = showtimeId;
            final List<String> finalSeatIds = new ArrayList<>(seatIds);
            final List<Map<String, Object>> finalFoodComboMaps = new ArrayList<>(foodComboMaps);
            
            LocalDateTime tenSecondsAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusSeconds(10);
            List<Order> recentOrders = orderRepository.findByUserUserIdOrderByOrderDateDesc(user.getUserId());
            Optional<Order> duplicateOrder = recentOrders.stream()
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(tenSecondsAgo))
                .filter(o -> {
                    // Check cùng showtime và seats (nếu có vé)
                    if (finalShowtimeId != null && !finalSeatIds.isEmpty()) {
                        if (o.getTickets() != null && !o.getTickets().isEmpty()) {
                            Long orderShowtimeId = o.getTickets().get(0).getShowtime().getShowtimeId();
                            if (orderShowtimeId.equals(finalShowtimeId)) {
                                List<String> orderSeats = o.getTickets().stream()
                                    .map(t -> t.getSeat().getSeatRow() + String.valueOf(t.getSeat().getSeatColumn()))
                                    .sorted()
                                    .toList();
                                List<String> requestSeats = new ArrayList<>(finalSeatIds);
                                requestSeats.sort(String::compareTo);
                                return orderSeats.equals(requestSeats);
                            }
                        }
                    }
                    // Check cùng food combos (nếu chỉ có đồ ăn)
                    if ((finalShowtimeId == null || finalSeatIds.isEmpty()) && !finalFoodComboMaps.isEmpty()) {
                        return o.getOrderCombos() != null && !o.getOrderCombos().isEmpty();
                    }
                    return false;
                })
                .findFirst();
            
            if (duplicateOrder.isPresent()) {
                System.out.println("Duplicate order detected (created " + 
                    java.time.Duration.between(duplicateOrder.get().getOrderDate(), 
                        LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))).getSeconds() + 
                    " seconds ago), returning existing order");
                
                Order existingOrder = duplicateOrder.get();
                String existingTxnRef = existingOrder.getVnpTxnRef();
                
                // Nếu đã có txnRef, thử tạo lại payment URL
                if (existingTxnRef != null && !existingTxnRef.isEmpty() && !existingTxnRef.startsWith("ORDER-")) {
                    Map<String, Object> result = zaloPayService.createPaymentOrder(
                        Long.valueOf(totalAmount.longValue()),
                        description,
                        existingTxnRef,
                        null // embedDataStr - sẽ được tạo tự động trong service
                    );
                    
                    if (result != null && result.get("order_url") != null) {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        Map<String, Object> data = new HashMap<>();
                        data.put("payment_url", result.get("order_url"));
                        data.put("app_trans_id", result.get("app_trans_id"));
                        data.put("orderId", existingOrder.getOrderId());
                        response.put("data", data);
                        return ResponseEntity.ok(response);
                    }
                }
                
                // Return error để frontend biết đã có order đang xử lý
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Đơn hàng đang được xử lý, vui lòng đợi...");
                response.put("orderId", existingOrder.getOrderId());
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Double check duplicate TRƯỚC KHI tạo order (tránh race condition)
            // Check lại trong vòng 2 giây gần đây với cùng showtime và seats
            if (showtimeId != null && !seatIds.isEmpty()) {
                // Tạo final copies để sử dụng trong lambda
                final Long finalShowtimeIdForCheck = showtimeId;
                final List<String> finalSeatIdsForCheck = new ArrayList<>(seatIds);
                
                LocalDateTime twoSecondsAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusSeconds(2);
                List<Order> veryRecentOrders = orderRepository.findByUserUserIdOrderByOrderDateDesc(user.getUserId());
                boolean hasVeryRecentDuplicate = veryRecentOrders.stream()
                    .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(twoSecondsAgo))
                    .anyMatch(o -> {
                        if (o.getTickets() != null && !o.getTickets().isEmpty()) {
                            Long orderShowtimeId = o.getTickets().get(0).getShowtime().getShowtimeId();
                            if (orderShowtimeId.equals(finalShowtimeIdForCheck)) {
                                List<String> orderSeats = o.getTickets().stream()
                                    .map(t -> t.getSeat().getSeatRow() + String.valueOf(t.getSeat().getSeatColumn()))
                                    .sorted()
                                    .toList();
                                List<String> requestSeats = new ArrayList<>(finalSeatIdsForCheck);
                                requestSeats.sort(String::compareTo);
                                return orderSeats.size() == requestSeats.size() && orderSeats.equals(requestSeats);
                            }
                        }
                        return false;
                    });
                
                if (hasVeryRecentDuplicate) {
                    System.out.println("Very recent duplicate detected, returning conflict");
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "Đơn hàng đang được xử lý, vui lòng đợi...");
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
                }
            }
            
            // Tạo Order trực tiếp (giống MoMo)
            LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            String txnRef = user.getUserId() + "_" + System.currentTimeMillis();
            
            // Tạo Order với tickets và orderCombos
            List<OrderCreationService.FoodComboRequest> foodComboRequests = foodComboMaps.stream()
                .map(map -> {
                    try {
                        return new OrderCreationService.FoodComboRequest(
                            Long.parseLong(map.get("foodComboId").toString()),
                            Integer.parseInt(map.get("quantity").toString())
                        );
                    } catch (Exception e) {
                        System.err.println("Error parsing foodCombo: " + e.getMessage());
                        return null;
                    }
                })
                .filter(req -> req != null)
                .toList();
            
            // Final validation: Nếu không có seats, thì showtimeId phải là null
            // (Tránh trường hợp có showtimeId nhưng không có seats - chỉ đặt đồ ăn)
            if ((seatIds == null || seatIds.isEmpty()) && showtimeId != null) {
                System.out.println("WARNING: showtimeId is " + showtimeId + " but no seats found. Setting showtimeId to null for food-only order.");
                showtimeId = null;
            }
            
            System.out.println("=== Creating Order ===");
            System.out.println("showtimeId: " + showtimeId);
            System.out.println("seatIds: " + seatIds);
            System.out.println("foodComboRequests size: " + foodComboRequests.size());
            
            // Tạo Order trực tiếp
            // Với đơn hàng chỉ có đồ ăn, cần truyền cinemaComplexId
            // Với đơn hàng có vé phim, có thể lấy từ showtime -> room -> complex
            Order order = orderCreationService.createOrder(
                user.getUserId(),
                showtimeId,
                seatIds,
                foodComboRequests,
                totalAmount,
                PaymentMethod.ZALOPAY,
                voucherCode,
                cinemaComplexId // Truyền cinemaComplexId cho đơn hàng chỉ có đồ ăn
            );
            
            // Set thêm thông tin cho ZaloPay
            order.setVnpTxnRef(txnRef);
            order.setOrderInfo(description);
            order.setPaymentExpiredAt(now.plusMinutes(15));
            // Đánh dấu order là top-up nếu description chứa "Nạp tiền"
            if (description != null && description.toLowerCase().contains("nạp tiền")) {
                order.setIsTopUp(true);
            }
            // KHÔNG set vnpPayDate ở đây nữa, vì chưa thanh toán thành công
            // order.setVnpPayDate(now); 
            order = orderService.save(order);
            
            System.out.println("Created Order ID: " + order.getOrderId() + ", TxnRef: " + txnRef);
            
            // Tạo ZaloPay payment order
            Map<String, Object> result = zaloPayService.createPaymentOrder(
                Long.valueOf(totalAmount.longValue()),
                description,
                txnRef,
                null // embedDataStr - sẽ được tạo tự động trong service
            );
            
            System.out.println("ZaloPay Service Result: " + result);

            if (result != null && result.get("order_url") != null) {
                String appTransId = (String) result.get("app_trans_id");
                
                // Cập nhật vnpTxnRef với appTransId từ ZaloPay
                order.setVnpTxnRef(appTransId);
                orderService.save(order);
                
                // Email sẽ được gửi khi thanh toán thành công (callback hoặc status check)
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                Map<String, Object> data = new HashMap<>();
                data.put("payment_url", result.get("order_url"));
                data.put("app_trans_id", appTransId);
                data.put("orderId", order.getOrderId());
                data.put("txnRef", appTransId);
                data.put("zp_trans_token", result.get("zp_trans_token"));
                data.put("qr_code", result.get("qr_code"));
                response.put("data", data);
                return ResponseEntity.ok(response);
            } else {
                // Xóa Order nếu không tạo được payment URL
                orderService.delete(order);
                
                Map<String, Object> response = new HashMap<>();
                String errorMessage = "Không thể tạo đơn hàng thanh toán";
                
                if (result != null) {
                    Object returnMsg = result.get("return_message");
                    Object subReturnMsg = result.get("sub_return_message");
                    
                    if (subReturnMsg != null && !subReturnMsg.toString().isEmpty()) {
                        errorMessage = subReturnMsg.toString();
                    } else if (returnMsg != null && !returnMsg.toString().isEmpty()) {
                        errorMessage = returnMsg.toString();
                    }
                    
                    response.put("return_code", result.get("return_code"));
                    response.put("sub_return_code", result.get("sub_return_code"));
                }
                
                response.put("success", false);
                response.put("message", errorMessage);
                response.put("error", errorMessage);
                System.err.println("ZaloPay create order failed: " + errorMessage);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Error in createZaloPayOrder: " + e.getMessage());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Có lỗi xảy ra: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }


    /**
     * Callback từ ZaloPay sau khi thanh toán - chỉ cập nhật transaction info
     */
    @PostMapping("/zalopay/callback")
    public ResponseEntity<?> zaloPayCallback(@RequestBody Map<String, Object> callbackData) {
        try {
            
            // Xác thực callback
            String data = callbackData.get("data") != null ? 
                callbackData.get("data").toString() : "";
            String mac = callbackData.get("mac") != null ? 
                callbackData.get("mac").toString() : "";

            boolean isValid = zaloPayService.verifyCallback(data, mac);

            if (isValid) {
                // Parse data để lấy app_trans_id và transaction info
                String appTransId = null;
                try {
                    Map<String, Object> dataMap = objectMapper.readValue(data, new TypeReference<Map<String, Object>>() {});
                    appTransId = (String) dataMap.get("app_trans_id");
                    
                    // Cập nhật transaction info cho Order nếu tìm thấy
                    if (appTransId != null) {
                        Optional<Order> orderOpt = orderService.findByTxnRef(appTransId);
                        if (orderOpt.isPresent()) {
                            Order order = orderOpt.get();
                            
                            // Kiểm tra xem đã xử lý callback này chưa (idempotency check)
                            // Chỉ check vnpPayDate - nếu đã có thì đã xử lý rồi
                            boolean alreadyProcessed = order.getVnpPayDate() != null;
                            boolean needUpdate = false;
                            
                            if (alreadyProcessed) {
                                System.out.println("Order ID: " + order.getOrderId() + " already processed (vnpPayDate exists), just update transaction info if needed");
                            } else {
                                // Đánh dấu đơn hàng đã thanh toán thành công
                                order.setVnpPayDate(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
                                order.setStatus(OrderStatus.PAID);
                                needUpdate = true;
                            }
                            
                            // Cập nhật thông tin transaction từ callback (nếu chưa có)
                            Object zpTransToken = dataMap.get("zp_trans_token");
                            if (zpTransToken != null && order.getVnpTransactionNo() == null) {
                                order.setVnpTransactionNo(zpTransToken.toString());
                                needUpdate = true;
                            }
                            
                            if (needUpdate) {
                                orderService.save(order);
                                System.out.println("Updated transaction info for Order ID: " + order.getOrderId());
                            }
                            
                            // Gửi thông báo đặt hàng thành công (chỉ gửi nếu callback lần đầu)
                            // notifyBookingSuccess đã có check duplicate, nên an toàn
                            if (!alreadyProcessed) {
                                // Nếu là order nạp tiền, credit vào wallet
                                if (Boolean.TRUE.equals(order.getIsTopUp())) {
                                    try {
                                        Long userId = order.getUser().getUserId();
                                        BigDecimal amount = order.getTotalAmount();
                                        String note = order.getOrderInfo() != null && !order.getOrderInfo().isEmpty()
                                                ? order.getOrderInfo()
                                                : "Nạp tiền vào ví Cinesmart";
                                        String txnRef = "TOPUP-" + order.getOrderId() + "-" + System.currentTimeMillis();
                                        WalletTransaction transaction = walletService.credit(userId, amount, note, txnRef);
                                        System.out.println("Credited " + amount + " to wallet for top-up order ID: " + order.getOrderId());
                                        
                                        // Gửi email xác nhận nạp tiền thành công
                                        sendTopUpEmail(order, transaction, order.getPaymentMethod());
                                    } catch (Exception e) {
                                        System.err.println("Error crediting wallet for top-up order: " + e.getMessage());
                                        e.printStackTrace();
                                        // Không fail callback nếu wallet credit lỗi, nhưng log để debug
                                    }
                                } else {
                                    // Xóa voucher khỏi danh sách của user khi thanh toán thành công (chỉ cho order thường)
                                removeVoucherFromUser(order);
                                }
                                
                                try {
                                    // 1. Gửi Notification
                                    String totalAmountStr = order.getTotalAmount()
                                        .setScale(0, RoundingMode.HALF_UP)
                                        .toPlainString() + " VND";
                                    System.out.println("Attempting to send notification for Order ID: " + order.getOrderId());
                                    notificationService.notifyOrderSuccess(
                                        order.getUser().getUserId(),
                                        order.getOrderId(),
                                        totalAmountStr
                                    );
                                    System.out.println("Notification sent successfully for Order ID: " + order.getOrderId());
                                    
                                    // 2. Gửi Email (chỉ cho order thường, không gửi cho top-up)
                                    if (!Boolean.TRUE.equals(order.getIsTopUp())) {
                                    System.out.println("Sending confirmation email for Order ID: " + order.getOrderId());
                                    Optional<Order> orderWithDetails = orderRepository.findByIdWithDetails(order.getOrderId());
                                    if (orderWithDetails.isPresent()) {
                                        emailService.sendBookingConfirmationEmail(orderWithDetails.get());
                                        System.out.println("Email sent successfully");
                                        }
                                    }
                                } catch (Exception e) {
                                    System.err.println("Error sending notification/email: " + e.getMessage());
                                    e.printStackTrace();
                                    // Không fail callback nếu notification lỗi
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    // Ignore parsing errors
                }
                
                // Trả về response cho ZaloPay
                Map<String, Object> response = new HashMap<>();
                response.put("return_code", 1);
                response.put("return_message", "success");
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("return_code", -1);
                response.put("return_message", "Invalid mac");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("return_code", -1);
            response.put("return_message", "Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Kiểm tra trạng thái thanh toán ZaloPay
     */
    @GetMapping("/zalopay/status/{appTransId}")
    public ResponseEntity<?> checkZaloPayStatus(@PathVariable String appTransId) {
        try {
            // Tìm đơn hàng theo appTransId (được lưu là vnpTxnRef)
            Optional<Order> orderOpt = orderService.findByTxnRef(appTransId);
            
            if (orderOpt.isPresent()) {
                Order order = orderOpt.get();
                
                // 1. Nếu đơn hàng đã được đánh dấu thanh toán thành công (có vnpPayDate)
                if (order.getVnpPayDate() != null) {
                    return ResponseEntity.ok(createSuccessResponse("Lấy thông tin đơn hàng thành công", 
                        mapToPaymentOrderDTO(order)));
                }
                
                // 2. Nếu chưa có vnpPayDate, gọi API ZaloPay để kiểm tra trạng thái thực tế
                Map<String, Object> zpStatus = zaloPayService.getPaymentStatus(appTransId);
                System.out.println("ZaloPay Status Check for " + appTransId + ": " + zpStatus);
                
                if (zpStatus != null) {
                    // Xử lý return_code (ZaloPay có thể trả về returncode hoặc return_code)
                    Object returnCodeObj = zpStatus.get("return_code");
                    if (returnCodeObj == null) returnCodeObj = zpStatus.get("returncode");
                    
                    int returnCode = returnCodeObj != null ? Integer.parseInt(returnCodeObj.toString()) : -1;
                    
                    if (returnCode == 1) {
                        // Thanh toán thành công! Cập nhật vnpPayDate
                        order.setVnpPayDate(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
                        order.setStatus(OrderStatus.PAID);
                        
                        // Cập nhật transaction id nếu có
                        if (zpStatus.get("zp_trans_id") != null) {
                            order.setVnpTransactionNo(zpStatus.get("zp_trans_id").toString());
                        }
                        
                        orderService.save(order);
                        
                        // Nếu là order nạp tiền, credit vào wallet
                        if (Boolean.TRUE.equals(order.getIsTopUp())) {
                            try {
                                Long userId = order.getUser().getUserId();
                                BigDecimal amount = order.getTotalAmount();
                                String note = order.getOrderInfo() != null && !order.getOrderInfo().isEmpty()
                                        ? order.getOrderInfo()
                                        : "Nạp tiền vào ví Cinesmart";
                                String txnRef = "TOPUP-" + order.getOrderId() + "-" + System.currentTimeMillis();
                                WalletTransaction transaction = walletService.credit(userId, amount, note, txnRef);
                                System.out.println("Credited " + amount + " to wallet for top-up order ID: " + order.getOrderId());
                                
                                // Gửi email xác nhận nạp tiền thành công
                                sendTopUpEmail(order, transaction, order.getPaymentMethod());
                            } catch (Exception e) {
                                System.err.println("Error crediting wallet for top-up order in status check: " + e.getMessage());
                                e.printStackTrace();
                            }
                        } else {
                            // Xóa voucher khỏi danh sách của user khi thanh toán thành công (chỉ cho order thường)
                        removeVoucherFromUser(order);
                        }
                        
                        // Gửi notification và email xác nhận
                        try {
                            String totalAmountStr = order.getTotalAmount()
                                .setScale(0, RoundingMode.HALF_UP)
                                .toPlainString() + " VND";
                            notificationService.notifyOrderSuccess(
                                order.getUser().getUserId(),
                                order.getOrderId(),
                                totalAmountStr
                            );
                            
                            // Chỉ gửi email cho order thường, không gửi cho top-up
                            if (!Boolean.TRUE.equals(order.getIsTopUp())) {
                            Optional<Order> orderWithDetails = orderRepository.findByIdWithDetails(order.getOrderId());
                            if (orderWithDetails.isPresent()) {
                                emailService.sendBookingConfirmationEmail(orderWithDetails.get());
                                }
                            }
                        } catch (Exception e) {
                            System.err.println("Error sending notification/email in status check: " + e.getMessage());
                            e.printStackTrace();
                        }
                        
                        return ResponseEntity.ok(createSuccessResponse("Thanh toán thành công", 
                            mapToPaymentOrderDTO(order)));
                    } else if (returnCode == 3) {
                        // Đang xử lý
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("status", "pending");
                        return ResponseEntity.ok(response);
                    }
                }
                
                // Trường hợp còn lại: coi như chưa thanh toán hoặc thất bại
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("status", "pending");
                return ResponseEntity.ok(response);
            } else {
                // Nếu chưa tìm thấy order trong DB
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Không tìm thấy đơn hàng");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private PaymentOrderResponseDTO mapToPaymentOrderDTO(Order order) {
        return new PaymentOrderResponseDTO(
            order.getOrderId(),
            order.getVnpTxnRef(),
            order.getTotalAmount(),
            order.getPaymentMethod(),
            order.getVnpResponseCode(),
            order.getVnpTransactionNo(),
            order.getVnpBankCode(),
            order.getOrderDate(),
            order.getVnpPayDate(),
            order.getIsTopUp()
        );
    }

    // ==================== MoMo Endpoints ====================

    @PostMapping("/momo/create")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createMomoPayment(@Valid @RequestBody CreatePaymentRequest request,
                                               BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse("Dữ liệu không hợp lệ", bindingResult));
        }

        try {
            User user = getCurrentUser().orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
            
            // Kiểm tra user có bị chặn không
            if (Boolean.FALSE.equals(user.getStatus())) {
                return ResponseEntity.badRequest().body(createErrorResponse("Tài khoản của bạn đã bị chặn. Vui lòng liên hệ quản trị viên để được hỗ trợ.", null));
            }

            // Parse booking info
            Long showtimeId = request.getShowtimeId();
            List<String> seatIds = request.getSeatIds() != null ? request.getSeatIds() : List.of();
            List<Map<String, Object>> foodComboMaps = request.getFoodCombos() != null ? request.getFoodCombos() : List.of();
            String voucherCode = request.getVoucherCode();
            Long cinemaComplexId = request.getCinemaComplexId(); // Lấy cinemaComplexId từ request (cho đơn hàng chỉ có đồ ăn)
            
            // Lấy voucher nếu có
            Voucher voucher = null;
            if (request.getVoucherId() != null) {
                voucher = voucherRepository.findById(request.getVoucherId())
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher"));
            } else if (voucherCode != null && !voucherCode.isEmpty()) {
                voucher = voucherRepository.findByCode(voucherCode).orElse(null);
            }

            // Check for duplicate order trong vòng 10 giây gần đây (tránh double-click và race condition)
            // Tạo final copies để sử dụng trong lambda
            final Long finalShowtimeId = showtimeId;
            final List<String> finalSeatIds = new ArrayList<>(seatIds);
            final List<Map<String, Object>> finalFoodComboMaps = new ArrayList<>(foodComboMaps);
            
            LocalDateTime tenSecondsAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusSeconds(10);
            List<Order> recentOrders = orderRepository.findByUserUserIdOrderByOrderDateDesc(user.getUserId());
            Optional<Order> duplicateOrder = recentOrders.stream()
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(tenSecondsAgo))
                .filter(o -> {
                    // Check cùng showtime và seats (nếu có vé)
                    if (finalShowtimeId != null && !finalSeatIds.isEmpty()) {
                        if (o.getTickets() != null && !o.getTickets().isEmpty()) {
                            Long orderShowtimeId = o.getTickets().get(0).getShowtime().getShowtimeId();
                            if (orderShowtimeId.equals(finalShowtimeId)) {
                                List<String> orderSeats = o.getTickets().stream()
                                    .map(t -> t.getSeat().getSeatRow() + String.valueOf(t.getSeat().getSeatColumn()))
                                    .sorted()
                                    .toList();
                                List<String> requestSeats = new ArrayList<>(finalSeatIds);
                                requestSeats.sort(String::compareTo);
                                return orderSeats.equals(requestSeats);
                            }
                        }
                    }
                    // Check cùng food combos (nếu chỉ có đồ ăn)
                    if ((finalShowtimeId == null || finalSeatIds.isEmpty()) && !finalFoodComboMaps.isEmpty()) {
                        return o.getOrderCombos() != null && !o.getOrderCombos().isEmpty();
                    }
                    return false;
                })
                .findFirst();
            
            if (duplicateOrder.isPresent()) {
                System.out.println("Duplicate MoMo order detected, returning existing order");
                Order existingOrder = duplicateOrder.get();
                
                // Return error để frontend biết đã có order đang xử lý
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Đơn hàng đang được xử lý, vui lòng đợi...");
                response.put("orderId", existingOrder.getOrderId());
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Double check duplicate TRƯỚC KHI tạo order (tránh race condition)
            // Check lại trong vòng 2 giây gần đây với cùng showtime và seats
            if (showtimeId != null && !seatIds.isEmpty()) {
                // Tạo final copies để sử dụng trong lambda
                final Long finalShowtimeIdForCheck = showtimeId;
                final List<String> finalSeatIdsForCheck = new ArrayList<>(seatIds);
                
                LocalDateTime twoSecondsAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusSeconds(2);
                List<Order> veryRecentOrders = orderRepository.findByUserUserIdOrderByOrderDateDesc(user.getUserId());
                boolean hasVeryRecentDuplicate = veryRecentOrders.stream()
                    .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(twoSecondsAgo))
                    .anyMatch(o -> {
                        if (o.getTickets() != null && !o.getTickets().isEmpty()) {
                            Long orderShowtimeId = o.getTickets().get(0).getShowtime().getShowtimeId();
                            if (orderShowtimeId.equals(finalShowtimeIdForCheck)) {
                                List<String> orderSeats = o.getTickets().stream()
                                    .map(t -> t.getSeat().getSeatRow() + String.valueOf(t.getSeat().getSeatColumn()))
                                    .sorted()
                                    .toList();
                                List<String> requestSeats = new ArrayList<>(finalSeatIdsForCheck);
                                requestSeats.sort(String::compareTo);
                                return orderSeats.size() == requestSeats.size() && orderSeats.equals(requestSeats);
                            }
                        }
                        return false;
                    });
                
                if (hasVeryRecentDuplicate) {
                    System.out.println("Very recent MoMo duplicate detected, returning conflict");
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "Đơn hàng đang được xử lý, vui lòng đợi...");
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
                }
            }
            
            // Tạo Order với tickets và orderCombos (giống ZaloPay)
            List<OrderCreationService.FoodComboRequest> foodComboRequests = foodComboMaps.stream()
                .map(map -> {
                    try {
                        return new OrderCreationService.FoodComboRequest(
                            Long.parseLong(map.get("foodComboId").toString()),
                            Integer.parseInt(map.get("quantity").toString())
                        );
                    } catch (Exception e) {
                        System.err.println("Error parsing foodCombo: " + e.getMessage());
                        return null;
                    }
                })
                .filter(req -> req != null)
                .toList();
            
            // Tạo Order trực tiếp với tickets và orderCombos
            // Với đơn hàng chỉ có đồ ăn, cần truyền cinemaComplexId
            // Với đơn hàng có vé phim, có thể lấy từ showtime -> room -> complex
            Order order = orderCreationService.createOrder(
                user.getUserId(),
                showtimeId,
                seatIds,
                foodComboRequests,
                request.getAmount(),
                PaymentMethod.MOMO,
                voucherCode,
                cinemaComplexId // Truyền cinemaComplexId cho đơn hàng chỉ có đồ ăn
            );
            
            // Set thêm thông tin cho MoMo
            LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            String txnRef = user.getUserId() + "_" + System.currentTimeMillis();
            order.setVnpTxnRef(txnRef);
            
            // Đánh dấu order là top-up nếu orderDescription chứa "Nạp tiền" TRƯỚC KHI set orderInfo
            String orderDescription = request.getOrderDescription();
            String orderInfo = buildOrderInfo(request);
            if (orderDescription != null && orderDescription.toLowerCase().contains("nạp tiền")) {
                order.setIsTopUp(true);
                System.out.println("MoMo Create - Marking order as top-up, orderDescription: " + orderDescription);
            } else if (orderInfo != null && orderInfo.toLowerCase().contains("nạp tiền")) {
                order.setIsTopUp(true);
                System.out.println("MoMo Create - Marking order as top-up from orderInfo: " + orderInfo);
            }
            
            order.setOrderInfo(orderInfo);
            order.setPaymentExpiredAt(now.plusMinutes(15));
            
            // KHÔNG set vnpPayDate ở đây nữa, vì chưa thanh toán thành công
            // order.setVnpPayDate(now);
            order = orderService.save(order);
            
            // Đảm bảo isTopUp được lưu và flush vào database ngay lập tức
            if (Boolean.TRUE.equals(order.getIsTopUp())) {
                System.out.println("MoMo Create - Order ID: " + order.getOrderId() + " is marked as top-up, isTopUp: " + order.getIsTopUp() + ", orderInfo: " + order.getOrderInfo());
                // Flush để đảm bảo isTopUp được persist ngay lập tức
                orderRepository.flush();
            } else {
                System.out.println("MoMo Create - Order ID: " + order.getOrderId() + " is NOT top-up, isTopUp: " + order.getIsTopUp() + ", orderInfo: " + order.getOrderInfo() + ", orderDescription: " + orderDescription);
            }

            String requestId = UUID.randomUUID().toString();
            // Prepare booking info for extraData
            Map<String, Object> bookingInfoMap = new HashMap<>();
            bookingInfoMap.put("userId", user.getUserId());
            bookingInfoMap.put("showtimeId", showtimeId);
            bookingInfoMap.put("seatIds", seatIds);
            bookingInfoMap.put("foodCombos", foodComboMaps);
            bookingInfoMap.put("totalAmount", request.getAmount());
            bookingInfoMap.put("voucherCode", voucherCode);
            
            String bookingInfoJson = objectMapper.writeValueAsString(bookingInfoMap);
            String extraData = java.util.Base64.getEncoder()
                    .encodeToString(bookingInfoJson.getBytes(StandardCharsets.UTF_8));
            
            MomoCreatePaymentResponse momoResponse = momoService.createPayment(
                    order.getVnpTxnRef(),
                    requestId,
                    request.getAmount(),
                    order.getOrderInfo(),
                    extraData
            );
            if (momoResponse == null || momoResponse.getPayUrl() == null) {
                // Xóa Order nếu không tạo được payment URL
                orderService.delete(order);
                throw new IllegalStateException("MoMo không trả về liên kết thanh toán");
            }

            // Email sẽ được gửi khi thanh toán thành công (callback hoặc status check)

            Map<String, Object> data = new HashMap<>();
            data.put("paymentUrl", momoResponse.getPayUrl());
            data.put("orderId", order.getOrderId());
            data.put("txnRef", order.getVnpTxnRef());

            return ResponseEntity.ok(createSuccessResponse("Khởi tạo thanh toán thành công", data));
        } catch (RuntimeException ex) {
            log.error("Failed to create MoMo payment: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(ex.getMessage(), null));
        } catch (Exception ex) {
            log.error("Unexpected error while creating MoMo payment", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Không thể khởi tạo thanh toán. Vui lòng thử lại.", null));
        }
    }

    @PostMapping("/momo/ipn")
    public ResponseEntity<Map<String, Object>> handleMomoIpn(@RequestBody Map<String, Object> body) {
        Map<String, String> params = body.entrySet()
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> String.valueOf(e.getValue())));

        if (!momoService.validateIpnSignature(params)) {
            return ResponseEntity.ok(createMomoIpnResponse(1, "Invalid signature"));
        }

        String orderId = params.get("orderId");
        if (orderId == null) {
            return ResponseEntity.ok(createMomoIpnResponse(2, "Missing orderId"));
        }

        Optional<Order> orderOpt = orderService.findByTxnRef(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.ok(createMomoIpnResponse(3, "Order not found"));
        }

        Order order = orderOpt.get();
        
        // Debug: Log isTopUp status
        System.out.println("MoMo IPN - Order ID: " + order.getOrderId() + ", isTopUp: " + order.getIsTopUp() + ", orderInfo: " + order.getOrderInfo());
        
        String amountParam = params.get("amount");
        String expectedAmount = order.getTotalAmount()
                .setScale(0, RoundingMode.HALF_UP)
                .toPlainString();
        if (!expectedAmount.equals(amountParam)) {
            return ResponseEntity.ok(createMomoIpnResponse(4, "Invalid amount"));
        }

        String resultCode = params.get("resultCode");
        String message = params.getOrDefault("message", "");
        String transId = params.getOrDefault("transId", "");
        String payType = params.getOrDefault("payType", "MOMO");

        // Chỉ cập nhật transaction info, không set status (vì chỉ lưu đơn thành công)
        if ("0".equals(resultCode)) {
            // Thanh toán thành công - cập nhật transaction info
            // Kiểm tra xem đã xử lý IPN này chưa (idempotency check)
            boolean alreadyProcessed = order.getVnpPayDate() != null;
            boolean needUpdate = false;
            
            if (alreadyProcessed) {
                System.out.println("Order ID: " + order.getOrderId() + " already processed (vnpPayDate exists), just update transaction info if needed");
            } else {
                // Đánh dấu đơn hàng đã thanh toán thành công
                order.setVnpPayDate(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
                order.setStatus(OrderStatus.PAID);
                needUpdate = true;
            }
            
            // Cập nhật thông tin transaction từ IPN (nếu chưa có)
            if (order.getVnpTransactionNo() == null && transId != null && !transId.isEmpty()) {
                order.setVnpTransactionNo(transId);
                needUpdate = true;
            }
            if (order.getVnpBankCode() == null && payType != null && !payType.isEmpty()) {
                order.setVnpBankCode(payType);
                needUpdate = true;
            }
            if (order.getVnpResponseCode() == null && resultCode != null && !resultCode.isEmpty()) {
                order.setVnpResponseCode(resultCode);
                needUpdate = true;
            }
            if (order.getVnpTransactionStatus() == null && message != null && !message.isEmpty()) {
                order.setVnpTransactionStatus(message);
                needUpdate = true;
            }
            
            if (needUpdate) {
                orderService.save(order);
                System.out.println("Updated transaction info for Order ID: " + order.getOrderId());
            }
            
            // Gửi thông báo đặt hàng thành công (chỉ gửi nếu IPN lần đầu)
            // notifyBookingSuccess đã có check duplicate, nên an toàn
            if (!alreadyProcessed) {
                // Reload order để đảm bảo có đầy đủ thông tin, đặc biệt là isTopUp
                Optional<Order> reloadedOrderOpt = orderRepository.findByIdWithDetails(order.getOrderId());
                if (reloadedOrderOpt.isPresent()) {
                    order = reloadedOrderOpt.get();
                    System.out.println("MoMo IPN - Reloaded order ID: " + order.getOrderId() + ", isTopUp: " + order.getIsTopUp() + ", orderInfo: " + order.getOrderInfo());
                }
                
                // Kiểm tra lại isTopUp sau khi reload
                // Nếu orderInfo chứa "Nạp tiền" nhưng isTopUp chưa được set, set lại
                boolean isTopUpOrder = Boolean.TRUE.equals(order.getIsTopUp());
                if (!isTopUpOrder && order.getOrderInfo() != null && order.getOrderInfo().toLowerCase().contains("nạp tiền")) {
                    System.out.println("MoMo IPN - Detected top-up from orderInfo, setting isTopUp = true for order ID: " + order.getOrderId());
                    order.setIsTopUp(true);
                    orderService.save(order);
                    isTopUpOrder = true;
                }
                
                // Nếu là order nạp tiền, credit vào wallet (với idempotency check)
                if (isTopUpOrder) {
                    System.out.println("MoMo IPN - Processing top-up order, will credit wallet for order ID: " + order.getOrderId());
                    try {
                        Long userId = order.getUser().getUserId();
                        BigDecimal amount = order.getTotalAmount();
                        String note = order.getOrderInfo() != null && !order.getOrderInfo().isEmpty()
                                ? order.getOrderInfo()
                                : "Nạp tiền vào ví Cinesmart";
                        String txnRefPattern = "TOPUP-" + order.getOrderId() + "%";
                        
                        // Kiểm tra xem đã credit chưa
                        boolean alreadyCredited = walletTransactionRepository.existsByUserIdAndReferenceCodePattern(userId, txnRefPattern);
                        if (alreadyCredited) {
                            System.out.println("MoMo IPN - Wallet already credited for order: " + order.getOrderId());
                        } else {
                            String txnRef = "TOPUP-" + order.getOrderId() + "-" + System.currentTimeMillis();
                            WalletTransaction transaction = walletService.credit(userId, amount, note, txnRef);
                            System.out.println("MoMo IPN - Successfully credited " + amount + " to wallet for top-up order ID: " + order.getOrderId());
                            
                            // Gửi notification
                            try {
                                String amountStr = amount.setScale(0, RoundingMode.HALF_UP).toPlainString() + " VND";
                                notificationService.notifyTopUpSuccess(userId, order.getOrderId(), amountStr);
                                System.out.println("MoMo IPN - Top-up notification sent for order: " + order.getOrderId());
                            } catch (Exception notifEx) {
                                System.err.println("MoMo IPN - Error sending notification: " + notifEx.getMessage());
                            }
                            
                            // Gửi email xác nhận nạp tiền thành công
                            sendTopUpEmail(order, transaction, PaymentMethod.MOMO);
                        }
                    } catch (Exception e) {
                        System.err.println("MoMo IPN - Error crediting wallet for top-up order: " + e.getMessage());
                        e.printStackTrace();
                        // Không fail callback nếu wallet credit lỗi, nhưng log để debug
                    }
                } else {
                    System.out.println("MoMo IPN - Order ID: " + order.getOrderId() + " is NOT a top-up order (isTopUp: " + order.getIsTopUp() + ")");
                    // Xóa voucher khỏi danh sách của user khi thanh toán thành công (chỉ cho order thường)
                removeVoucherFromUser(order);
                }
                
                try {
                    // 1. Notification
                    String totalAmountStr = order.getTotalAmount()
                        .setScale(0, RoundingMode.HALF_UP)
                        .toPlainString() + " VND";
                    System.out.println("Attempting to send notification for Order ID: " + order.getOrderId());
                    notificationService.notifyOrderSuccess(
                        order.getUser().getUserId(),
                        order.getOrderId(),
                        totalAmountStr
                    );
                    System.out.println("Notification sent successfully for Order ID: " + order.getOrderId());
                    
                    // 2. Email (chỉ cho order thường, không gửi cho top-up)
                    if (!Boolean.TRUE.equals(order.getIsTopUp())) {
                    System.out.println("Sending confirmation email for Order ID: " + order.getOrderId());
                    Optional<Order> orderWithDetails = orderRepository.findByIdWithDetails(order.getOrderId());
                    if (orderWithDetails.isPresent()) {
                        emailService.sendBookingConfirmationEmail(orderWithDetails.get());
                        System.out.println("Email sent successfully");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Error sending notification: " + e.getMessage());
                    e.printStackTrace();
                    // Không fail IPN nếu notification lỗi
                }
            }
            
            return ResponseEntity.ok(createMomoIpnResponse(0, "Confirm Success"));
        } else {
            // Thanh toán thất bại - xóa Order vì chỉ lưu đơn thành công
            orderService.delete(order);
            return ResponseEntity.ok(createMomoIpnResponse(0, "Confirm Success"));
        }
    }

    @GetMapping("/momo/ipn")
    @Transactional
    public void handleMomoRedirect(@RequestParam Map<String, String> params,
                                   HttpServletResponse response) throws IOException {
        String orderId = params.getOrDefault("orderId", "");
        String resultCode = params.getOrDefault("resultCode", "");
        String amount = params.getOrDefault("amount", "");
        String transId = params.getOrDefault("transId", "");
        
        System.out.println("=== MoMo Redirect ===");
        System.out.println("orderId: " + orderId + ", resultCode: " + resultCode + ", amount: " + amount);
        
        // XỬ LÝ PAYMENT NGAY TẠI ĐÂY (vì trên localhost, IPN POST không được gọi)
        if ("0".equals(resultCode) && orderId != null && !orderId.isEmpty()) {
            try {
                Optional<Order> orderOpt = orderService.findByTxnRef(orderId);
                if (orderOpt.isPresent()) {
                    Order order = orderOpt.get();
                    
                    // Chỉ xử lý nếu chưa thanh toán
                    if (order.getVnpPayDate() == null) {
                        System.out.println("MoMo Redirect - Processing payment for order: " + order.getOrderId());
                        
                        order.setVnpPayDate(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
                        order.setStatus(OrderStatus.PAID);
                        order.setVnpResponseCode(resultCode);
                        if (transId != null && !transId.isEmpty()) {
                            order.setVnpTransactionNo(transId);
                        }
                        orderService.save(order);
                        
                        // Reload order với đầy đủ details
                        Optional<Order> fullOrderOpt = orderRepository.findByIdWithDetails(order.getOrderId());
                        if (fullOrderOpt.isPresent()) {
                            Order fullOrder = fullOrderOpt.get();
                            
                            // Kiểm tra isTopUp
                            boolean isTopUpOrder = Boolean.TRUE.equals(fullOrder.getIsTopUp());
                            if (!isTopUpOrder && fullOrder.getOrderInfo() != null && 
                                fullOrder.getOrderInfo().toLowerCase().contains("nạp tiền")) {
                                fullOrder.setIsTopUp(true);
                                orderService.save(fullOrder);
                                isTopUpOrder = true;
                            }
                            
                            System.out.println("MoMo Redirect - Order isTopUp: " + isTopUpOrder);
                            
                            if (isTopUpOrder) {
                                // Credit vào wallet (với idempotency check)
                                try {
                                    Long userId = fullOrder.getUser().getUserId();
                                    BigDecimal topUpAmount = fullOrder.getTotalAmount();
                                    String note = fullOrder.getOrderInfo() != null ? fullOrder.getOrderInfo() : "Nạp tiền vào ví Cinesmart";
                                    String txnRefPattern = "TOPUP-" + fullOrder.getOrderId() + "%";
                                    
                                    // Kiểm tra xem đã credit chưa
                                    boolean alreadyCredited = walletTransactionRepository.existsByUserIdAndReferenceCodePattern(userId, txnRefPattern);
                                    if (alreadyCredited) {
                                        System.out.println("MoMo Redirect - Wallet already credited for order: " + fullOrder.getOrderId());
                                    } else {
                                        String txnRef = "TOPUP-" + fullOrder.getOrderId() + "-" + System.currentTimeMillis();
                                        WalletTransaction transaction = walletService.credit(userId, topUpAmount, note, txnRef);
                                        System.out.println("MoMo Redirect - Credited " + topUpAmount + " to wallet for user " + userId);
                                        
                                        // Gửi notification
                                        try {
                                            String amountStr = topUpAmount.setScale(0, RoundingMode.HALF_UP).toPlainString() + " VND";
                                            notificationService.notifyTopUpSuccess(userId, fullOrder.getOrderId(), amountStr);
                                            System.out.println("MoMo Redirect - Top-up notification sent for order: " + fullOrder.getOrderId());
                                        } catch (Exception notifEx) {
                                            System.err.println("MoMo Redirect - Error sending notification: " + notifEx.getMessage());
                                        }
                                        
                                        // Gửi email
                                        sendTopUpEmail(fullOrder, transaction, PaymentMethod.MOMO);
                                    }
                                } catch (Exception e) {
                                    System.err.println("MoMo Redirect - Error crediting wallet: " + e.getMessage());
                                    e.printStackTrace();
                                }
                            } else {
                                // Order thường - xử lý voucher và gửi thông báo
                                removeVoucherFromUser(fullOrder);
                                
                                try {
                                    String totalAmountStr = fullOrder.getTotalAmount()
                                            .setScale(0, RoundingMode.HALF_UP)
                                            .toPlainString() + " VND";
                                    notificationService.notifyOrderSuccess(
                                            fullOrder.getUser().getUserId(),
                                            fullOrder.getOrderId(),
                                            totalAmountStr
                                    );
                                    emailService.sendBookingConfirmationEmail(fullOrder);
                                } catch (Exception e) {
                                    System.err.println("MoMo Redirect - Error sending notification/email: " + e.getMessage());
                                }
                            }
                        }
                    } else {
                        System.out.println("MoMo Redirect - Order already processed: " + order.getOrderId());
                    }
                }
            } catch (Exception e) {
                System.err.println("MoMo Redirect - Error processing payment: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        // Redirect về /payment/success với các params cần thiết
        String redirectUrl = "http://localhost:5173/payment/success";
        StringBuilder queryParams = new StringBuilder();
        
        if (orderId != null && !orderId.isEmpty()) {
            queryParams.append("orderId=").append(URLEncoder.encode(orderId, StandardCharsets.UTF_8));
        }
        if (resultCode != null && !resultCode.isEmpty()) {
            if (queryParams.length() > 0) queryParams.append("&");
            queryParams.append("resultCode=").append(URLEncoder.encode(resultCode, StandardCharsets.UTF_8));
        }
        if (amount != null && !amount.isEmpty()) {
            if (queryParams.length() > 0) queryParams.append("&");
            queryParams.append("amount=").append(URLEncoder.encode(amount, StandardCharsets.UTF_8));
        }
        
        if (queryParams.length() > 0) {
            redirectUrl = redirectUrl + "?" + queryParams.toString();
        }
        
        response.sendRedirect(redirectUrl);
    }

    /**
     * Endpoint để gửi email xác nhận đặt vé (có thể gọi từ frontend sau khi thanh toán thành công)
     * Dùng làm fallback nếu callback/IPN không được gọi
     */
    @PostMapping("/orders/{orderId}/send-confirmation-email")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> sendBookingConfirmationEmail(@PathVariable Long orderId) {
        try {
            // Lấy user hiện tại
            User currentUser = getCurrentUser()
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
            
            // Load order với đầy đủ relations
            Optional<Order> orderOpt = orderRepository.findByIdWithDetails(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("Không tìm thấy đơn hàng", null));
            }
            
            Order order = orderOpt.get();
            
            // Kiểm tra quyền truy cập
            if (!order.getUser().getUserId().equals(currentUser.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(createErrorResponse("Bạn không có quyền xem đơn hàng này", null));
            }
            
            // Chỉ gửi email từ frontend nếu callback/IPN chưa được gọi (vnpPayDate == null)
            // Nếu vnpPayDate đã có nghĩa là callback/IPN đã gửi email rồi
            if (order.getVnpPayDate() != null) {
                return ResponseEntity.ok(createSuccessResponse("Email đã được gửi từ hệ thống", null));
            }
            
            // Kiểm tra order có tickets hoặc combos không (phải có vé hoặc đồ ăn mới gửi email)
            boolean hasTickets = order.getTickets() != null && !order.getTickets().isEmpty();
            boolean hasCombos = order.getOrderCombos() != null && !order.getOrderCombos().isEmpty();
            
            if (!hasTickets && !hasCombos) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("Đơn hàng không có vé xem phim cũng không có đồ ăn", null));
            }
            
            // Gửi email
            emailService.sendBookingConfirmationEmail(order);
            
            return ResponseEntity.ok(createSuccessResponse("Email xác nhận đã được gửi", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Không thể gửi email: " + e.getMessage(), null));
        }
    }

    @GetMapping("/orders/{txnRef}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getOrderByTxnRef(@PathVariable String txnRef) {
        try {
            Order order = orderService.findByTxnRef(txnRef)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

            User currentUser = getCurrentUser()
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

            // Load order với details để check user
            Optional<Order> orderWithDetailsOpt = orderRepository.findByIdWithDetails(order.getOrderId());
            if (orderWithDetailsOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("Không tìm thấy đơn hàng", null));
            }
            order = orderWithDetailsOpt.get();

            if (order.getUser() == null || !order.getUser().getUserId().equals(currentUser.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(createErrorResponse("Bạn không có quyền xem đơn hàng này", null));
            }

            // Nếu order chưa thanh toán và là MoMo, thử check status từ MoMo
            if (order.getVnpPayDate() == null && order.getPaymentMethod() == PaymentMethod.MOMO) {
                checkMomoStatusAndUpdateOrder(order);
                // Reload order sau khi check status để lấy data mới nhất
                order = orderRepository.findByIdWithDetails(order.getOrderId()).orElse(order);
            }

            PaymentOrderResponseDTO dto = new PaymentOrderResponseDTO(
                    order.getOrderId(),
                    order.getVnpTxnRef(),
                    order.getTotalAmount(),
                    order.getPaymentMethod(),
                    order.getVnpResponseCode(),
                    order.getVnpTransactionNo(),
                    order.getVnpBankCode(),
                    order.getOrderDate(),
                    order.getVnpPayDate(),
                    order.getIsTopUp()
            );

            return ResponseEntity.ok(createSuccessResponse("Lấy thông tin đơn hàng thành công", dto));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(ex.getMessage(), null));
        }
    }

    // ==================== Wallet Payment Endpoints ====================

    /**
     * Test endpoint để kiểm tra Spring Security
     */
    @GetMapping("/wallet/test")
    public ResponseEntity<?> testWalletEndpoint() {
        System.out.println("=== WALLET TEST ENDPOINT CALLED ===");
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Wallet endpoint is working!");
        response.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }

    /**
     * Thanh toán bằng ví Cinesmart
     */
    @PostMapping("/wallet/create")
    public ResponseEntity<?> createWalletPayment(@Valid @RequestBody CreatePaymentRequest request,
                                                 BindingResult bindingResult,
                                                 @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        System.out.println("=== WALLET PAYMENT ENDPOINT CALLED ===");
        System.out.println("Auth header present: " + (authHeader != null));
        System.out.println("PIN from request: " + (request.getPin() != null ? "PRESENT (length: " + request.getPin().length() + ")" : "NULL"));
        
        if (bindingResult.hasErrors()) {
            System.out.println("Validation errors: " + bindingResult.getAllErrors());
            // Kiểm tra xem có lỗi validation liên quan đến PIN không
            bindingResult.getAllErrors().forEach(error -> {
                System.out.println("Validation error: " + error.getDefaultMessage() + " - Field: " + error.getObjectName());
            });
            return ResponseEntity.badRequest().body(createErrorResponse("Dữ liệu không hợp lệ", bindingResult));
        }

        // Lấy user - thử từ SecurityContext trước, nếu không có thì parse từ token
        User user = getCurrentUser().orElse(null);
        System.out.println("User from SecurityContext: " + (user != null ? user.getUsername() : "NULL"));
        
        // Nếu không có user từ SecurityContext, thử lấy từ token
        if (user == null && authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                if (jwtUtils.validateJwtToken(token)) {
                    String username = jwtUtils.getUsernameFromJwtToken(token);
                    user = userRepository.findByUsername(username).orElse(null);
                    System.out.println("User from token: " + (user != null ? user.getUsername() : "NULL"));
                } else {
                    System.out.println("Token validation failed");
                }
            } catch (Exception e) {
                System.out.println("Error parsing token: " + e.getMessage());
            }
        }
        
        // Kiểm tra user có bị chặn không
        if (user != null && Boolean.FALSE.equals(user.getStatus())) {
            return ResponseEntity.badRequest().body(createErrorResponse("Tài khoản của bạn đã bị chặn. Vui lòng liên hệ quản trị viên để được hỗ trợ.", null));
        }
        
        if (user == null) {
            System.out.println("ERROR: No user found!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorResponse("Vui lòng đăng nhập để thanh toán", null));
        }

        Order order = null;
        boolean walletDebited = false;
        final User finalUser = user;
        
        try {
            log.info("Processing wallet payment for user: {}", finalUser.getUserId());

            // Parse booking info
            Long showtimeId = request.getShowtimeId();
            List<String> seatIds = request.getSeatIds() != null ? request.getSeatIds() : List.of();
            List<Map<String, Object>> foodComboMaps = request.getFoodCombos() != null ? request.getFoodCombos() : List.of();
            String voucherCode = request.getVoucherCode();
            Long cinemaComplexId = request.getCinemaComplexId();

            // Check for duplicate order trong vòng 10 giây gần đây
            final Long finalShowtimeId = showtimeId;
            final List<String> finalSeatIds = new ArrayList<>(seatIds);
            final List<Map<String, Object>> finalFoodComboMaps = new ArrayList<>(foodComboMaps);

            LocalDateTime tenSecondsAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusSeconds(10);
            List<Order> recentOrders = orderRepository.findByUserUserIdOrderByOrderDateDesc(finalUser.getUserId());
            Optional<Order> duplicateOrder = recentOrders.stream()
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(tenSecondsAgo))
                .filter(o -> {
                    if (finalShowtimeId != null && !finalSeatIds.isEmpty()) {
                        if (o.getTickets() != null && !o.getTickets().isEmpty()) {
                            Long orderShowtimeId = o.getTickets().get(0).getShowtime().getShowtimeId();
                            if (orderShowtimeId.equals(finalShowtimeId)) {
                                List<String> orderSeats = o.getTickets().stream()
                                    .map(t -> t.getSeat().getSeatRow() + String.valueOf(t.getSeat().getSeatColumn()))
                                    .sorted()
                                    .toList();
                                List<String> requestSeats = new ArrayList<>(finalSeatIds);
                                requestSeats.sort(String::compareTo);
                                return orderSeats.equals(requestSeats);
                            }
                        }
                    }
                    if ((finalShowtimeId == null || finalSeatIds.isEmpty()) && !finalFoodComboMaps.isEmpty()) {
                        return o.getOrderCombos() != null && !o.getOrderCombos().isEmpty();
                    }
                    return false;
                })
                .findFirst();

            if (duplicateOrder.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Đơn hàng đang được xử lý, vui lòng đợi...");
                response.put("orderId", duplicateOrder.get().getOrderId());
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }

            // Tạo Order
            List<OrderCreationService.FoodComboRequest> foodComboRequests = foodComboMaps.stream()
                .map(map -> {
                    try {
                        return new OrderCreationService.FoodComboRequest(
                            Long.parseLong(map.get("foodComboId").toString()),
                            Integer.parseInt(map.get("quantity").toString())
                        );
                    } catch (Exception e) {
                        System.err.println("Error parsing foodCombo: " + e.getMessage());
                        return null;
                    }
                })
                .filter(req -> req != null)
                .toList();

            order = orderCreationService.createOrder(
                finalUser.getUserId(),
                showtimeId,
                seatIds,
                foodComboRequests,
                request.getAmount(),
                PaymentMethod.WALLET,
                voucherCode,
                cinemaComplexId
            );

            // Set thông tin cho Wallet payment
            LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            String txnRef = "WALLET-" + finalUser.getUserId() + "_" + System.currentTimeMillis();
            order.setVnpTxnRef(txnRef);
            order.setOrderInfo(buildOrderInfo(request));
            order = orderService.save(order);

            // Xác thực PIN trước khi trừ tiền từ ví Cinesmart
            boolean hasPin = walletPinService.hasPin(finalUser.getUserId());
            log.info("Wallet payment - User {} has PIN: {}", finalUser.getUserId(), hasPin);
            log.info("Wallet payment - PIN from request: {}", request.getPin() != null ? "***" : "NULL");
            
            if (hasPin) {
                // User có PIN, yêu cầu xác thực
                String pinFromRequest = request.getPin();
                log.info("Wallet payment - PIN received: {}", pinFromRequest != null ? "PRESENT (length: " + pinFromRequest.length() + ")" : "NULL");
                
                if (pinFromRequest == null || pinFromRequest.trim().isEmpty()) {
                    log.warn("Wallet payment - PIN is null or empty for user {}", finalUser.getUserId());
                    // Xóa order nếu chưa PAID
                    if (order != null && order.getStatus() != OrderStatus.PAID) {
                        try {
                            orderService.delete(order);
                        } catch (Exception deleteEx) {
                            log.error("Failed to delete order after PIN validation error: {}", deleteEx.getMessage());
                        }
                    }
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("Vui lòng nhập mã PIN để xác thực thanh toán", null));
                }
                
                // Validate PIN format (6 digits)
                String trimmedPin = pinFromRequest.trim();
                if (trimmedPin.length() != 6 || !trimmedPin.matches("^\\d{6}$")) {
                    log.warn("Wallet payment - PIN format invalid for user {}: length={}, isDigits={}", 
                        finalUser.getUserId(), trimmedPin.length(), trimmedPin.matches("^\\d+$"));
                    // Xóa order nếu chưa PAID
                    if (order != null && order.getStatus() != OrderStatus.PAID) {
                        try {
                            orderService.delete(order);
                        } catch (Exception deleteEx) {
                            log.error("Failed to delete order after PIN format validation error: {}", deleteEx.getMessage());
                        }
                    }
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("Mã PIN phải có đúng 6 chữ số", null));
                }
                
                log.info("Wallet payment - Verifying PIN for user {}", finalUser.getUserId());
                
                // Xác thực PIN
                try {
                    VerifyPinRequestDTO verifyRequest = new VerifyPinRequestDTO();
                    verifyRequest.setPin(trimmedPin); // Sử dụng PIN đã được trim và validate
                    log.info("Wallet payment - Calling verifyPin for user {}", finalUser.getUserId());
                    // verifyPin() sẽ throw exception nếu PIN sai, return true nếu đúng
                    boolean isValid = walletPinService.verifyPin(finalUser.getUserId(), verifyRequest);
                    // Nếu đến đây được, PIN đã đúng
                    log.info("PIN verified successfully for user {} for order {}", finalUser.getUserId(), order.getOrderId());
                } catch (IllegalArgumentException | IllegalStateException e) {
                    // PIN sai hoặc bị lock
                    log.warn("PIN verification failed for user {}: {}", finalUser.getUserId(), e.getMessage());
                    log.info("Error message to return: {}", e.getMessage());
                    
                    // Xóa order nếu chưa PAID
                    if (order != null && order.getStatus() != OrderStatus.PAID) {
                        try {
                            orderService.delete(order);
                        } catch (Exception deleteEx) {
                            log.error("Failed to delete order after PIN validation error: {}", deleteEx.getMessage());
                        }
                    }
                    
                    // Đảm bảo error message được truyền đúng
                    String errorMsg = e.getMessage();
                    log.info("Returning error response with message: {}", errorMsg);
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse(errorMsg, null));
                }
            } else {
                // User chưa có PIN, yêu cầu tạo PIN trước
                // Xóa order nếu chưa PAID
                if (order != null && order.getStatus() != OrderStatus.PAID) {
                    try {
                        orderService.delete(order);
                    } catch (Exception deleteEx) {
                        log.error("Failed to delete order after PIN check error: {}", deleteEx.getMessage());
                    }
                }
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Bạn chưa có mã PIN. Vui lòng tạo mã PIN trước khi thanh toán bằng ví Cinesmart.", null));
            }

            // Trừ tiền từ ví Cinesmart (sau khi đã xác thực PIN thành công)
            try {
                log.info("Debiting {} from wallet for user {} for order {}", request.getAmount(), finalUser.getUserId(), order.getOrderId());
                walletService.debit(
                    finalUser.getUserId(),
                    request.getAmount(),
                    "Thanh toán đơn hàng #" + order.getOrderId(),
                    "ORDER-" + order.getOrderId()
                );
                walletDebited = true;
                log.info("Successfully debited {} from wallet for order {}", request.getAmount(), order.getOrderId());
            } catch (IllegalStateException e) {
                log.error("Insufficient wallet balance for user {}: {}", finalUser.getUserId(), e.getMessage());
                // Số dư không đủ - xóa order và trả về lỗi
                if (order != null) {
                    try {
                        orderService.delete(order);
                    } catch (Exception deleteEx) {
                        log.error("Failed to delete order after insufficient balance: {}", deleteEx.getMessage());
                    }
                }
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Số dư ví Cinesmart không đủ. Vui lòng nạp thêm tiền.", null));
            } catch (Exception e) {
                log.error("Error debiting wallet for order {}: {}", order.getOrderId(), e.getMessage(), e);
                throw e; // Re-throw để được catch ở outer catch block
            }

            // Đánh dấu đơn hàng đã thanh toán thành công
            try {
                log.info("Marking order {} as PAID", order.getOrderId());
                order.setVnpPayDate(now);
                order.setStatus(OrderStatus.PAID);
                order.setVnpResponseCode("00");
                order.setVnpTransactionStatus("WALLET_SUCCESS");
                order = orderService.save(order);
                log.info("Order {} marked as PAID successfully", order.getOrderId());
            } catch (Exception e) {
                log.error("Error marking order {} as PAID: {}", order.getOrderId(), e.getMessage(), e);
                throw e; // Re-throw để được catch ở outer catch block và refund
            }

            // Xóa voucher khỏi danh sách của user
            try {
                removeVoucherFromUser(order);
            } catch (Exception e) {
                log.error("Error removing voucher: {}", e.getMessage());
                // Không fail payment nếu xóa voucher lỗi
            }

            // Gửi notification và email
            try {
                String totalAmountStr = order.getTotalAmount()
                    .setScale(0, RoundingMode.HALF_UP)
                    .toPlainString() + " VND";
                notificationService.notifyOrderSuccess(
                    order.getUser().getUserId(),
                    order.getOrderId(),
                    totalAmountStr
                );

                Optional<Order> orderWithDetails = orderRepository.findByIdWithDetails(order.getOrderId());
                if (orderWithDetails.isPresent()) {
                    emailService.sendBookingConfirmationEmail(orderWithDetails.get());
                }
            } catch (Exception e) {
                log.error("Error sending notification/email: {}", e.getMessage());
                // Không fail payment nếu notification lỗi
            }

            Map<String, Object> data = new HashMap<>();
            data.put("orderId", order.getOrderId());
            data.put("txnRef", txnRef);
            data.put("status", "PAID");
            data.put("paymentMethod", "WALLET");

            return ResponseEntity.ok(createSuccessResponse("Thanh toán bằng ví Cinesmart thành công", data));
        } catch (IllegalStateException | IllegalArgumentException ex) {
            log.error("Failed to create wallet payment: {}", ex.getMessage(), ex);
            // Nếu đã trừ tiền nhưng order chưa được đánh dấu PAID, refund lại
            if (walletDebited && order != null && order.getStatus() != OrderStatus.PAID && finalUser != null) {
                try {
                    log.info("Attempting to refund {} to user {} for order {}", request.getAmount(), finalUser.getUserId(), order.getOrderId());
                    walletService.credit(
                        finalUser.getUserId(),
                        request.getAmount(),
                        "Hoàn tiền do lỗi thanh toán đơn hàng #" + order.getOrderId(),
                        "REFUND-ORDER-" + order.getOrderId()
                    );
                    log.info("Refunded amount {} to user {} due to payment error", request.getAmount(), finalUser.getUserId());
                } catch (Exception refundEx) {
                    log.error("Failed to refund wallet payment: {}", refundEx.getMessage(), refundEx);
                }
            }
            // Xóa order nếu đã tạo và chưa PAID
            if (order != null && order.getStatus() != OrderStatus.PAID) {
                try {
                    log.info("Deleting order {} due to payment error", order.getOrderId());
                    orderService.delete(order);
                } catch (Exception deleteEx) {
                    log.error("Failed to delete order after error: {}", deleteEx.getMessage(), deleteEx);
                }
            }
            String errorMessage = ex.getMessage() != null ? ex.getMessage() : "Không thể thanh toán bằng ví Cinesmart";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(errorMessage, null));
        } catch (Exception ex) {
            log.error("Unexpected error while creating wallet payment", ex);
            // Nếu đã trừ tiền nhưng order chưa được đánh dấu PAID, refund lại
            if (walletDebited && order != null && order.getStatus() != OrderStatus.PAID && finalUser != null) {
                try {
                    log.info("Attempting to refund {} to user {} for order {}", request.getAmount(), finalUser.getUserId(), order.getOrderId());
                    walletService.credit(
                        finalUser.getUserId(),
                        request.getAmount(),
                        "Hoàn tiền do lỗi thanh toán đơn hàng #" + order.getOrderId(),
                        "REFUND-ERROR-" + System.currentTimeMillis()
                    );
                    log.info("Refunded amount {} to user {} due to unexpected error", request.getAmount(), finalUser.getUserId());
                } catch (Exception refundEx) {
                    log.error("Failed to refund wallet payment: {}", refundEx.getMessage(), refundEx);
                }
            }
            // Xóa order nếu đã tạo và chưa PAID
            if (order != null && order.getStatus() != OrderStatus.PAID) {
                try {
                    log.info("Deleting order {} due to unexpected error", order.getOrderId());
                    orderService.delete(order);
                } catch (Exception deleteEx) {
                    log.error("Failed to delete order after error: {}", deleteEx.getMessage(), deleteEx);
                }
            }
            String errorMessage = ex.getMessage() != null ? ex.getMessage() : "Không thể thanh toán bằng ví. Vui lòng thử lại.";
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(errorMessage, null));
        }
    }

    // ==================== Helper Methods ====================
    
    /**
     * Map PaymentMethod enum to display name
     */
    private String mapPaymentMethodToName(PaymentMethod paymentMethod) {
        if (paymentMethod == null) return "Chưa xác định";
        return switch (paymentMethod) {
            case MOMO -> "MoMo";
            case ZALOPAY -> "ZaloPay";
            case VNPAY -> "VNPay";
            case WALLET -> "Ví Cinesmart";
            default -> paymentMethod.name();
        };
    }
    
    /**
     * Send top-up confirmation email
     */
    private void sendTopUpEmail(Order order, WalletTransaction transaction, PaymentMethod paymentMethod) {
        try {
            String userEmail = order.getUser().getEmail();
            String userName = order.getUser() instanceof Customer 
                    ? ((Customer) order.getUser()).getName() 
                    : order.getUser().getUsername();
            BigDecimal amount = order.getTotalAmount();
            BigDecimal newBalance = transaction.getBalanceAfter();
            String txnRef = transaction.getReferenceCode() != null 
                    ? transaction.getReferenceCode() 
                    : "TOPUP-" + order.getOrderId();
            LocalDateTime transactionTime = transaction.getCreatedAt() != null 
                    ? transaction.getCreatedAt() 
                    : LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            String paymentMethodName = mapPaymentMethodToName(paymentMethod);
            
            emailService.sendTopUpConfirmationEmail(
                    userEmail, userName, amount, newBalance, 
                    txnRef, transactionTime, paymentMethodName);
            System.out.println("Top-up confirmation email sent to: " + userEmail);
        } catch (Exception e) {
            System.err.println("Error sending top-up email: " + e.getMessage());
            e.printStackTrace();
            // Không fail nếu email lỗi
        }
    }

    private void checkMomoStatusAndUpdateOrder(Order order) {
        try {
            System.out.println("Checking MoMo status for Order ID: " + order.getOrderId() + ", TxnRef: " + order.getVnpTxnRef());
            Map<String, Object> response = momoService.queryTransaction(order.getVnpTxnRef());
            System.out.println("MoMo Query Response: " + response);
            
            if (response != null) {
                Object resultCodeObj = response.get("resultCode");
                int resultCode = resultCodeObj != null ? Integer.parseInt(resultCodeObj.toString()) : -1;
                
                if (resultCode == 0) {
                    System.out.println("MoMo status SUCCESS. Updating order...");
                    // Success
                    order.setVnpPayDate(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
                    order.setStatus(OrderStatus.PAID);
                    
                    String transId = (String) response.get("transId");
                    if (transId != null) order.setVnpTransactionNo(transId);
                    
                    Order savedOrder = orderService.save(order);
                    orderRepository.flush(); // Force commit
                    System.out.println("Order saved with PayDate: " + savedOrder.getVnpPayDate());
                    
                    // QUAN TRỌNG: Reload order với đầy đủ details để tránh LazyInitializationException
                    Optional<Order> reloadedOrderOpt = orderRepository.findByIdWithDetails(order.getOrderId());
                    if (reloadedOrderOpt.isEmpty()) {
                        System.err.println("MoMo Status Check - Could not reload order with details for ID: " + order.getOrderId());
                        return;
                    }
                    Order fullOrder = reloadedOrderOpt.get();
                    System.out.println("MoMo Status Check - Reloaded order ID: " + fullOrder.getOrderId() + 
                                       ", isTopUp: " + fullOrder.getIsTopUp() + 
                                       ", orderInfo: " + fullOrder.getOrderInfo() +
                                       ", userId: " + (fullOrder.getUser() != null ? fullOrder.getUser().getUserId() : "NULL"));
                    
                    // Kiểm tra isTopUp - nếu là top-up thì credit vào wallet
                    boolean isTopUpOrder = Boolean.TRUE.equals(fullOrder.getIsTopUp());
                    if (!isTopUpOrder && fullOrder.getOrderInfo() != null && fullOrder.getOrderInfo().toLowerCase().contains("nạp tiền")) {
                        System.out.println("MoMo Status Check - Setting isTopUp = true based on orderInfo");
                        fullOrder.setIsTopUp(true);
                        orderService.save(fullOrder);
                        isTopUpOrder = true;
                    }
                    
                    if (isTopUpOrder) {
                        // Credit vào wallet cho top-up order (với idempotency check)
                        System.out.println("MoMo Status Check - Processing top-up order, will credit wallet for order ID: " + fullOrder.getOrderId());
                        try {
                            if (fullOrder.getUser() == null) {
                                System.err.println("MoMo Status Check - User is NULL for order ID: " + fullOrder.getOrderId());
                                return;
                            }
                            Long userId = fullOrder.getUser().getUserId();
                            BigDecimal amount = fullOrder.getTotalAmount();
                            String note = fullOrder.getOrderInfo() != null && !fullOrder.getOrderInfo().isEmpty()
                                    ? fullOrder.getOrderInfo()
                                    : "Nạp tiền vào ví Cinesmart";
                            String txnRefPattern = "TOPUP-" + fullOrder.getOrderId() + "%";
                            
                            // Kiểm tra xem đã credit chưa
                            boolean alreadyCredited = walletTransactionRepository.existsByUserIdAndReferenceCodePattern(userId, txnRefPattern);
                            if (alreadyCredited) {
                                System.out.println("MoMo Status Check - Wallet already credited for order: " + fullOrder.getOrderId());
                            } else {
                                String txnRef = "TOPUP-" + fullOrder.getOrderId() + "-" + System.currentTimeMillis();
                                System.out.println("MoMo Status Check - Crediting wallet: userId=" + userId + ", amount=" + amount + ", note=" + note);
                                WalletTransaction transaction = walletService.credit(userId, amount, note, txnRef);
                                System.out.println("MoMo Status Check - Successfully credited " + amount + " to wallet for top-up order ID: " + fullOrder.getOrderId());
                                
                                // Gửi notification
                                try {
                                    String amountStr = amount.setScale(0, RoundingMode.HALF_UP).toPlainString() + " VND";
                                    notificationService.notifyTopUpSuccess(userId, fullOrder.getOrderId(), amountStr);
                                    System.out.println("MoMo Status Check - Top-up notification sent for order: " + fullOrder.getOrderId());
                                } catch (Exception notifEx) {
                                    System.err.println("MoMo Status Check - Error sending notification: " + notifEx.getMessage());
                                }
                                
                                // Gửi email xác nhận nạp tiền thành công
                                sendTopUpEmail(fullOrder, transaction, PaymentMethod.MOMO);
                            }
                        } catch (Exception e) {
                            System.err.println("MoMo Status Check - Error crediting wallet for top-up order: " + e.getMessage());
                            e.printStackTrace();
                        }
                    } else {
                        System.out.println("MoMo Status Check - NOT a top-up order, processing as regular order");
                        // Xóa voucher khỏi danh sách của user khi thanh toán thành công (chỉ cho order thường)
                        removeVoucherFromUser(fullOrder);
                        
                        // Send Notif & Email cho order thường
                        try {
                             String totalAmountStr = fullOrder.getTotalAmount()
                                .setScale(0, RoundingMode.HALF_UP)
                                .toPlainString() + " VND";
                         
                             System.out.println("Triggering notification for Order " + fullOrder.getOrderId());
                         notificationService.notifyOrderSuccess(
                                    fullOrder.getUser().getUserId(),
                                    fullOrder.getOrderId(),
                                totalAmountStr
                         );
                         
                             System.out.println("Sending email for Order " + fullOrder.getOrderId());
                             emailService.sendBookingConfirmationEmail(fullOrder);
                    } catch (Exception e) {
                        e.printStackTrace();
                        }
                    }
                } else {
                    System.out.println("MoMo status not success. ResultCode: " + resultCode);
                }
            }
        } catch (Exception e) {
            log.error("Error checking MoMo status: {}", e.getMessage());
            e.printStackTrace();
        }
    }

    private Map<String, Object> createSuccessResponse(String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("data", data);
        return response;
    }

    private Map<String, Object> createErrorResponse(String message, BindingResult bindingResult) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        if (bindingResult != null) {
            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));
            response.put("errors", errors);
        }
        return response;
    }

    private Map<String, Object> createMomoIpnResponse(int code, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("resultCode", code);
        response.put("message", message);
        return response;
    }

    private Optional<User> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username);
    }

    private String buildOrderInfo(CreatePaymentRequest request) {
        if (request.getOrderDescription() != null && !request.getOrderDescription().isBlank()) {
            return request.getOrderDescription();
        }
        return "Thanh toán đơn hàng tại Cinesmart";
    }
    
    /**
     * Xóa voucher khỏi danh sách voucher của user khi thanh toán thành công
     * Chỉ xóa nếu order có voucher và user là Customer
     */
    private void removeVoucherFromUser(Order order) {
        if (order.getVoucher() == null) {
            return; // Không có voucher, không cần xóa
        }
        
        User user = order.getUser();
        if (!(user instanceof Customer)) {
            return; // Chỉ xóa voucher cho Customer
        }
        
        try {
            Long userId = user.getUserId();
            Voucher voucher = order.getVoucher();
            
            // Load customer với vouchers để có thể xóa
            Optional<Customer> customerWithVouchersOpt = customerRepository.findByIdWithVouchers(userId);
            if (customerWithVouchersOpt.isPresent()) {
                Customer customerWithVouchers = customerWithVouchersOpt.get();
                if (customerWithVouchers.getVouchers() != null) {
                    // Xóa voucher khỏi danh sách
                    boolean removed = customerWithVouchers.getVouchers().removeIf(
                        v -> v.getVoucherId().equals(voucher.getVoucherId())
                    );
                    
                    if (removed) {
                        // Lưu customer để cập nhật relationship
                        customerRepository.save(customerWithVouchers);
                        System.out.println("Removed voucher " + voucher.getCode() + " from user " + userId + " vouchers list (payment successful)");
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error removing voucher from user: " + e.getMessage());
            e.printStackTrace();
            // Không fail payment flow nếu xóa voucher lỗi
        }
    }
}
