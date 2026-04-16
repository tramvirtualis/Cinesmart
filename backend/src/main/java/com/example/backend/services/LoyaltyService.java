package com.example.backend.services;

import com.example.backend.entities.Customer;
import com.example.backend.entities.Order;
import com.example.backend.entities.OrderCombo;
import com.example.backend.entities.Ticket;
import com.example.backend.entities.enums.OrderStatus;
import com.example.backend.entities.enums.PaymentMethod;
import com.example.backend.entities.enums.UserTier;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.OrderRepository;
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

    public static final BigDecimal SILVER_THRESHOLD = new BigDecimal("1500000");
    public static final BigDecimal GOLD_THRESHOLD = new BigDecimal("2500000");
    public static final BigDecimal PLATINUM_THRESHOLD = new BigDecimal("4500000");

    @Transactional
    public void updateTierAndProvideCashback(Long customerId, Order newOrder) {
        Optional<Customer> optionalCustomer = customerRepository.findById(customerId);
        if (optionalCustomer.isEmpty()) return;

        Customer customer = optionalCustomer.get();
        
        // 1. Calculate spending logic
        List<Order> orders = orderRepository.findByUserUserIdWithDetails(customerId);
        LocalDateTime oneYearAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(12);

        BigDecimal totalSpent = orders.stream()
                .filter(o -> o.getVnpPayDate() != null)
                .filter(o -> Boolean.FALSE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> {
                    BigDecimal amount = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                    if (o.getStatus() == OrderStatus.CANCELLED && o.getRefundAmount() != null) {
                        return amount.subtract(o.getRefundAmount());
                    }
                    return amount;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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
        if (newTier != UserTier.MEMBER && newOrderAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal threshold = BigDecimal.ZERO;
            if (newTier == UserTier.SILVER && oldTier == UserTier.MEMBER) threshold = SILVER_THRESHOLD;
            else if (newTier == UserTier.GOLD && (oldTier == UserTier.SILVER || oldTier == UserTier.MEMBER)) threshold = GOLD_THRESHOLD;
            else if (newTier == UserTier.PLATINUM && oldTier != UserTier.PLATINUM) threshold = PLATINUM_THRESHOLD;

            BigDecimal eligibleRatio = BigDecimal.ONE;
            boolean crossedThreshold = (spendBeforeThisOrder.compareTo(threshold) < 0 && totalSpent.compareTo(threshold) >= 0);
            
            if (crossedThreshold) {
                BigDecimal neededToCross = threshold.subtract(spendBeforeThisOrder);
                BigDecimal eligibleAmount = newOrderAmount.subtract(neededToCross);
                if (eligibleAmount.compareTo(BigDecimal.ZERO) > 0) {
                    eligibleRatio = eligibleAmount.divide(newOrderAmount, 4, RoundingMode.HALF_UP);
                } else {
                    eligibleRatio = BigDecimal.ZERO;
                }
            }

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

    @Transactional
    public java.util.Map<String, Object> syncAllTiers() {
        List<Customer> customers = customerRepository.findAll();
        int updatedCount = 0;
        LocalDateTime oneYearAgo = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMonths(12);

        for (Customer customer : customers) {
            List<Order> orders = orderRepository.findByUserUserIdWithDetails(customer.getUserId());
            BigDecimal totalSpent = orders.stream()
                .filter(o -> o.getVnpPayDate() != null)
                .filter(o -> Boolean.FALSE.equals(o.getIsTopUp()))
                .filter(o -> o.getOrderDate() != null && o.getOrderDate().isAfter(oneYearAgo))
                .map(o -> {
                    BigDecimal amount = o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO;
                    if (o.getStatus() == OrderStatus.CANCELLED && o.getRefundAmount() != null) {
                        return amount.subtract(o.getRefundAmount());
                    }
                    return amount;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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
}
