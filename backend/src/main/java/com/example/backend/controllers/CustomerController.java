package com.example.backend.controllers;

import com.example.backend.dtos.CancelOrderRequestDTO;
import com.example.backend.dtos.CancelOrderResponseDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.OrderResponseDTO;
import com.example.backend.dtos.UpdateCustomerProfileRequestDTO;
import com.example.backend.dtos.VoucherResponseDTO;
import com.example.backend.entities.Customer;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.services.CustomerService;
import com.example.backend.services.OrderService;
import com.example.backend.services.CloudinaryService;
import jakarta.validation.Valid;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173",
        "http://localhost:3000" }, allowedHeaders = "*", allowCredentials = "true")
public class CustomerController {

    private final CustomerService customerService;
    private final CustomerRepository customerRepository;
    private final OrderService orderService;
    private final CloudinaryService cloudinaryService;

    @PutMapping("/{id}/profile")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerProfileRequestDTO request,
            BindingResult bindingResult) {

        // Check validation errors
        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().body(createErrorResponse(bindingResult));
        }

        try {
            Customer updatedCustomer = customerService.updateProfile(id, request);

            // Map Customer entity to response format
            Map<String, Object> customerData = new HashMap<>();
            customerData.put("userId", updatedCustomer.getUserId());
            customerData.put("name", updatedCustomer.getName());
            customerData.put("email", updatedCustomer.getEmail());
            customerData.put("phone", updatedCustomer.getPhone());
            customerData.put("dob", updatedCustomer.getDob());
            customerData.put("avatar", updatedCustomer.getAvatar());

            // Map address if exists
            if (updatedCustomer.getAddress() != null) {
                Map<String, Object> addressData = new HashMap<>();
                addressData.put("description", updatedCustomer.getAddress().getDescription());
                addressData.put("province", updatedCustomer.getAddress().getProvince());
                customerData.put("address", addressData);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Cập nhật thông tin thành công");
            response.put("data", customerData);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            // lỗi do business logic
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            // lỗi bất ngờ
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    private Map<String, Object> createSuccessResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        return response;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        return response;
    }

    private Map<String, Object> createErrorResponse(BindingResult bindingResult) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);

        String errors = bindingResult.getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));

        response.put("message", errors);
        return response;
    }

    private Long getCurrentCustomerId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Customer customer = customerRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với username: " + username));
        return customer.getUserId();
    }

    @GetMapping("/vouchers")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getUserVouchers() {
        try {
            Long userId = getCurrentCustomerId();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách voucher thành công");
            response.put("data", customerService.getUserVouchers(userId));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    // Admin endpoint để lấy vouchers của một user cụ thể
    @GetMapping("/{userId}/vouchers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserVouchersByAdmin(@PathVariable Long userId) {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách voucher thành công");
            response.put("data", customerService.getUserVouchers(userId));
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PostMapping("/vouchers/{voucherId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> saveVoucher(@PathVariable Long voucherId) {
        try {
            Long userId = getCurrentCustomerId();
            VoucherResponseDTO voucher = customerService.saveVoucher(userId, voucherId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lưu voucher thành công");
            response.put("data", voucher);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @DeleteMapping("/vouchers/{voucherId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> removeVoucher(@PathVariable Long voucherId) {
        try {
            Long userId = getCurrentCustomerId();
            customerService.removeVoucher(userId, voucherId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Xóa voucher thành công");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @GetMapping("/vouchers/{voucherId}/check")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> checkVoucher(@PathVariable Long voucherId) {
        try {
            Long userId = getCurrentCustomerId();
            boolean hasVoucher = customerService.hasVoucher(userId, voucherId);
            boolean isUsed = customerService.isVoucherUsed(userId, voucherId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("hasVoucher", hasVoucher);
            response.put("isUsed", isUsed);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    // ============ FAVORITE MOVIES ENDPOINTS ============

    @GetMapping("/favorites")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getFavoriteMovies() {
        try {
            System.out.println("CustomerController: getFavoriteMovies called");
            System.out.println("CustomerController: SecurityContext authentication: " +
                    (SecurityContextHolder.getContext().getAuthentication() != null
                            ? SecurityContextHolder.getContext().getAuthentication().getName()
                            : "null"));

            Long userId = getCurrentCustomerId();
            System.out.println("CustomerController: Current customer ID: " + userId);

            List<MovieResponseDTO> movies = customerService.getFavoriteMovies(userId);
            System.out.println("CustomerController: Found " + movies.size() + " favorite movies");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách phim yêu thích thành công");
            response.put("data", movies);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            System.out.println("CustomerController: RuntimeException in getFavoriteMovies: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.out.println("CustomerController: Exception in getFavoriteMovies: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PostMapping("/favorites/{movieId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> addFavorite(@PathVariable Long movieId) {
        try {
            Long userId = getCurrentCustomerId();
            MovieResponseDTO movie = customerService.addFavorite(userId, movieId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Thêm phim vào yêu thích thành công");
            response.put("data", movie);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @DeleteMapping("/favorites/{movieId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> removeFavorite(@PathVariable Long movieId) {
        try {
            Long userId = getCurrentCustomerId();
            customerService.removeFavorite(userId, movieId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Xóa phim khỏi yêu thích thành công");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @GetMapping("/favorites/{movieId}/check")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> checkFavorite(@PathVariable Long movieId) {
        try {
            Long userId = getCurrentCustomerId();
            boolean hasFavorite = customerService.hasFavorite(userId, movieId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("hasFavorite", hasFavorite);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    // ============ ORDERS ENDPOINTS ============

    @GetMapping("/profile")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getCurrentProfile() {
        try {
            Long userId = getCurrentCustomerId();
            Customer customer = customerRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));

            Map<String, Object> customerData = new HashMap<>();
            customerData.put("userId", customer.getUserId());
            customerData.put("username", customer.getUsername());
            customerData.put("name", customer.getName());
            customerData.put("email", customer.getEmail());
            customerData.put("phone", customer.getPhone());
            customerData.put("dob", customer.getDob());
            customerData.put("avatar", customer.getAvatar());

            // Map address if exists
            if (customer.getAddress() != null) {
                Map<String, Object> addressData = new HashMap<>();
                addressData.put("description", customer.getAddress().getDescription());
                addressData.put("province", customer.getAddress().getProvince());
                customerData.put("address", addressData);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy thông tin profile thành công");
            response.put("data", customerData);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @GetMapping("/orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getMyOrders() {
        try {
            Long userId = getCurrentCustomerId();
            List<OrderResponseDTO> orders = orderService.getOrdersByUser(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách đơn hàng thành công");
            response.put("data", orders);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PostMapping("/orders/{orderId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> cancelOrder(
            @PathVariable Long orderId,
            @RequestBody(required = false) CancelOrderRequestDTO request) {
        try {
            Long userId = getCurrentCustomerId();
            CancelOrderResponseDTO result = orderService.cancelOrder(
                    userId,
                    orderId,
                    request != null ? request.getReason() : null);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Hủy đơn hàng thành công");
            response.put("data", result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    /**
     * Utility endpoint: Update vnpPayDate cho các orders cũ
     * Tạm thời cho phép CUSTOMER gọi, sau này có thể chuyển thành ADMIN only
     */
    @PostMapping("/update-old-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> updateOldOrders() {
        try {
            Map<String, Object> result = orderService.updateOldOrdersPayDate();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra: " + e.getMessage()));
        }
    }

    @GetMapping("/expense-statistics")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getExpenseStatistics() {
        try {
            Long userId = getCurrentCustomerId();
            Map<String, Object> statistics = orderService.getExpenseStatistics(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy thống kê chi tiêu thành công");
            response.put("data", statistics);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    // ============ ADMIN ORDERS ENDPOINT ============

    @GetMapping("/admin/orders")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllOrders() {
        try {
            List<OrderResponseDTO> orders = orderService.getAllOrders();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách đơn hàng thành công");
            response.put("data", orders);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PostMapping("/admin/orders/{orderId}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cancelOrderAdmin(
            @PathVariable Long orderId,
            @RequestBody(required = false) CancelOrderRequestDTO request) {
        try {
            CancelOrderResponseDTO result = orderService.cancelOrderAdmin(
                    orderId,
                    request != null ? request.getReason() : null);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Hủy đơn hàng thành công");
            response.put("data", result);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    // ============ AVATAR ENDPOINTS ============

    @PostMapping("/{id}/avatar")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> uploadAvatar(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("File không được để trống"));
            }

            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Chỉ chấp nhận file ảnh"));
            }

            // Upload to Cloudinary
            String avatarUrl = cloudinaryService.uploadImage(file);

            // Update user avatar
            Customer updatedCustomer = customerService.updateAvatar(id, avatarUrl);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Cập nhật ảnh đại diện thành công");
            response.put("data", Map.of("avatar", updatedCustomer.getAvatar()));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Lỗi khi upload ảnh: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/avatar")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> deleteAvatar(@PathVariable Long id) {
        try {
            Customer updatedCustomer = customerService.deleteAvatar(id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Xóa ảnh đại diện thành công");
            response.put("data", Map.of("avatar", updatedCustomer.getAvatar()));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Lỗi khi xóa ảnh: " + e.getMessage()));
        }
    }

    // ============ PASSWORD ENDPOINTS ============

    @GetMapping("/password/check")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> checkPassword() {
        try {
            Long userId = getCurrentCustomerId();
            boolean hasPassword = customerService.hasPassword(userId);
            System.out.println("Password check API for user " + userId + ": hasPassword = " + hasPassword);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("hasPassword", hasPassword);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Có lỗi xảy ra. Vui lòng thử lại sau."));
        }
    }

    @PutMapping("/password/update")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> request) {
        try {
            Long userId = getCurrentCustomerId();
            String oldPassword = request.get("oldPassword");
            String newPassword = request.get("newPassword");
            String confirmPassword = request.get("confirmPassword");

            // Validate input
            if (oldPassword == null || oldPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng nhập mật khẩu cũ"));
            }
            if (newPassword == null || newPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng nhập mật khẩu mới"));
            }
            if (confirmPassword == null || confirmPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng xác nhận mật khẩu mới"));
            }
            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Mật khẩu mới và xác nhận mật khẩu không khớp"));
            }

            customerService.updatePassword(userId, oldPassword, newPassword);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Đổi mật khẩu thành công");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/password/create")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createPassword(@RequestBody Map<String, String> request) {
        try {
            Long userId = getCurrentCustomerId();
            String newPassword = request.get("newPassword");
            String confirmPassword = request.get("confirmPassword");

            // Validate input
            if (newPassword == null || newPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng nhập mật khẩu mới"));
            }
            if (confirmPassword == null || confirmPassword.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Vui lòng xác nhận mật khẩu mới"));
            }
            if (!newPassword.equals(confirmPassword)) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Mật khẩu mới và xác nhận mật khẩu không khớp"));
            }

            customerService.createPassword(userId, newPassword);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Tạo mật khẩu thành công");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }
}
