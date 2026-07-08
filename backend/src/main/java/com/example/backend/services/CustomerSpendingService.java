package com.example.backend.services;

import com.example.backend.entities.Order;
import com.example.backend.entities.enums.OrderStatus;
import com.example.backend.entities.enums.PaymentMethod;
import com.example.backend.repositories.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerSpendingService {

    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepository orderRepository;

    /**
     * Orders that count toward customer spending statistics and loyalty tier.
     * Matches expense tab rules: paid (vnpPayDate), not top-up.
     */
    public boolean isEligibleSpendingOrder(Order order) {
        if (order == null || order.getVnpPayDate() == null) {
            return false;
        }
        if (Boolean.TRUE.equals(order.getIsTopUp())) {
            return false;
        }
        return true;
    }

    public boolean isWithinLast12Months(Order order, LocalDateTime cutoff) {
        if (order == null || order.getOrderDate() == null) {
            return false;
        }
        return !order.getOrderDate().isBefore(cutoff);
    }

    public LocalDateTime getLast12MonthsCutoff() {
        return LocalDateTime.now(VIETNAM_ZONE).minusMonths(12);
    }

    /**
     * Net amount spent on an order after partial/full refunds.
     */
    public BigDecimal calculateNetSpentAmount(Order order) {
        BigDecimal amount = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        if (order.getStatus() == OrderStatus.CANCELLED && order.getRefundAmount() != null) {
            BigDecimal netAmount = amount.subtract(order.getRefundAmount());
            return netAmount.compareTo(BigDecimal.ZERO) > 0 ? netAmount : BigDecimal.ZERO;
        }
        return amount;
    }

    public BigDecimal calculateTotalSpent(List<Order> orders) {
        return orders.stream()
                .filter(this::isEligibleSpendingOrder)
                .map(this::calculateNetSpentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal calculateLast12MonthsSpent(List<Order> orders) {
        LocalDateTime cutoff = getLast12MonthsCutoff();
        return orders.stream()
                .filter(this::isEligibleSpendingOrder)
                .filter(order -> isWithinLast12Months(order, cutoff))
                .map(this::calculateNetSpentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateLast12MonthsSpent(Long customerId) {
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(customerId);
        return calculateLast12MonthsSpent(orders);
    }

    public List<Order> filterEligibleSpendingOrders(List<Order> orders) {
        return orders.stream()
                .filter(this::isEligibleSpendingOrder)
                .toList();
    }
}
