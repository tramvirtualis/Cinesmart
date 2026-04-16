package com.example.backend.services;

import com.example.backend.entities.Customer;
import com.example.backend.entities.Order;
import com.example.backend.entities.OrderCombo;
import com.example.backend.entities.Ticket;
import com.example.backend.entities.WalletTransaction;
import com.example.backend.entities.enums.OrderStatus;
import com.example.backend.entities.enums.PaymentMethod;
import com.example.backend.entities.enums.UserTier;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.OrderRepository;
import com.example.backend.repositories.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoyaltyService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final WalletService walletService;
    private final WalletTransactionRepository walletTransactionRepository;

    public static final BigDecimal SILVER_THRESHOLD = new BigDecimal("1500000");
    public static final BigDecimal GOLD_THRESHOLD = new BigDecimal("2500000");
    public static final BigDecimal PLATINUM_THRESHOLD = new BigDecimal("4500000");

    @Transactional
    public void updateTierAndProvideCashback(Long customerId, Order newOrder) {
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);
        if (optionalCustomer.isEmpty()) return;

        Customer customer = optionalCustomer.get();
        
        // 1. Calculate spending logic (PAID total - CANCELLED total, last 12 months, excluding top-up)
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(customerId);
        LocalDateTime oneYearAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(12);

        BigDecimal paidTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PAID)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cancelledTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CANCELLED)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSpent = paidTotal.subtract(cancelledTotal);
        if (totalSpent.compareTo(BigDecimal.ZERO) < 0) totalSpent = BigDecimal.ZERO;

        BigDecimal previousSpend = customer.getTotalSpendLast12Months() != null ? customer.getTotalSpendLast12Months() : BigDecimal.ZERO;
        
        // Exclude the current order from previous spend to check if we crossed a threshold
        BigDecimal newOrderAmount = newOrder.getTotalAmount() != null ? newOrder.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal spendBeforeThisOrder = totalSpent.subtract(newOrderAmount);
        if (spendBeforeThisOrder.compareTo(BigDecimal.ZERO) < 0) {
            spendBeforeThisOrder = BigDecimal.ZERO;
        }

        customer.setTotalSpendLast12Months(totalSpent);

        UserTier newTier = UserTier.MEMBER;
        if (totalSpent.compareTo(PLATINUM_THRESHOLD) >= 0) {
            newTier = UserTier.PLATINUM;
        } else if (totalSpent.compareTo(GOLD_THRESHOLD) >= 0) {
            newTier = UserTier.GOLD;
        } else if (totalSpent.compareTo(SILVER_THRESHOLD) >= 0) {
            newTier = UserTier.SILVER;
        }

        UserTier oldTier = customer.getTier() != null ? customer.getTier() : UserTier.MEMBER;
        customer.setTier(newTier);
        customerRepository.save(customer);

        // 2. Calculate Cashback
        // Give cashback for ALL orders from customers at SILVER/GOLD/PLATINUM tier
        // If crossing a threshold, only give cashback on the eligible portion
        // If already at tier, give cashback on the full amount
        if (newTier != UserTier.MEMBER && newOrderAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal threshold = BigDecimal.ZERO;
            if (newTier == UserTier.SILVER && oldTier == UserTier.MEMBER) threshold = SILVER_THRESHOLD;
            else if (newTier == UserTier.GOLD && (oldTier == UserTier.SILVER || oldTier == UserTier.MEMBER)) threshold = GOLD_THRESHOLD;
            else if (newTier == UserTier.PLATINUM && oldTier != UserTier.PLATINUM) threshold = PLATINUM_THRESHOLD;

            BigDecimal eligibleRatio = BigDecimal.ONE;
            // Only apply threshold logic if we're actually crossing a new tier threshold
            // threshold > 0 means we're transitioning to a higher tier
            if (threshold.compareTo(BigDecimal.ZERO) > 0) {
                boolean crossedThreshold = (spendBeforeThisOrder.compareTo(threshold) < 0 && totalSpent.compareTo(threshold) >= 0);
                
                if (crossedThreshold) {
                    BigDecimal neededToCross = threshold.subtract(spendBeforeThisOrder);
                    BigDecimal eligibleAmount = newOrderAmount.subtract(neededToCross);
                    if (eligibleAmount.compareTo(BigDecimal.ZERO) > 0) {
                        eligibleRatio = eligibleAmount.divide(newOrderAmount, 4, RoundingMode.HALF_UP);
                    } else {
                        eligibleRatio = BigDecimal.ZERO;
                    }
                } else {
                    // Crossed threshold already before this order - give full cashback
                    eligibleRatio = BigDecimal.ONE;
                }
            }
            // If threshold is 0, customer was already at this tier - give full cashback (eligibleRatio = 1.0)

            if (eligibleRatio.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal ticketOriginalTotal = BigDecimal.ZERO;
                if (newOrder.getTickets() != null) {
                    for(Ticket t : newOrder.getTickets()) {
                        ticketOriginalTotal = ticketOriginalTotal.add(t.getPrice());
                    }
                }
                
                BigDecimal foodOriginalTotal = BigDecimal.ZERO;
                if (newOrder.getOrderCombos() != null) {
                    for(OrderCombo oc : newOrder.getOrderCombos()) {
                        foodOriginalTotal = foodOriginalTotal.add(oc.getPrice().multiply(BigDecimal.valueOf(oc.getQuantity())));
                    }
                }

                BigDecimal totalOriginal = ticketOriginalTotal.add(foodOriginalTotal);
                
                BigDecimal actualTicketPaid = BigDecimal.ZERO;
                BigDecimal actualFoodPaid = BigDecimal.ZERO;

                if (totalOriginal.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal ticketRatio = ticketOriginalTotal.divide(totalOriginal, 4, RoundingMode.HALF_UP);
                    BigDecimal foodRatio = BigDecimal.ONE.subtract(ticketRatio);
                    actualTicketPaid = newOrderAmount.multiply(ticketRatio);
                    actualFoodPaid = newOrderAmount.multiply(foodRatio);
                } else if (ticketOriginalTotal.compareTo(BigDecimal.ZERO) > 0) {
                    actualTicketPaid = newOrderAmount;
                } else if (foodOriginalTotal.compareTo(BigDecimal.ZERO) > 0) {
                    actualFoodPaid = newOrderAmount;
                }

                BigDecimal ticketRate = getTicketCashbackRate(newTier);
                BigDecimal foodRate = getFoodCashbackRate(newTier);

                BigDecimal ticketCashback = actualTicketPaid.multiply(eligibleRatio).multiply(ticketRate);
                BigDecimal foodCashback = actualFoodPaid.multiply(eligibleRatio).multiply(foodRate);

                BigDecimal totalCashback = ticketCashback.add(foodCashback).setScale(0, RoundingMode.HALF_UP);

                // Disable cashback if the order payment method is WALLET? 
                // Normally we still give cashback if paid by wallet to encourage usage unless business rule says no. We will allow it.

                if (totalCashback.compareTo(BigDecimal.ZERO) > 0) {
                    String note = "Hoàn tiền hạng " + newTier.name() + " cho đơn hàng #" + newOrder.getOrderId();
                    String txnRef = "CASHBACK-" + newOrder.getOrderId() + "-" + System.currentTimeMillis();
                    try {
                        walletService.credit(customerId, totalCashback, note, txnRef);
                        log.info("Provided cashback {} to user {} for order {}", totalCashback, customerId, newOrder.getOrderId());
                    } catch (Exception e) {
                        log.error("Failed to provide cashback to user: " + e.getMessage());
                    }
                }
            }
        }
    }

    private BigDecimal getTicketCashbackRate(UserTier tier) {
        return switch (tier) {
            case SILVER -> new BigDecimal("0.05");
            case GOLD -> new BigDecimal("0.07");
            case PLATINUM -> new BigDecimal("0.10");
            default -> BigDecimal.ZERO;
        };
    }

    private BigDecimal getFoodCashbackRate(UserTier tier) {
        return switch (tier) {
            case SILVER -> new BigDecimal("0.03");
            case GOLD -> new BigDecimal("0.04");
            case PLATINUM -> new BigDecimal("0.05");
            default -> BigDecimal.ZERO;
        };
    }
    
    public int getCancellationLimit(UserTier tier) {
        if (tier == null) return 2;
        return switch (tier) {
            case SILVER -> 2;
            case GOLD -> 3;
            case PLATINUM -> 4;
            default -> 2; // Default for MEMBER
        };
    }

    /**
     * Retrieve and deduct cashback for a cancelled order
     * When user cancels an order, any cashback received must be deducted from their wallet
     * @param customerId Customer ID
     * @param orderId Order ID
     * @return Total cashback amount to deduct
     */
    @Transactional
    public BigDecimal retrieveCashbackForCancelledOrder(Long customerId, Long orderId) {
        List<WalletTransaction> cashbackTransactions = 
                walletTransactionRepository.findCashbackByUserIdAndOrderId(customerId, orderId);
        
        if (cashbackTransactions.isEmpty()) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal totalCashback = BigDecimal.ZERO;
        for (WalletTransaction wt : cashbackTransactions) {
            if (wt.getAmount() != null) {
                totalCashback = totalCashback.add(wt.getAmount().abs());
            }
        }
        
        log.info("Found {} cashback transaction(s) for order {} totaling {}", 
                cashbackTransactions.size(), orderId, totalCashback);
        
        return totalCashback;
    }

    /**
     * Recalculate customer's tier and spending after order cancellation
     * (This only updates tier/spending, does NOT provide cashback)
     * Formula: PAID total - CANCELLED total (both within last 12 months, no topup)
     */
    @Transactional
    public void recalculateTierAfterCancellation(Long customerId) {
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);
        if (optionalCustomer.isEmpty()) return;

        Customer customer = optionalCustomer.get();
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(customerId);
        LocalDateTime oneYearAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(12);

        // PAID total (last 12 months, no topup)
        BigDecimal paidTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PAID)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // CANCELLED total (last 12 months, no topup)
        BigDecimal cancelledTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CANCELLED)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Spending = PAID - CANCELLED (cannot be negative)
        BigDecimal totalSpent = paidTotal.subtract(cancelledTotal);
        if (totalSpent.compareTo(BigDecimal.ZERO) < 0) totalSpent = BigDecimal.ZERO;

        UserTier newTier = UserTier.MEMBER;
        if (totalSpent.compareTo(PLATINUM_THRESHOLD) >= 0) {
            newTier = UserTier.PLATINUM;
        } else if (totalSpent.compareTo(GOLD_THRESHOLD) >= 0) {
            newTier = UserTier.GOLD;
        } else if (totalSpent.compareTo(SILVER_THRESHOLD) >= 0) {
            newTier = UserTier.SILVER;
        }

        UserTier oldTier = customer.getTier() != null ? customer.getTier() : UserTier.MEMBER;

        // Update tier and spending
        customer.setTier(newTier);
        customer.setTotalSpendLast12Months(totalSpent);
        customerRepository.save(customer);

        log.info("Recalculated tier for customer {} after cancellation: {} -> {}, totalSpend: {}",
                customerId, oldTier, newTier, totalSpent);
    }

    /**
     * Calculate current spending for a customer in the last 12 months
     * (Real-time calculation from orders, not from stored value)
     * Formula: Spending = Total PAID orders - Total CANCELLED orders (both within last 12 months, excluding topup)
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateCurrentSpending(Long customerId) {
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(customerId);
        LocalDateTime oneYearAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(12);

        log.info("DEBUG calculateCurrentSpending - customerId: {}, total orders: {}", customerId, orders.size());
        for (Order o : orders) {
            log.info("DEBUG order: id={}, status={}, amount={}, orderDate={}, isTopUp={}", 
                o.getOrderId(), o.getStatus(), o.getTotalAmount(), o.getOrderDate(), o.getIsTopUp());
        }

        // Calculate PAID total (last 12 months, not topup)
        BigDecimal paidTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PAID)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate CANCELLED total (refunded, last 12 months, not topup)
        BigDecimal cancelledTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CANCELLED)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal result = paidTotal.subtract(cancelledTotal);
        if (result.compareTo(BigDecimal.ZERO) < 0) result = BigDecimal.ZERO;
        log.info("DEBUG spending calculation - customerId: {}, paidTotal: {}, cancelledTotal: {}, result: {}", 
            customerId, paidTotal, cancelledTotal, result);

        // Spending = PAID - CANCELLED (cannot be negative)
        return result;
    }

    /**
     * Recalculate and update tier + spending for a specific customer.
     * Returns the saved Customer entity with updated values.
     * (Use the returned Customer directly to avoid JPA L1 cache stale reads)
     */
    @Transactional
    public Customer recalculateTierForCustomer(Long customerId) {
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);
        if (optionalCustomer.isEmpty()) return null;

        Customer customer = optionalCustomer.get();
        BigDecimal totalSpent = calculateCurrentSpending(customerId);
        
        log.info("DEBUG recalculateTierForCustomer - customerId: {}, calculatedSpending: {}", customerId, totalSpent);

        UserTier newTier = UserTier.MEMBER;
        if (totalSpent.compareTo(PLATINUM_THRESHOLD) >= 0) {
            newTier = UserTier.PLATINUM;
        } else if (totalSpent.compareTo(GOLD_THRESHOLD) >= 0) {
            newTier = UserTier.GOLD;
        } else if (totalSpent.compareTo(SILVER_THRESHOLD) >= 0) {
            newTier = UserTier.SILVER;
        }

        // Update tier and spending
        customer.setTier(newTier);
        customer.setTotalSpendLast12Months(totalSpent);
        Customer saved = customerRepository.save(customer);
        customerRepository.flush(); // Ensure changes are written to DB immediately
        
        log.info("Recalculated tier for customer {}: tier={}, spend={}", customerId, newTier, totalSpent);
        return saved;
    }

    @Transactional
    public java.util.Map<String, Object> syncAllTiers() {
        List<Customer> customers = customerRepository.findAll();
        int updatedCount = 0;
        LocalDateTime oneYearAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(12);

        for (Customer customer : customers) {
            List<Order> orders = orderRepository.findByUserUserIdWithDetails(customer.getUserId());
            
            // Calculate PAID total (last 12 months, not topup)
            BigDecimal paidTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.PAID)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Calculate CANCELLED total (refunded, last 12 months, not topup)
            BigDecimal cancelledTotal = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CANCELLED)
                .filter(o -> !Boolean.TRUE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Spending = PAID - CANCELLED (cannot be negative)
            BigDecimal totalSpent = paidTotal.subtract(cancelledTotal);
            if (totalSpent.compareTo(BigDecimal.ZERO) < 0) totalSpent = BigDecimal.ZERO;

            UserTier newTier = UserTier.MEMBER;
            if (totalSpent.compareTo(PLATINUM_THRESHOLD) >= 0) {
                newTier = UserTier.PLATINUM;
            } else if (totalSpent.compareTo(GOLD_THRESHOLD) >= 0) {
                newTier = UserTier.GOLD;
            } else if (totalSpent.compareTo(SILVER_THRESHOLD) >= 0) {
                newTier = UserTier.SILVER;
            }

            if (!newTier.equals(customer.getTier()) || customer.getTotalSpendLast12Months() == null || totalSpent.compareTo(customer.getTotalSpendLast12Months()) != 0) {
                customer.setTier(newTier);
                customer.setTotalSpendLast12Months(totalSpent);
                customerRepository.save(customer);
                updatedCount++;
            }
        }
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("processed", customers.size());
        result.put("updated", updatedCount);
        return result;
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> debugSpendingCalculation(Long customerId) {
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(customerId);
        LocalDateTime oneYearAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(12);
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        java.util.List<java.util.Map<String, Object>> includedPaid = new java.util.ArrayList<>();
        java.util.List<java.util.Map<String, Object>> includedCancelled = new java.util.ArrayList<>();
        java.util.List<java.util.Map<String, Object>> excluded = new java.util.ArrayList<>();

        BigDecimal paidTotal = BigDecimal.ZERO;
        BigDecimal cancelledTotal = BigDecimal.ZERO;

        for (Order o : orders) {
            java.util.Map<String, Object> info = new java.util.LinkedHashMap<>();
            info.put("orderId", o.getOrderId());
            info.put("status", o.getStatus() != null ? o.getStatus().name() : "null");
            info.put("totalAmount", o.getTotalAmount());
            info.put("orderDate", o.getOrderDate() != null ? o.getOrderDate().toString() : "NULL");
            info.put("isTopUp", o.getIsTopUp());

            boolean isTopUp = Boolean.TRUE.equals(o.getIsTopUp());
            boolean hasDate = o.getOrderDate() != null;
            boolean inRange = hasDate && o.getOrderDate().isAfter(oneYearAgo);
            boolean isPaid = o.getStatus() == OrderStatus.PAID;
            boolean isCancelled = o.getStatus() == OrderStatus.CANCELLED;

            info.put("in12MonthRange", inRange);

            if (isTopUp) {
                info.put("reason", "EXCLUDED - isTopUp=true");
                excluded.add(info);
            } else if (!hasDate) {
                info.put("reason", "EXCLUDED - orderDate is NULL");
                excluded.add(info);
            } else if (!inRange) {
                info.put("reason", "EXCLUDED - orderDate " + o.getOrderDate() + " before cutoff " + oneYearAgo);
                excluded.add(info);
            } else if (isPaid) {
                info.put("reason", "INCLUDED in PAID");
                paidTotal = paidTotal.add(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO);
                includedPaid.add(info);
            } else if (isCancelled) {
                info.put("reason", "INCLUDED in CANCELLED (subtracted)");
                cancelledTotal = cancelledTotal.add(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO);
                includedCancelled.add(info);
            } else {
                info.put("reason", "EXCLUDED - status=" + o.getStatus() + " (PENDING or other)");
                excluded.add(info);
            }
        }

        BigDecimal calcResult = paidTotal.subtract(cancelledTotal);
        if (calcResult.compareTo(BigDecimal.ZERO) < 0) calcResult = BigDecimal.ZERO;

        java.util.Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("customerId", customerId);
        summary.put("now", now.toString());
        summary.put("oneYearAgo_cutoff", oneYearAgo.toString());
        summary.put("totalOrdersFound", orders.size());
        summary.put("paidTotal", paidTotal);
        summary.put("cancelledTotal", cancelledTotal);
        summary.put("calculatedSpend_PAID_minus_CANCELLED", calcResult);
        summary.put("includedPaidOrders", includedPaid);
        summary.put("includedCancelledOrders", includedCancelled);
        summary.put("excludedOrders", excluded);
        return summary;
    }
}

