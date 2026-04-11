package com.example.backend.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dtos.WalletResponseDTO;
import com.example.backend.dtos.WalletTransactionDTO;
import com.example.backend.entities.Customer;
import com.example.backend.entities.Wallet;
import com.example.backend.entities.WalletTransaction;
import com.example.backend.entities.enums.WalletTransactionType;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.WalletRepository;
import com.example.backend.repositories.WalletTransactionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final CustomerRepository customerRepository;

    private static final int DEFAULT_RECENT_TRANSACTION_LIMIT = 10;

    @Transactional
    public Wallet getOrCreateWallet(Long userId) {
        return walletRepository.findByCustomerUserId(userId)
                .orElseGet(() -> {
                    Customer customer = customerRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));
                    Wallet wallet = Wallet.builder()
                            .customer(customer)
                            .balance(BigDecimal.ZERO)
                            .locked(Boolean.FALSE)
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return walletRepository.save(wallet);
                });
    }

    @Transactional
    public WalletTransaction credit(Long userId, BigDecimal amount, String description, String referenceCode) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền phải lớn hơn 0");
        }
        Wallet wallet = getOrCreateWallet(userId);
        ensureWalletUnlocked(wallet);

        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(LocalDateTime.now());

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(amount)
                .type(WalletTransactionType.CREDIT)
                .description(description)
                .balanceAfter(wallet.getBalance())
                .createdAt(LocalDateTime.now())
                .referenceCode(referenceCode)
                .build();

        walletTransactionRepository.save(transaction);
        walletRepository.save(wallet);
        return transaction;
    }

    @Transactional
    public WalletTransaction debit(Long userId, BigDecimal amount, String description, String referenceCode) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền phải lớn hơn 0");
        }
        Wallet wallet = getOrCreateWallet(userId);
        ensureWalletUnlocked(wallet);

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new IllegalStateException("Số dư ví không đủ");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setUpdatedAt(LocalDateTime.now());

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .amount(amount.negate())
                .type(WalletTransactionType.DEBIT)
                .description(description)
                .balanceAfter(wallet.getBalance())
                .createdAt(LocalDateTime.now())
                .referenceCode(referenceCode)
                .build();

        walletTransactionRepository.save(transaction);
        walletRepository.save(wallet);
        return transaction;
    }

    @Transactional
    public WalletResponseDTO getWalletSnapshot(Long userId, int monthlyLimit, int monthlyUsed) {
        Wallet wallet = getOrCreateWallet(userId);
        List<WalletTransaction> transactions = walletTransactionRepository
                .findRecentByWalletId(wallet.getWalletId()).stream()
                .limit(DEFAULT_RECENT_TRANSACTION_LIMIT)
                .collect(Collectors.toList());

        return WalletResponseDTO.builder()
                .walletId(wallet.getWalletId())
                .balance(wallet.getBalance())
                .updatedAt(wallet.getUpdatedAt())
                .locked(Boolean.TRUE.equals(wallet.getLocked()))
                .monthlyCancellationLimit(monthlyLimit)
                .monthlyCancellationUsed(monthlyUsed)
                .recentTransactions(transactions.stream()
                        .map(this::mapTransactionToDTO)
                        .toList())
                .build();
    }

    @Transactional
    public List<WalletTransactionDTO> getTransactions(Long userId) {
        Wallet wallet = getOrCreateWallet(userId);
        return walletTransactionRepository.findRecentByWalletId(wallet.getWalletId()).stream()
                .map(this::mapTransactionToDTO)
                .collect(Collectors.toList());
    }

    private void ensureWalletUnlocked(Wallet wallet) {
        if (Boolean.TRUE.equals(wallet.getLocked())) {
            throw new IllegalStateException("Ví Cinesmart của bạn đang bị khóa. Vui lòng liên hệ hỗ trợ.");
        }
        if (wallet.getBalance() == null) {
            wallet.setBalance(BigDecimal.ZERO);
        }
    }

    private WalletTransactionDTO mapTransactionToDTO(WalletTransaction transaction) {
        return WalletTransactionDTO.builder()
                .transactionId(transaction.getTransactionId())
                .amount(transaction.getAmount())
                .type(transaction.getType() != null ? transaction.getType().name() : null)
                .description(transaction.getDescription())
                .balanceAfter(transaction.getBalanceAfter())
                .createdAt(transaction.getCreatedAt())
                .referenceCode(transaction.getReferenceCode())
                .build();
    }
}
