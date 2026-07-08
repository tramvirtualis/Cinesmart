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
    private final CustomerSpendingService customerSpendingService;

    public static final BigDecimal SILVER_THRESHOLD = new BigDecimal("1500000");
    public static final BigDecimal GOLD_THRESHOLD = new BigDecimal("2500000");
    public static final BigDecimal PLATINUM_THRESHOLD = new BigDecimal("4500000");

    @Transactional
    public void updateTierAndProvideCashback(Long customerId, Order newOrder) {
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);
        if (optionalCustomer.isEmpty()) return;

        Customer customer = optionalCustomer.get();
        
        // 1. Calculate spending using the same rules as the expense statistics tab
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(customerId);
        BigDecimal totalSpent = customerSpendingService.calculateLast12MonthsSpent(orders);

        BigDecimal newOrderAmount = customerSpendingService.isEligibleSpendingOrder(newOrder)
                && customerSpendingService.isWithinLast12Months(newOrder, customerSpendingService.getLast12MonthsCutoff())
                ? customerSpendingService.calculateNetSpentAmount(newOrder)
                : BigDecimal.ZERO;
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
     * Uses the same spending rules as expense statistics (last 12 months).
     */
    @Transactional
    public void recalculateTierAfterCancellation(Long customerId) {
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);
        if (optionalCustomer.isEmpty()) return;

        Customer customer = optionalCustomer.get();
        BigDecimal totalSpent = customerSpendingService.calculateLast12MonthsSpent(customerId);

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
     * Uses the same rules as expense statistics, limited to the last 12 months.
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateCurrentSpending(Long customerId) {
        BigDecimal result = customerSpendingService.calculateLast12MonthsSpent(customerId);
        log.info("DEBUG calculateCurrentSpending - customerId: {}, result: {}", customerId, result);
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

        for (Customer customer : customers) {
            BigDecimal totalSpent = customerSpendingService.calculateLast12MonthsSpent(customer.getUserId());

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
        LocalDateTime cutoff = customerSpendingService.getLast12MonthsCutoff();
        LocalDateTime now = LocalDateTime.now(CustomerSpendingService.VIETNAM_ZONE);

        java.util.List<java.util.Map<String, Object>> included = new java.util.ArrayList<>();
        java.util.List<java.util.Map<String, Object>> excluded = new java.util.ArrayList<>();

        BigDecimal totalSpent = BigDecimal.ZERO;

        for (Order o : orders) {
            java.util.Map<String, Object> info = new java.util.LinkedHashMap<>();
            info.put("orderId", o.getOrderId());
            info.put("status", o.getStatus() != null ? o.getStatus().name() : "null");
            info.put("totalAmount", o.getTotalAmount());
            info.put("refundAmount", o.getRefundAmount());
            info.put("paymentMethod", o.getPaymentMethod() != null ? o.getPaymentMethod().name() : "null");
            info.put("vnpPayDate", o.getVnpPayDate() != null ? o.getVnpPayDate().toString() : "NULL");
            info.put("orderDate", o.getOrderDate() != null ? o.getOrderDate().toString() : "NULL");
            info.put("isTopUp", o.getIsTopUp());
            info.put("in12MonthRange", customerSpendingService.isWithinLast12Months(o, cutoff));

            if (!customerSpendingService.isEligibleSpendingOrder(o)) {
                if (Boolean.TRUE.equals(o.getIsTopUp())) {
                    info.put("reason", "EXCLUDED - isTopUp=true");
                } else if (o.getVnpPayDate() == null) {
                    info.put("reason", "EXCLUDED - vnpPayDate is NULL");
                } else {
                    info.put("reason", "EXCLUDED - not eligible");
                }
                excluded.add(info);
            } else if (!customerSpendingService.isWithinLast12Months(o, cutoff)) {
                info.put("reason", "EXCLUDED - orderDate before cutoff " + cutoff);
                excluded.add(info);
            } else {
                BigDecimal netAmount = customerSpendingService.calculateNetSpentAmount(o);
                info.put("netAmount", netAmount);
                info.put("reason", "INCLUDED");
                totalSpent = totalSpent.add(netAmount);
                included.add(info);
            }
        }

        java.util.Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("customerId", customerId);
        summary.put("now", now.toString());
        summary.put("oneYearAgo_cutoff", cutoff.toString());
        summary.put("totalOrdersFound", orders.size());
        summary.put("calculatedSpend", totalSpent);
        summary.put("includedOrders", included);
        summary.put("excludedOrders", excluded);
        return summary;
    }
}

