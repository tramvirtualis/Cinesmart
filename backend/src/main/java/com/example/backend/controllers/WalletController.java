package com.example.backend.controllers;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dtos.WalletResponseDTO;
import com.example.backend.dtos.WalletTopUpRequestDTO;
import com.example.backend.dtos.WalletTransactionDTO;
import com.example.backend.entities.Customer;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.services.OrderService;
import com.example.backend.services.WalletService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
        allowedHeaders = "*",
        allowCredentials = "true")
public class WalletController {

    private final WalletService walletService;
    private final CustomerRepository customerRepository;
    private final OrderService orderService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getMyWallet() {
        try {
            Long userId = getCurrentCustomerId();
            int used = orderService.getMonthlyCancellationUsed(userId);
            int limit = orderService.getMonthlyCancellationLimit();
            WalletResponseDTO wallet = walletService.getWalletSnapshot(userId, limit, used);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", wallet);
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @GetMapping("/me/transactions")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getMyTransactions() {
        try {
            Long userId = getCurrentCustomerId();
            List<WalletTransactionDTO> transactions = walletService.getTransactions(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", transactions);
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PostMapping("/me/top-up")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> topUp(@RequestBody WalletTopUpRequestDTO request) {
        try {
            if (request == null || request.getAmount() == null) {
                return ResponseEntity.badRequest().body(createError("Số tiền nạp không hợp lệ"));
            }
            BigDecimal amount = request.getAmount();
            if (amount.compareTo(BigDecimal.valueOf(10000)) < 0) {
                return ResponseEntity.badRequest().body(createError("Số tiền nạp tối thiểu là 10.000đ"));
            }
            Long userId = getCurrentCustomerId();
            String note = (request.getNote() == null || request.getNote().isBlank())
                    ? "Người dùng nạp ví Cinesmart"
                    : request.getNote().trim();
            walletService.credit(userId, amount, note, "TOPUP-" + System.currentTimeMillis());

            int used = orderService.getMonthlyCancellationUsed(userId);
            int limit = orderService.getMonthlyCancellationLimit();
            WalletResponseDTO wallet = walletService.getWalletSnapshot(userId, limit, used);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Nạp ví thành công");
            response.put("data", wallet);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(createError(ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createError("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    private Long getCurrentCustomerId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với username: " + username));
        return customer.getUserId();
    }

    private Map<String, Object> createError(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }
}

