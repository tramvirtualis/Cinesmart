package com.example.backend.services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dtos.CancelOrderResponseDTO;
import com.example.backend.dtos.CancellationValidationFact;
import com.example.backend.dtos.OrderComboDTO;
import com.example.backend.dtos.OrderItemDTO;
import com.example.backend.dtos.OrderResponseDTO;
import com.example.backend.dtos.PriceDTO;
import com.example.backend.entities.CinemaComplex;
import com.example.backend.entities.CinemaRoom;
import com.example.backend.entities.Customer;
import com.example.backend.entities.FoodCombo;
import com.example.backend.entities.Movie;
import com.example.backend.entities.MovieVersion;
import com.example.backend.entities.Order;
import com.example.backend.entities.OrderCombo;
import com.example.backend.entities.Seat;
import com.example.backend.entities.Showtime;
import com.example.backend.entities.WalletTransaction;
import com.example.backend.entities.enums.OrderStatus;
import com.example.backend.entities.enums.PaymentMethod;
import com.example.backend.entities.enums.SeatType;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.OrderRepository;
import com.example.backend.services.NotificationService;

import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieSession;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private static final int MONTHLY_CANCELLATION_LIMIT = 2;
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepository orderRepository;
    private final PriceService priceService;
    private final MomoService momoService;
    private final WalletService walletService;
    private final KieContainer kieContainer;
    private final com.example.backend.repositories.CustomerRepository customerRepository;
    @Lazy
    private final NotificationService notificationService; // Dùng @Lazy để tránh circular dependency
    @Lazy
    private final LoyaltyService loyaltyService;
    private final CustomerSpendingService customerSpendingService;

    // ==================== Methods from HEAD (for getting orders)
    // ====================

    @Transactional
    public List<OrderResponseDTO> getOrdersByUser(Long userId) {
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(userId);
        System.out.println("Found " + orders.size() + " total orders for user " + userId);
        LocalDateTime now = LocalDateTime.now(DEFAULT_ZONE);
        int cancellationsUsed = (int) getMonthlyCancellationCount(userId);
        int monthlyLimit = getMonthlyCancellationLimitByUserId(userId);
        int cancellationRemaining = Math.max(0, monthlyLimit - cancellationsUsed);

        // Self-healing: Check MoMo status for pending orders
        for (Order order : orders) {
            normalizeOrderStatus(order);
            if (order.getVnpPayDate() == null && order.getPaymentMethod() == PaymentMethod.MOMO) {
                try {
                    System.out.println("Self-healing: Checking MoMo status for pending order " + order.getOrderId());
                    Map<String, Object> response = momoService.queryTransaction(order.getVnpTxnRef());
                    if (response != null) {
                        Object resultCodeObj = response.get("resultCode");
                        int resultCode = resultCodeObj != null ? Integer.parseInt(resultCodeObj.toString()) : -1;

                        System.out.println("Self-healing: MoMo Check for Order " + order.getOrderId() + " ("
                                + order.getVnpTxnRef() + ") returned resultCode: " + resultCode);

                        if (resultCode == 0) {
                            System.out.println(
                                    "Self-healing: MoMo confirmed SUCCESS. Updating order " + order.getOrderId());
                            order.setVnpPayDate(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));

                            String transId = (String) response.get("transId");
                            if (transId != null)
                                order.setVnpTransactionNo(transId);

                            orderRepository.save(order);
                            // Không gửi notification/email ở đây để tránh duplicate và circular dependency
                            // Chỉ cần update DB để hiển thị trong history
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Self-healing failed for order " + order.getOrderId() + ": " + e.getMessage());
                }
            }
        }

        List<OrderResponseDTO> result = orders.stream()
                // Chỉ lấy các order đã thanh toán thành công (có vnpPayDate) và không phải top-up
                .filter(order -> {
                    boolean isPaid = order.getVnpPayDate() != null;
                    boolean isTopUp = Boolean.TRUE.equals(order.getIsTopUp());
                    if (!isPaid) {
                        System.out.println("Filtering out unpaid order ID: " + order.getOrderId());
                    }
                    if (isTopUp) {
                        System.out.println("Filtering out top-up order ID: " + order.getOrderId());
                    }
                    return isPaid && !isTopUp;
                })
                .map(order -> {
                    OrderResponseDTO dto = mapToDTO(order);
                    dto.setMonthlyCancellationLimit(monthlyLimit);
                    dto.setMonthlyCancellationUsed(cancellationsUsed);
                    dto.setMonthlyCancellationRemaining(Math.max(0, cancellationRemaining));
                    dto.setCancellable(cancellationRemaining > 0 && canCancel(order, now));
                    return dto;
                })
                .collect(Collectors.toList());

        System.out.println("Returning " + result.size() + " paid orders");
        return result;
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getAllOrders() {
        List<Order> orders = orderRepository.findAllWithDetails();
        orders.forEach(this::normalizeOrderStatus);
        return orders.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<OrderResponseDTO> getOrderById(Long orderId) {
        return orderRepository.findByIdWithDetails(orderId)
                .map(order -> {
                    normalizeOrderStatus(order);
                    return mapToDTO(order);
                });
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getOrdersByComplexId(Long complexId) {
        List<Order> orders = orderRepository.findByCinemaComplexIdWithDetails(complexId);
        orders.forEach(this::normalizeOrderStatus);
        return orders.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private OrderResponseDTO mapToDTO(Order order) {
        // Map tickets to items
        List<OrderItemDTO> items = order.getTickets().stream()
                .map(ticket -> {
                    Showtime showtime = ticket.getShowtime();
                    Seat seat = ticket.getSeat();
                    MovieVersion movieVersion = showtime.getMovieVersion();
                    Movie movie = movieVersion.getMovie();
                    CinemaRoom room = showtime.getCinemaRoom();
                    CinemaComplex cinema = room.getCinemaComplex();

                    OrderItemDTO item = new OrderItemDTO();
                    item.setTicketId(ticket.getTicketId());
                    item.setMovieId(movie.getMovieId());
                    item.setMovieTitle(movie.getTitle());
                    item.setMoviePoster(movie.getPoster());
                    item.setCinemaComplexId(cinema.getComplexId());
                    item.setCinemaComplexName(cinema.getName());
                    item.setCinemaAddress(cinema.getAddress() != null
                            ? (cinema.getAddress().getProvince() != null
                                    ? cinema.getAddress().getDescription() + ", " + cinema.getAddress().getProvince()
                                    : cinema.getAddress().getDescription())
                            : "");
                    item.setRoomId(room.getRoomId());
                    item.setRoomName(room.getRoomName());
                    item.setRoomType(mapRoomType(movieVersion.getRoomType()));
                    item.setShowtimeId(showtime.getShowtimeId());
                    item.setShowtimeStart(showtime.getStartTime());
                    item.setShowtimeEnd(showtime.getEndTime());
                    item.setSeatId(seat.getSeatRow() + seat.getSeatColumn());
                    item.setSeatRow(seat.getSeatRow());
                    item.setSeatColumn(seat.getSeatColumn());
                    item.setPrice(ticket.getPrice());

                    // Calculate basePrice - lấy giá gốc từ database dựa trên roomType + seatType
                    try {
                        PriceDTO priceDTO = priceService.getPriceByRoomTypeAndSeatType(
                                movieVersion.getRoomType(),
                                seat.getType());

                        if (priceDTO != null) {
                            java.math.BigDecimal basePrice = priceDTO.getPrice();
                            item.setBasePrice(basePrice);
                        } else {
                            // Nếu không tìm thấy giá trong database, giả sử giá hiện tại là basePrice
                            item.setBasePrice(ticket.getPrice());
                        }
                    } catch (Exception e) {
                        // Nếu có lỗi, sử dụng giá hiện tại
                        item.setBasePrice(ticket.getPrice());
                    }

                    return item;
                })
                .collect(Collectors.toList());

        // Map order combos - load orderCombos lazily to avoid MultipleBagFetchException
        // Initialize orderCombos collection to trigger lazy loading
        if (order.getOrderCombos() != null) {
            order.getOrderCombos().size(); // Trigger lazy loading
        }

        List<OrderComboDTO> combos = order.getOrderCombos() != null
                ? order.getOrderCombos().stream()
                        .map(oc -> {
                            // Reference đến FoodCombo gốc
                            if (oc.getFoodCombo() != null) {
                                FoodCombo fc = oc.getFoodCombo();
                                OrderComboDTO combo = new OrderComboDTO();
                                combo.setComboId(fc.getFoodComboId());
                                combo.setComboName(fc.getName());
                                combo.setComboImage(fc.getImage());
                                combo.setQuantity(oc.getQuantity());
                                combo.setPrice(oc.getPrice());
                                return combo;
                            }
                            return null;
                        })
                        .filter(combo -> combo != null)
                        .collect(Collectors.toList())
                : List.of();

        OrderResponseDTO dto = new OrderResponseDTO();
        dto.setOrderId(order.getOrderId());
        dto.setOrderDate(order.getOrderDate());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setPaymentMethod(mapPaymentMethod(order.getPaymentMethod()));
        dto.setStatus(order.getStatus() != null ? order.getStatus().name() : null);
        dto.setItems(items);
        dto.setCombos(combos);
        dto.setVoucherCode(order.getVoucher() != null
                ? order.getVoucher().getCode()
                : null);
        // Set cinemaComplexId từ Order entity (cho đơn hàng chỉ có đồ ăn)
        // Với đơn hàng có vé phim, có thể lấy từ items[0].cinemaComplexId
        dto.setCinemaComplexId(order.getCinemaComplexId());
        // Set user info
        if (order.getUser() != null) {
            dto.setUserId(order.getUser().getUserId());
            dto.setUserEmail(order.getUser().getEmail());
            dto.setUserPhone(order.getUser().getPhone());
            // Get user name if Customer
            if (order.getUser() instanceof com.example.backend.entities.Customer) {
                com.example.backend.entities.Customer customer = (com.example.backend.entities.Customer) order
                        .getUser();
                dto.setUserName(customer.getName());
            } else {
                dto.setUserName(order.getUser().getUsername());
            }
        }
        dto.setCancelledAt(order.getCancelledAt());
        dto.setRefundAmount(order.getRefundAmount());
        dto.setCancellationReason(order.getCancellationReason());
        dto.setRefundedToWallet(order.getRefundedToWallet());
        dto.setIsTopUp(order.getIsTopUp());
        return dto;
    }

    private String mapRoomType(com.example.backend.entities.enums.RoomType roomType) {
        if (roomType == null)
            return "STANDARD";
        return roomType.name().replace("TYPE_", "");
    }

    private String mapPaymentMethod(com.example.backend.entities.enums.PaymentMethod paymentMethod) {
        if (paymentMethod == null)
            return null;
        // Map enum to Vietnamese display name
        return switch (paymentMethod) {
            case VNPAY -> "VNPay";
            case MOMO -> "MoMo";
            case ZALOPAY -> "ZaloPay";
            default -> paymentMethod.name();
        };
    }

    @Transactional
    public CancelOrderResponseDTO cancelOrder(Long userId, Long orderId, String reason) {
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        if (order.getUser() == null || !order.getUser().getUserId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền hủy đơn hàng này");
        }

        normalizeOrderStatus(order);

        LocalDateTime now = LocalDateTime.now(DEFAULT_ZONE);
        long cancellationsThisMonth = getMonthlyCancellationCount(userId);
        int monthlyLimit = getMonthlyCancellationLimitByUserId(userId);
        
        // Get earliest showtime for validation
        LocalDateTime earliestShowtime = null;
        if (order.getTickets() != null && !order.getTickets().isEmpty()) {
            earliestShowtime = order.getTickets().stream()
                    .map(ticket -> ticket.getShowtime() != null ? ticket.getShowtime().getStartTime() : null)
                    .filter(start -> start != null)
                    .min(LocalDateTime::compareTo)
                    .orElse(null);
        }

        // Validate cancellation using Drools
        CancellationValidationFact fact = CancellationValidationFact.builder()
                .orderId(order.getOrderId())
                .userId(userId)
                .orderDate(order.getOrderDate())
                .paymentDate(order.getVnpPayDate())
                .earliestShowtime(earliestShowtime)
                .currentTime(now)
                .orderStatus(order.getStatus() != null ? order.getStatus().name() : null)
                .totalAmount(order.getTotalAmount())
                .monthlyCancellationCount(cancellationsThisMonth)
                .monthlyCancellationLimit(monthlyLimit)
                .admin(false)
                .build();

        KieSession kieSession = kieContainer.newKieSession();
        try {
            kieSession.insert(fact);
            kieSession.fireAllRules();
        } finally {
            kieSession.dispose();
        }

        // Check validation result
        if (!fact.isCanCancel()) {
            throw new RuntimeException(fact.getErrorMessage() != null 
                    ? fact.getErrorMessage() 
                    : "Không thể hủy đơn hàng này");
        }

        BigDecimal refundAmount = fact.getRefundAmount() != null 
                ? fact.getRefundAmount() 
                : (order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
        
        String normalizedReason = (reason == null || reason.isBlank())
                ? "Khách hàng chủ động hủy đơn"
                : reason.trim();

        WalletTransaction transaction = walletService.credit(
                userId,
                refundAmount,
                "Hoàn tiền hủy đơn #" + order.getOrderId(),
                "ORDER-" + order.getOrderId());

        // Retrieve and deduct any cashback received from this order
        BigDecimal cashbackToDeduct = loyaltyService.retrieveCashbackForCancelledOrder(userId, order.getOrderId());
        if (cashbackToDeduct.compareTo(BigDecimal.ZERO) > 0) {
            try {
                walletService.debit(userId, cashbackToDeduct, 
                        "Lấy lại hoàn tiền hạng cho đơn #" + order.getOrderId(), 
                        "CASHBACK-CLAWBACK-" + order.getOrderId());
                log.info("Deducted cashback {} for cancelled order {} from user {}", 
                        cashbackToDeduct, order.getOrderId(), userId);
            } catch (Exception e) {
                log.warn("Unable to debit cashback for cancelled order {}: {}", 
                        order.getOrderId(), e.getMessage());
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(now);
        order.setCancellationReason(normalizedReason);
        order.setRefundAmount(refundAmount);
        order.setRefundedToWallet(Boolean.TRUE);
        orderRepository.save(order);

        // Recalculate customer's tier and spending after cancellation
        try {
            loyaltyService.recalculateTierAfterCancellation(userId);
        } catch (Exception e) {
            log.error("Error recalculating tier after order cancellation: {}", e.getMessage());
        }

        // Gửi thông báo hủy đơn thành công
        try {
            String refundAmountStr = refundAmount.setScale(0, java.math.RoundingMode.HALF_UP).toPlainString() + " VND";
            notificationService.notifyOrderCancelled(userId, order.getOrderId(), refundAmountStr);
        } catch (Exception e) {
            // Log error but don't fail the cancellation
            log.error("Error sending cancellation notification for order {}: {}", order.getOrderId(), e.getMessage());
        }

        // Restore voucher to customer's saved list if order had a voucher
        if (order.getVoucher() != null && order.getUser() != null && order.getUser() instanceof Customer) {
            try {
                Customer customer = (Customer) order.getUser();
                Long voucherId = order.getVoucher().getVoucherId();
                
                log.info("Attempting to restore voucher {} for customer {} after order {} cancellation", 
                        voucherId, customer.getUserId(), order.getOrderId());
                
                // Load customer with vouchers
                Optional<Customer> customerOpt = customerRepository.findByIdWithVouchers(customer.getUserId());
                if (customerOpt.isPresent()) {
                    Customer customerWithVouchers = customerOpt.get();
                    if (customerWithVouchers.getVouchers() == null) {
                        customerWithVouchers.setVouchers(new java.util.ArrayList<>());
                    }
                    
                    // Check if voucher is already in the list
                    boolean alreadyExists = customerWithVouchers.getVouchers().stream()
                            .anyMatch(v -> v.getVoucherId().equals(voucherId));
                    
                    // Only restore if not already in list (was removed when payment succeeded)
                    if (!alreadyExists) {
                        customerWithVouchers.getVouchers().add(order.getVoucher());
                        customerRepository.save(customerWithVouchers);
                        log.info("Successfully restored voucher {} to customer {} after order {} cancellation", 
                                voucherId, customer.getUserId(), order.getOrderId());
                    } else {
                        log.info("Voucher {} already exists in customer {} saved list, skipping restore", 
                                voucherId, customer.getUserId());
                    }
                } else {
                    log.warn("Customer {} not found when trying to restore voucher {}", customer.getUserId(), voucherId);
                }
            } catch (Exception e) {
                // Log error but don't fail the cancellation
                log.error("Error restoring voucher for cancelled order {}: {}", order.getOrderId(), e.getMessage(), e);
            }
        } else {
            if (order.getVoucher() == null) {
                log.debug("Order {} has no voucher, skipping restore", order.getOrderId());
            } else if (order.getUser() == null) {
                log.warn("Order {} has no user, cannot restore voucher", order.getOrderId());
            } else if (!(order.getUser() instanceof Customer)) {
                log.warn("Order {} user is not a Customer, cannot restore voucher", order.getOrderId());
            }
        }

        int used = (int) (cancellationsThisMonth + 1);

        return CancelOrderResponseDTO.builder()
                .orderId(order.getOrderId())
                .status(order.getStatus().name())
                .refundAmount(refundAmount)
                .cancelledAt(order.getCancelledAt())
                .walletBalance(transaction.getBalanceAfter())
                .monthlyCancellationLimit(monthlyLimit)
                .monthlyCancellationUsed(used)
                .build();
    }

    @Transactional
    public CancelOrderResponseDTO cancelOrderAdmin(Long orderId, String reason) {
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        normalizeOrderStatus(order);

        LocalDateTime now = LocalDateTime.now(DEFAULT_ZONE);
        
        // Get earliest showtime for validation
        LocalDateTime earliestShowtime = null;
        if (order.getTickets() != null && !order.getTickets().isEmpty()) {
            earliestShowtime = order.getTickets().stream()
                    .map(ticket -> ticket.getShowtime() != null ? ticket.getShowtime().getStartTime() : null)
                    .filter(start -> start != null)
                    .min(LocalDateTime::compareTo)
                    .orElse(null);
        }

        // Validate cancellation using Drools (Admin bypasses monthly limit)
        CancellationValidationFact fact = CancellationValidationFact.builder()
                .orderId(order.getOrderId())
                .userId(order.getUser() != null ? order.getUser().getUserId() : null)
                .orderDate(order.getOrderDate())
                .paymentDate(order.getVnpPayDate())
                .earliestShowtime(earliestShowtime)
                .currentTime(now)
                .orderStatus(order.getStatus() != null ? order.getStatus().name() : null)
                .totalAmount(order.getTotalAmount())
                .monthlyCancellationCount(0) // Not used for admin
                .monthlyCancellationLimit(MONTHLY_CANCELLATION_LIMIT) // Not used for admin
                .admin(true) // Admin bypasses monthly limit
                .build();

        KieSession kieSession = kieContainer.newKieSession();
        try {
            kieSession.insert(fact);
            kieSession.fireAllRules();
        } finally {
            kieSession.dispose();
        }

        // Check validation result
        if (!fact.isCanCancel()) {
            throw new RuntimeException(fact.getErrorMessage() != null 
                    ? fact.getErrorMessage() 
                    : "Không thể hủy đơn hàng này");
        }

        BigDecimal refundAmount = fact.getRefundAmount() != null 
                ? fact.getRefundAmount() 
                : (order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
        
        String normalizedReason = (reason == null || reason.isBlank())
                ? "Admin hủy đơn hàng"
                : reason.trim();

        // Credit to user's wallet
        WalletTransaction transaction = walletService.credit(
                order.getUser().getUserId(),
                refundAmount,
                "Hoàn tiền hủy đơn #" + order.getOrderId() + " (Admin)",
                "ORDER-" + order.getOrderId());

        // Retrieve and deduct any cashback received from this order
        BigDecimal cashbackToDeduct = loyaltyService.retrieveCashbackForCancelledOrder(order.getUser().getUserId(), order.getOrderId());
        if (cashbackToDeduct.compareTo(BigDecimal.ZERO) > 0) {
            try {
                walletService.debit(order.getUser().getUserId(), cashbackToDeduct, 
                        "Lấy lại hoàn tiền hạng cho đơn #" + order.getOrderId() + " (Admin)", 
                        "CASHBACK-CLAWBACK-" + order.getOrderId());
                log.info("Deducted cashback {} for admin-cancelled order {} from user {}", 
                        cashbackToDeduct, order.getOrderId(), order.getUser().getUserId());
            } catch (Exception e) {
                log.warn("Unable to debit cashback for admin-cancelled order {}: {}", 
                        order.getOrderId(), e.getMessage());
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(now);
        order.setCancellationReason(normalizedReason);
        order.setRefundAmount(refundAmount);
        order.setRefundedToWallet(Boolean.TRUE);
        orderRepository.save(order);

        // Recalculate customer's tier and spending after cancellation
        try {
            loyaltyService.recalculateTierAfterCancellation(order.getUser().getUserId());
        } catch (Exception e) {
            log.error("Error recalculating tier after admin order cancellation: {}", e.getMessage());
        }

        return CancelOrderResponseDTO.builder()
                .orderId(order.getOrderId())
                .status(order.getStatus().name())
                .refundAmount(refundAmount)
                .cancelledAt(order.getCancelledAt())
                .walletBalance(transaction.getBalanceAfter())
                .monthlyCancellationLimit(MONTHLY_CANCELLATION_LIMIT)
                .monthlyCancellationUsed((int) getMonthlyCancellationCount(order.getUser().getUserId()))
                .build();
    }

    private void normalizeOrderStatus(Order order) {
        if (order.getStatus() != null) {
            return;
        }
        OrderStatus derivedStatus = order.getVnpPayDate() != null ? OrderStatus.PAID : OrderStatus.PENDING;
        order.setStatus(derivedStatus);
        try {
            orderRepository.save(order);
        } catch (Exception e) {
            log.warn("Không thể đồng bộ trạng thái cho order {}: {}", order.getOrderId(), e.getMessage());
        }
    }

    private boolean canCancel(Order order, LocalDateTime now) {
        if (order == null)
            return false;
        if (order.getVnpPayDate() == null)
            return false;
        if (order.getStatus() == OrderStatus.CANCELLED)
            return false;

        if (order.getTickets() != null && !order.getTickets().isEmpty()) {
            LocalDateTime earliestShowtime = order.getTickets().stream()
                    .map(ticket -> ticket.getShowtime() != null ? ticket.getShowtime().getStartTime() : null)
                    .filter(start -> start != null)
                    .min(LocalDateTime::compareTo)
                    .orElse(null);
            if (earliestShowtime != null && !earliestShowtime.isAfter(now)) {
                return false;
            }
        }
        return true;
    }

    private long getMonthlyCancellationCount(Long userId) {
        YearMonth currentMonth = YearMonth.now(DEFAULT_ZONE);
        LocalDate startDate = currentMonth.atDay(1);
        LocalDate endDate = currentMonth.atEndOfMonth();
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);
        return orderRepository.countByUserUserIdAndStatusAndCancelledAtBetween(
                userId,
                OrderStatus.CANCELLED,
                start,
                end);
    }

    @Transactional(readOnly = true)
    public int getMonthlyCancellationUsed(Long userId) {
        return (int) getMonthlyCancellationCount(userId);
    }

    public int getMonthlyCancellationLimitByUserId(Long userId) {
        return customerRepository.findById(userId)
                .map(customer -> loyaltyService.getCancellationLimit(customer.getTier()))
                .orElse(MONTHLY_CANCELLATION_LIMIT);
    }

    public int getMonthlyCancellationLimit() {
        return MONTHLY_CANCELLATION_LIMIT;
    }

    // ==================== Methods from origin/nhan (for MoMo payment)
    // ====================

    public Order save(Order order) {
        return orderRepository.save(order);
    }

    public Optional<Order> findByTxnRef(String txnRef) {
        return orderRepository.findByVnpTxnRef(txnRef);
    }

    public void delete(Order order) {
        orderRepository.delete(order);
    }

    /**
     * Lấy thống kê chi tiêu của user
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getExpenseStatistics(Long userId) {
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(userId);
        List<Order> paidOrders = customerSpendingService.filterEligibleSpendingOrders(orders);

        // Tính riêng tổng số tiền nạp vào ví
        List<Order> topUpOrders = orders.stream()
                .filter(order -> order.getVnpPayDate() != null)
                .filter(order -> Boolean.TRUE.equals(order.getIsTopUp()))
                .collect(Collectors.toList());

        BigDecimal totalTopUp = topUpOrders.stream()
                .map(customerSpendingService::calculateNetSpentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSpent = customerSpendingService.calculateTotalSpent(orders);
        BigDecimal last12MonthsSpent = customerSpendingService.calculateLast12MonthsSpent(orders);

        // Đếm tổng số vé (tổng số tickets)
        long totalTickets = paidOrders.stream()
                .mapToLong(order -> order.getTickets() != null ? order.getTickets().size() : 0)
                .sum();

        // Tính chi tiêu trung bình/vé
        BigDecimal averagePerTicket = totalTickets > 0
                ? totalSpent.divide(BigDecimal.valueOf(totalTickets), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Tính chi tiêu theo tháng
        LocalDate now = LocalDate.now();
        YearMonth currentMonth = YearMonth.from(now);
        YearMonth lastMonth = currentMonth.minusMonths(1);
        YearMonth threeMonthsAgo = currentMonth.minusMonths(3);

        LocalDate currentMonthStart = currentMonth.atDay(1);
        LocalDate currentMonthEnd = currentMonth.atEndOfMonth();
        LocalDate lastMonthStart = lastMonth.atDay(1);
        LocalDate lastMonthEnd = lastMonth.atEndOfMonth();
        LocalDate threeMonthsAgoStart = threeMonthsAgo.atDay(1);

        BigDecimal thisMonthSpent = sumSpentInDateRange(paidOrders, currentMonthStart, currentMonthEnd);
        BigDecimal lastMonthSpent = sumSpentInDateRange(paidOrders, lastMonthStart, lastMonthEnd);
        BigDecimal lastThreeMonthsSpent = sumSpentFromDate(paidOrders, threeMonthsAgoStart);

        long totalOrders = paidOrders.size();

        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalSpent", totalSpent);
        statistics.put("last12MonthsSpent", last12MonthsSpent);
        statistics.put("totalTickets", totalTickets);
        statistics.put("totalOrders", totalOrders);
        statistics.put("totalTopUp", totalTopUp);
        statistics.put("thisMonthSpent", thisMonthSpent);
        statistics.put("lastMonthSpent", lastMonthSpent);
        statistics.put("lastThreeMonthsSpent", lastThreeMonthsSpent);
        statistics.put("averagePerTicket", averagePerTicket);

        return statistics;
    }

    private BigDecimal sumSpentInDateRange(List<Order> paidOrders, LocalDate start, LocalDate end) {
        return paidOrders.stream()
                .filter(order -> {
                    if (order.getOrderDate() == null) {
                        return false;
                    }
                    LocalDate orderDate = order.getOrderDate().toLocalDate();
                    return !orderDate.isBefore(start) && !orderDate.isAfter(end);
                })
                .map(customerSpendingService::calculateNetSpentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumSpentFromDate(List<Order> paidOrders, LocalDate start) {
        return paidOrders.stream()
                .filter(order -> {
                    if (order.getOrderDate() == null) {
                        return false;
                    }
                    LocalDate orderDate = order.getOrderDate().toLocalDate();
                    return !orderDate.isBefore(start);
                })
                .map(customerSpendingService::calculateNetSpentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Update vnpPayDate cho các orders cũ (những orders đã có data nhưng chưa có
     * vnpPayDate)
     * Chỉ update các orders thực sự đã hoàn thành (có tickets hoặc orderCombos)
     */
    @Transactional
    public Map<String, Object> updateOldOrdersPayDate() {
        log.info("Starting to update vnpPayDate for old orders...");

        // Lấy tất cả orders chưa có vnpPayDate
        List<Order> ordersWithoutPayDate = orderRepository.findAll().stream()
                .filter(order -> order.getVnpPayDate() == null)
                .filter(order -> {
                    // Chỉ update các orders có tickets hoặc orderCombos (tức là orders thực sự đã
                    // hoàn thành)
                    boolean hasTickets = order.getTickets() != null && !order.getTickets().isEmpty();
                    boolean hasCombos = order.getOrderCombos() != null && !order.getOrderCombos().isEmpty();
                    return hasTickets || hasCombos;
                })
                .collect(Collectors.toList());

        log.info("Found {} orders without vnpPayDate (but have tickets/combos)", ordersWithoutPayDate.size());

        int updatedCount = 0;
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        for (Order order : ordersWithoutPayDate) {
            // Set vnpPayDate = orderDate (thời điểm order được tạo)
            // Hoặc nếu orderDate null thì dùng thời điểm hiện tại
            LocalDateTime payDate = order.getOrderDate() != null ? order.getOrderDate() : now;
            order.setVnpPayDate(payDate);
            orderRepository.save(order);
            updatedCount++;
            log.info("Updated Order ID: {} - set vnpPayDate to {}", order.getOrderId(), payDate);
        }

        log.info("Successfully updated {} orders", updatedCount);

        Map<String, Object> result = new HashMap<>();
        result.put("totalFound", ordersWithoutPayDate.size());
        result.put("updated", updatedCount);
        result.put("message", "Đã cập nhật " + updatedCount + " đơn hàng");

        return result;
    }
}
