package com.example.backend.services;

import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.UpdateCustomerProfileRequestDTO;
import com.example.backend.dtos.VoucherResponseDTO;
import com.example.backend.entities.Address;
import com.example.backend.entities.Customer;
import com.example.backend.entities.Movie;
import com.example.backend.entities.User;
import com.example.backend.entities.Voucher;
import com.example.backend.repositories.AddressRepository;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.MovieRepository;
import com.example.backend.repositories.OrderRepository;
import com.example.backend.repositories.UserRepository;
import com.example.backend.repositories.VoucherRepository;
import com.example.backend.services.MovieService;
import com.example.backend.services.CloudinaryService;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final CustomerRepository customerRepository;
    private final VoucherRepository voucherRepository;
    private final MovieRepository movieRepository;
    private final OrderRepository orderRepository;
    private final MovieService movieService;
    private final NotificationService notificationService;
    private final CloudinaryService cloudinaryService;
    private final PasswordEncoder passwordEncoder;

    // Constructor injection with @Lazy for MovieService to avoid circular dependency
    public CustomerService(
            UserRepository userRepository,
            AddressRepository addressRepository,
            CustomerRepository customerRepository,
            VoucherRepository voucherRepository,
            MovieRepository movieRepository,
            OrderRepository orderRepository,
            @Lazy MovieService movieService,
            NotificationService notificationService,
            CloudinaryService cloudinaryService,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.customerRepository = customerRepository;
        this.voucherRepository = voucherRepository;
        this.movieRepository = movieRepository;
        this.orderRepository = orderRepository;
        this.movieService = movieService;
        this.notificationService = notificationService;
        this.cloudinaryService = cloudinaryService;
        this.passwordEncoder = passwordEncoder;
    }

    public Customer updateProfile(Long userId, UpdateCustomerProfileRequestDTO req) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("User không tồn tại"));

        if (!(user instanceof Customer customer)) {
            throw new Exception("User này không phải Customer");
        }

        customer.setName(req.getName());
        customer.setEmail(req.getEmail());
        customer.setPhone(req.getPhone());
        customer.setDob(req.getDob());

        Address address;
        if (customer.getAddress() == null) {
            address = Address.builder()
                    .description(req.getAddressDescription())
                    .province(req.getAddressProvince())
                    .build();
        } else {
            address = customer.getAddress();
            address.setDescription(req.getAddressDescription());
            address.setProvince(req.getAddressProvince());
        }

        addressRepository.save(address);
        customer.setAddress(address);

        return userRepository.save(customer);
    }

    @Transactional
    public Customer updateAvatar(Long userId, String avatarUrl) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("User không tồn tại"));

        if (!(user instanceof Customer customer)) {
            throw new Exception("User này không phải Customer");
        }

        // Xóa avatar cũ nếu có
        if (customer.getAvatar() != null && !customer.getAvatar().isEmpty()) {
            try {
                cloudinaryService.deleteImage(customer.getAvatar());
            } catch (Exception e) {
                // Log error nhưng không throw - có thể ảnh đã bị xóa hoặc không tồn tại
                System.err.println("Warning: Could not delete old avatar: " + e.getMessage());
            }
        }

        customer.setAvatar(avatarUrl);
        return userRepository.save(customer);
    }

    @Transactional
    public Customer deleteAvatar(Long userId) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("User không tồn tại"));

        if (!(user instanceof Customer customer)) {
            throw new Exception("User này không phải Customer");
        }

        // Xóa avatar từ Cloudinary nếu có
        if (customer.getAvatar() != null && !customer.getAvatar().isEmpty()) {
            try {
                cloudinaryService.deleteImage(customer.getAvatar());
            } catch (Exception e) {
                // Log error nhưng không throw - có thể ảnh đã bị xóa hoặc không tồn tại
                System.err.println("Warning: Could not delete avatar from Cloudinary: " + e.getMessage());
            }
        }

        customer.setAvatar(null);
        return userRepository.save(customer);
    }

    @Transactional(readOnly = true)
    public List<VoucherResponseDTO> getUserVouchers(Long userId) {
        Customer customer = customerRepository.findByIdWithVouchers(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        if (customer.getVouchers() == null || customer.getVouchers().isEmpty()) {
            return new ArrayList<>();
        }

        return customer.getVouchers().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public VoucherResponseDTO saveVoucher(Long userId, Long voucherId) {
        Customer customer = customerRepository.findByIdWithVouchers(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với ID: " + voucherId));

        // Initialize vouchers list if null
        if (customer.getVouchers() == null) {
            customer.setVouchers(new java.util.ArrayList<>());
        }

        // Kiểm tra voucher có phải PUBLIC không
        if (voucher.getScope() != com.example.backend.entities.enums.VoucherScope.PUBLIC) {
            throw new RuntimeException("Voucher này không phải voucher công khai");
        }

        // Kiểm tra xem voucher đã được lưu chưa (kiểm tra bằng voucherId thay vì object)
        boolean alreadyExists = customer.getVouchers().stream()
                .anyMatch(v -> v.getVoucherId().equals(voucherId));
        
        if (alreadyExists) {
            throw new RuntimeException("Voucher này đã được lưu");
        }
        
        // Kiểm tra xem voucher đã từng được sử dụng chưa (kể cả CANCELLED)
        // Nếu đã từng sử dụng, chỉ cho phép lưu lại nếu đã được lưu trước đó (đã được restore)
        boolean hasEverUsed = orderRepository.hasEverUsedVoucher(userId, voucherId);
        if (hasEverUsed) {
            // Nếu đã từng sử dụng nhưng chưa được lưu, không cho lưu lại
            // (Nếu đã được lưu trước đó, nó sẽ được restore khi hủy đơn, nên sẽ có trong list)
            throw new RuntimeException("Voucher này đã được sử dụng và không thể lưu lại");
        }
        
        // Kiểm tra xem voucher đã được sử dụng trong Order chưa (không tính CANCELLED)
        // Nếu đơn đã bị hủy (CANCELLED), voucher được hoàn về và có thể lưu lại nếu đã được lưu trước đó
        boolean voucherUsed = orderRepository.existsByUserUserIdAndVoucherVoucherId(userId, voucherId);
        if (voucherUsed) {
            throw new RuntimeException("Voucher này đã được sử dụng và không thể lưu lại");
        }

        // Add voucher to customer's list
        customer.getVouchers().add(voucher);
        customerRepository.save(customer);

        // Gửi thông báo WebSocket khi voucher được lưu thành công
        notificationService.notifyVoucherSaved(userId, voucher.getCode(), voucher.getName());

        return mapToDTO(voucher);
    }

    @Transactional
    public void removeVoucher(Long userId, Long voucherId) {
        Customer customer = customerRepository.findByIdWithVouchers(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với ID: " + voucherId));

        // Initialize vouchers list if null
        if (customer.getVouchers() == null) {
            customer.setVouchers(new ArrayList<>());
        }

        // Kiểm tra bằng voucherId
        boolean exists = customer.getVouchers().stream()
                .anyMatch(v -> v.getVoucherId().equals(voucherId));

        if (!exists) {
            throw new RuntimeException("Voucher này chưa được lưu");
        }

        // Remove voucher bằng cách filter
        customer.setVouchers(
            customer.getVouchers().stream()
                .filter(v -> !v.getVoucherId().equals(voucherId))
                .collect(Collectors.toList())
        );
        customerRepository.save(customer);
    }

    /**
     * Restore voucher to customer's saved list when order is cancelled
     * Only restore if voucher was previously saved (used in a cancelled order)
     */
    @Transactional
    public void restoreVoucher(Long userId, Long voucherId) {
        Customer customer = customerRepository.findByIdWithVouchers(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy voucher với ID: " + voucherId));

        // Initialize vouchers list if null
        if (customer.getVouchers() == null) {
            customer.setVouchers(new ArrayList<>());
        }

        // Kiểm tra xem voucher đã được lưu chưa
        boolean alreadyExists = customer.getVouchers().stream()
                .anyMatch(v -> v.getVoucherId().equals(voucherId));

        // Chỉ restore nếu chưa có trong list (đã bị xóa khi thanh toán)
        if (!alreadyExists) {
            customer.getVouchers().add(voucher);
            customerRepository.save(customer);
        }
    }

    @Transactional(readOnly = true)
    public boolean hasVoucher(Long userId, Long voucherId) {
        Customer customer = customerRepository.findByIdWithVouchers(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        // Initialize vouchers list if null
        if (customer.getVouchers() == null) {
            return false;
        }

        // Kiểm tra bằng voucherId
        return customer.getVouchers().stream()
                .anyMatch(v -> v.getVoucherId().equals(voucherId));
    }
    
    @Transactional(readOnly = true)
    public boolean isVoucherUsed(Long userId, Long voucherId) {
        return orderRepository.existsByUserUserIdAndVoucherVoucherId(userId, voucherId);
    }

    private VoucherResponseDTO mapToDTO(Voucher voucher) {
        return VoucherResponseDTO.builder()
                .voucherId(voucher.getVoucherId())
                .code(voucher.getCode())
                .name(voucher.getName())
                .description(voucher.getDescription())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .maxDiscountAmount(voucher.getMaxDiscountAmount())
                .minOrderAmount(voucher.getMinOrderAmount())
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .scope(voucher.getScope())
                .image(voucher.getImage())
                .build();
    }

    // ============ FAVORITE MOVIES METHODS ============

    @Transactional(readOnly = true)
    public List<MovieResponseDTO> getFavoriteMovies(Long userId) {
        Customer customer = customerRepository.findByIdWithFavorites(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        if (customer.getFavorites() == null || customer.getFavorites().isEmpty()) {
            return new ArrayList<>();
        }

        return customer.getFavorites().stream()
                .map(movie -> movieService.getMovieById(movie.getMovieId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public MovieResponseDTO addFavorite(Long userId, Long movieId) {
        Customer customer = customerRepository.findByIdWithFavorites(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + movieId));

        // Initialize favorites list if null
        if (customer.getFavorites() == null) {
            customer.setFavorites(new ArrayList<>());
        }

        // Kiểm tra xem phim đã được yêu thích chưa (kiểm tra bằng movieId thay vì object)
        boolean alreadyExists = customer.getFavorites().stream()
                .anyMatch(m -> m.getMovieId().equals(movieId));
        
        if (alreadyExists) {
            throw new RuntimeException("Phim này đã được thêm vào yêu thích");
        }

        // Add movie to customer's favorites list
        customer.getFavorites().add(movie);
        customerRepository.save(customer);

        return movieService.getMovieById(movieId);
    }

    @Transactional
    public void removeFavorite(Long userId, Long movieId) {
        Customer customer = customerRepository.findByIdWithFavorites(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        // Initialize favorites list if null
        if (customer.getFavorites() == null) {
            customer.setFavorites(new ArrayList<>());
        }

        // Kiểm tra bằng movieId
        boolean exists = customer.getFavorites().stream()
                .anyMatch(m -> m.getMovieId().equals(movieId));

        if (!exists) {
            throw new RuntimeException("Phim này chưa được thêm vào yêu thích");
        }

        // Remove movie bằng cách filter
        customer.setFavorites(
            customer.getFavorites().stream()
                .filter(m -> !m.getMovieId().equals(movieId))
                .collect(Collectors.toList())
        );
        customerRepository.save(customer);
    }

    @Transactional(readOnly = true)
    public boolean hasFavorite(Long userId, Long movieId) {
        Customer customer = customerRepository.findByIdWithFavorites(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + userId));

        // Initialize favorites list if null
        if (customer.getFavorites() == null) {
            return false;
        }

        // Kiểm tra bằng movieId
        return customer.getFavorites().stream()
                .anyMatch(m -> m.getMovieId().equals(movieId));
    }

    // ============ PASSWORD MANAGEMENT METHODS ============

    @Transactional(readOnly = true)
    public boolean hasPassword(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
        
        String password = user.getPassword();
        // Kiểm tra kỹ: password phải không null, không empty, và không chỉ là whitespace
        boolean hasPwd = password != null && !password.trim().isEmpty();
        
        System.out.println("=== Password Check Debug ===");
        System.out.println("User ID: " + userId);
        System.out.println("Password value: '" + password + "'");
        System.out.println("Password is null: " + (password == null));
        System.out.println("Password is empty: " + (password != null && password.isEmpty()));
        System.out.println("Password is blank: " + (password != null && password.trim().isEmpty()));
        System.out.println("hasPassword result: " + hasPwd);
        System.out.println("===========================");
        
        return hasPwd;
    }

    @Transactional
    public void updatePassword(Long userId, String oldPassword, String newPassword) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("Không tìm thấy người dùng"));

        // Kiểm tra user đã có mật khẩu chưa
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            throw new Exception("Bạn chưa có mật khẩu. Vui lòng tạo mật khẩu mới.");
        }

        // Kiểm tra mật khẩu cũ
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new Exception("Mật khẩu cũ không đúng");
        }

        // Validate mật khẩu mới - giống ràng buộc đăng ký
        if (newPassword == null || newPassword.isEmpty()) {
            throw new Exception("Mật khẩu mới không được để trống");
        }
        if (newPassword.length() < 8 || newPassword.length() > 32) {
            throw new Exception("Mật khẩu mới phải từ 8 đến 32 ký tự");
        }
        if (!newPassword.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$")) {
            throw new Exception("Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số");
        }

        // Kiểm tra mật khẩu mới phải khác mật khẩu cũ
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new Exception("Mật khẩu mới phải khác mật khẩu cũ");
        }

        // Cập nhật mật khẩu mới
        String encodedPassword = passwordEncoder.encode(newPassword);
        user.setPassword(encodedPassword);
        userRepository.save(user);
    }

    @Transactional
    public void createPassword(Long userId, String newPassword) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("Không tìm thấy người dùng"));

        // Kiểm tra user chưa có mật khẩu
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            throw new Exception("Bạn đã có mật khẩu. Vui lòng sử dụng chức năng đổi mật khẩu.");
        }

        // Validate mật khẩu mới - giống ràng buộc đăng ký
        if (newPassword == null || newPassword.isEmpty()) {
            throw new Exception("Mật khẩu không được để trống");
        }
        if (newPassword.length() < 8 || newPassword.length() > 32) {
            throw new Exception("Mật khẩu phải từ 8 đến 32 ký tự");
        }
        if (!newPassword.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$")) {
            throw new Exception("Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số");
        }

        // Tạo mật khẩu mới
        String encodedPassword = passwordEncoder.encode(newPassword);
        System.out.println("=== Creating Password Debug ===");
        System.out.println("User ID: " + userId);
        System.out.println("New password (plain): " + newPassword.substring(0, Math.min(3, newPassword.length())) + "***");
        System.out.println("Encoded password length: " + encodedPassword.length());
        System.out.println("Encoded password starts with: " + encodedPassword.substring(0, Math.min(10, encodedPassword.length())));
        
        user.setPassword(encodedPassword);
        User savedUser = userRepository.save(user);
        userRepository.flush(); // Đảm bảo lưu ngay vào database
        
        // Verify password was saved
        User verifyUser = userRepository.findById(userId).orElse(null);
        if (verifyUser != null) {
            System.out.println("Password saved: " + (verifyUser.getPassword() != null && !verifyUser.getPassword().isEmpty()));
            System.out.println("Saved password matches: " + passwordEncoder.matches(newPassword, verifyUser.getPassword()));
        }
        System.out.println("===============================");
    }
}
