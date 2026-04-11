package com.example.backend.services;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;

import com.example.backend.dtos.LoginResponseDTO;
import com.example.backend.dtos.OtpSessionDTO;
import com.example.backend.dtos.RegisterRequestDTO;
import com.example.backend.dtos.RegisterResponseDTO;
import com.example.backend.dtos.ResetTokenSessionDTO;
import com.example.backend.dtos.SendOtpRequestDTO;
import com.example.backend.entities.Admin;
import com.example.backend.entities.Customer;
import com.example.backend.entities.Manager;
import com.example.backend.entities.User;
import com.example.backend.repositories.AdminRepository;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.ManagerRepository;
import com.example.backend.repositories.UserRepository;
import com.example.backend.utils.JwtUtils;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final CustomerRepository customerRepository;
    private final ManagerRepository managerRepository;
    private final AdminRepository adminRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    @Value("${google.client-id}")
    private String googleClientId;

    @Value("${google.client-secret}")
    private String googleClientSecret;

    @Value("${google.redirect-uri:postmessage}")
    private String googleRedirectUri;
    
    private static final int OTP_LENGTH = 6;
    // Đăng ký tài khoản
    private static final long REGISTER_OTP_VALIDITY_MINUTES = 5;
    private static final long REGISTER_RESEND_COOLDOWN_SECONDS = 30;
    private static final String REGISTER_SESSION_OTP_KEY = "REGISTER_OTP_SESSION";

    // Quên mật khẩu
    private static final int FORGOT_OTP_EXPIRY_MINUTES = 5;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 15;
    private static final int FORGOT_RESEND_COOLDOWN_SECONDS = 30;
    private static final String FORGOT_OTP_SESSION_KEY = "FORGOT_PASSWORD_OTP_SESSION";
    private static final String RESET_TOKEN_SESSION_KEY = "PASSWORD_RESET_TOKEN_SESSION";
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,32}$");
    
    @Transactional
    public String sendOtp(SendOtpRequestDTO request, HttpSession session) {
        String email = request.getEmail();
        
        // Kiểm tra email đã tồn tại trong hệ thống chưa
        if (customerRepository.existsByEmail(email)) {
            throw new RuntimeException("Email đã được đăng ký");
        }
        
        // Kiểm tra cooldown 30 giây từ session (chỉ áp dụng cho cùng email)
        OtpSessionDTO existingOtp = (OtpSessionDTO) session.getAttribute(REGISTER_SESSION_OTP_KEY);
        long nowMillis = System.currentTimeMillis();
        
        if (existingOtp != null && existingOtp.getEmail().equals(email)) {
            long timeSinceLastSent = (nowMillis - existingOtp.getLastSentAtMillis()) / 1000; // Convert to seconds
            
            if (timeSinceLastSent < REGISTER_RESEND_COOLDOWN_SECONDS) {
                long remainingSeconds = REGISTER_RESEND_COOLDOWN_SECONDS - timeSinceLastSent;
                throw new RuntimeException("Vui lòng đợi " + remainingSeconds + " giây trước khi gửi lại OTP");
            }
        }
        
        // Tạo mã OTP ngẫu nhiên
        String otpCode = generateOtpCode();
        
        // Lưu OTP vào session với thời gian hết hạn 5 phút
        OtpSessionDTO otpSession = new OtpSessionDTO();
        otpSession.setEmail(email);
        otpSession.setOtpCode(otpCode);
        otpSession.setCreatedAtMillis(nowMillis);
        otpSession.setExpiresAtMillis(nowMillis + (REGISTER_OTP_VALIDITY_MINUTES * 60 * 1000)); // 5 minutes in milliseconds
        otpSession.setLastSentAtMillis(nowMillis);
        
        session.setAttribute(REGISTER_SESSION_OTP_KEY, otpSession);
        // Set session timeout là 5 phút (300 giây) + một chút buffer
        session.setMaxInactiveInterval((int) (REGISTER_OTP_VALIDITY_MINUTES * 60));
        
        // Gửi email
        emailService.sendOtpEmail(email, otpCode);
        
        return "Mã OTP đã được gửi đến email của bạn";
    }
    
    @Transactional
    public RegisterResponseDTO register(RegisterRequestDTO request, HttpSession session) {
        // Validate mật khẩu khớp
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu xác nhận không khớp");
        }
        
        // Kiểm tra username đã tồn tại
        if (customerRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }
        
        // Kiểm tra email đã tồn tại
        if (customerRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được đăng ký");
        }
        
        // Xác thực OTP từ session
        OtpSessionDTO otpSession = (OtpSessionDTO) session.getAttribute(REGISTER_SESSION_OTP_KEY);
        if (otpSession == null) {
            throw new RuntimeException("Không tìm thấy OTP trong session. Vui lòng gửi lại OTP");
        }
        
        // Kiểm tra email có khớp không
        if (!otpSession.getEmail().equals(request.getEmail())) {
            throw new RuntimeException("Email không khớp với email đã gửi OTP");
        }
        
        // Kiểm tra OTP có khớp không
        if (!otpSession.getOtpCode().equals(request.getOtp())) {
            throw new RuntimeException("Mã OTP không đúng");
        }
        
        // Kiểm tra OTP có hết hạn không
        long nowMillis = System.currentTimeMillis();
        if (nowMillis > otpSession.getExpiresAtMillis()) {
            session.removeAttribute(REGISTER_SESSION_OTP_KEY);
            throw new RuntimeException("Mã OTP đã hết hạn. Vui lòng gửi lại OTP");
        }
        
        // Xóa OTP khỏi session sau khi xác thực thành công
        session.removeAttribute(REGISTER_SESSION_OTP_KEY);
        
        // Tạo customer mới
        Customer customer = Customer.builder()
                .name(request.getFullName())
                .dob(request.getDob())
                .phone(request.getMobile())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .status(true)
                .build();
        
        Customer savedCustomer = customerRepository.save(customer);
        
        return new RegisterResponseDTO(
                savedCustomer.getUserId(),
                savedCustomer.getUsername(),
                savedCustomer.getEmail(),
                "Đăng ký thành công"
        );
    }
    
    /**
     * Forgot password - Send OTP
     */
    public void sendForgotPasswordOtp(String email, HttpSession session) {
        if (!customerRepository.existsByEmail(email)) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }

        OtpSessionDTO existingSession = (OtpSessionDTO) session.getAttribute(FORGOT_OTP_SESSION_KEY);
        if (existingSession != null && existingSession.getEmail().equals(email)) {
            long currentTimeMillis = System.currentTimeMillis();
            long secondsSinceLastSent = (currentTimeMillis - existingSession.getLastSentAtMillis()) / 1000;

            if (secondsSinceLastSent < FORGOT_RESEND_COOLDOWN_SECONDS) {
                throw new RuntimeException(
                        "Vui lòng đợi " + (FORGOT_RESEND_COOLDOWN_SECONDS - secondsSinceLastSent) +
                        " giây trước khi gửi lại OTP");
            }
        }

        String otpCode = generateOtpCode();
        long currentTimeMillis = System.currentTimeMillis();
        long expiryTimeMillis = currentTimeMillis + (FORGOT_OTP_EXPIRY_MINUTES * 60 * 1000);

        OtpSessionDTO otpSession = new OtpSessionDTO(
                email,
                otpCode,
                currentTimeMillis,
                expiryTimeMillis,
                currentTimeMillis
        );

        session.setAttribute(FORGOT_OTP_SESSION_KEY, otpSession);

        emailService.sendForgotPasswordOtpEmail(email, otpCode);
    }

    /**
     * Forgot password - Verify OTP
     */
    public String verifyForgotPasswordOtp(String email, String otpCode, HttpSession session) {
        OtpSessionDTO otpSession = (OtpSessionDTO) session.getAttribute(FORGOT_OTP_SESSION_KEY);

        if (otpSession == null) {
            throw new RuntimeException("Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới.");
        }

        if (!otpSession.getEmail().equals(email)) {
            throw new RuntimeException("Email không khớp với mã OTP đã gửi");
        }

        long currentTimeMillis = System.currentTimeMillis();
        if (currentTimeMillis > otpSession.getExpiresAtMillis()) {
            session.removeAttribute(FORGOT_OTP_SESSION_KEY);
            throw new RuntimeException("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
        }

        if (!otpSession.getOtpCode().equals(otpCode)) {
            throw new RuntimeException("Mã OTP không đúng");
        }

        session.removeAttribute(FORGOT_OTP_SESSION_KEY);

        String resetToken = UUID.randomUUID().toString();
        long expiryTimeMillis = currentTimeMillis + (RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

        ResetTokenSessionDTO resetTokenSession = new ResetTokenSessionDTO(
                resetToken,
                email,
                currentTimeMillis,
                expiryTimeMillis
        );

        session.setAttribute(RESET_TOKEN_SESSION_KEY, resetTokenSession);

        return resetToken;
    }

    /**
     * Forgot password - Reset password
     */
    @Transactional
    public void resetForgotPassword(String token, String newPassword, HttpSession session) {
        if (!PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new RuntimeException("Mật khẩu phải từ 8 đến 32 ký tự và chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số");
        }

        ResetTokenSessionDTO resetTokenSession = (ResetTokenSessionDTO) session.getAttribute(RESET_TOKEN_SESSION_KEY);

        if (resetTokenSession == null) {
            throw new RuntimeException("Token không hợp lệ hoặc đã hết phiên làm việc");
        }

        if (!resetTokenSession.getToken().equals(token)) {
            throw new RuntimeException("Token không hợp lệ");
        }

        long currentTimeMillis = System.currentTimeMillis();
        if (currentTimeMillis > resetTokenSession.getExpiresAtMillis()) {
            session.removeAttribute(RESET_TOKEN_SESSION_KEY);
            throw new RuntimeException("Token đã hết hạn. Vui lòng yêu cầu mã OTP mới.");
        }

        Customer customer = customerRepository.findByEmail(resetTokenSession.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        customer.setPassword(passwordEncoder.encode(newPassword));
        customerRepository.save(customer);

        session.removeAttribute(RESET_TOKEN_SESSION_KEY);
    }

    /**
     * Forgot password - Get remaining OTP time
     */
    public long getForgotPasswordOtpRemainingSeconds(HttpSession session) {
        OtpSessionDTO otpSession = (OtpSessionDTO) session.getAttribute(FORGOT_OTP_SESSION_KEY);

        if (otpSession == null) {
            return 0;
        }

        long currentTimeMillis = System.currentTimeMillis();
        long remainingMillis = otpSession.getExpiresAtMillis() - currentTimeMillis;

        return Math.max(0, remainingMillis / 1000);
    }
    
    private String generateOtpCode() {
        Random random = new Random();
        StringBuilder otp = new StringBuilder();
        
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }
        
        return otp.toString();
    }

    public LoginResponseDTO login(String username, String password) throws Exception {
        // Chỉ tìm kiếm bằng username (không hỗ trợ email)
        Optional<User> userOpt = userRepository.findByUsername(username);
        
        if (userOpt.isEmpty()) {
            throw new Exception("Tên đăng nhập hoặc mật khẩu không đúng");
        }

        User user = userOpt.get();
        
        System.out.println("=== Login Debug ===");
        System.out.println("Login attempt for: " + username);
        System.out.println("User ID: " + user.getUserId());
        System.out.println("User has password: " + (user.getPassword() != null && !user.getPassword().trim().isEmpty()));
        if (user.getPassword() != null) {
            System.out.println("Password length: " + user.getPassword().length());
        }
        System.out.println("=========================");
        
        // Kiểm tra user có password không
        if (user.getPassword() == null || user.getPassword().trim().isEmpty()) {
            throw new Exception("Tài khoản này chưa có mật khẩu. Vui lòng đăng nhập bằng Google hoặc tạo mật khẩu mới.");
        }

        boolean passwordMatches = passwordEncoder.matches(password, user.getPassword());
        System.out.println("Password matches: " + passwordMatches);
        
        if (!passwordMatches) {
            throw new Exception("Tên đăng nhập hoặc mật khẩu không đúng");
        }

        // Không chặn đăng nhập nếu user bị blocked, nhưng sẽ lưu status để frontend hiển thị
        // User bị blocked vẫn có thể đăng nhập nhưng không thể mua hàng

        String role = "";
        String name = null;
        LocalDate dob = null;
        Long cinemaComplexId = null;

        // Phân loại user & lấy dữ liệu tương ứng
        // Với JOINED inheritance, cần kiểm tra từng repository để đảm bảo subclass được load đúng
        // Sử dụng try-catch để tránh ClassCastException khi query
        try {
            Optional<Manager> managerOpt = managerRepository.findByUsername(username);
            System.out.println("DEBUG: Checking Manager for username: " + username + ", found: " + managerOpt.isPresent());
            
            if (managerOpt.isPresent()) {
                role = "MANAGER";
                Manager m = managerOpt.get();
                System.out.println("DEBUG: User is MANAGER, cinemaComplexId: " + (m.getCinemaComplex() != null ? m.getCinemaComplex().getComplexId() : "null"));
                if (m.getCinemaComplex() != null) {
                    cinemaComplexId = m.getCinemaComplex().getComplexId();
                }
            }
        } catch (Exception e) {
            System.out.println("DEBUG: Error checking Manager: " + e.getMessage());
            // Tiếp tục kiểm tra các loại user khác
        }
        
        // Nếu chưa xác định được role, kiểm tra Admin
        if (role.isEmpty()) {
            try {
                Optional<Admin> adminOpt = adminRepository.findByUsername(username);
                System.out.println("DEBUG: Checking Admin for username: " + username + ", found: " + adminOpt.isPresent());
                
                if (adminOpt.isPresent()) {
                    role = "ADMIN";
                    System.out.println("DEBUG: User is ADMIN");
                }
            } catch (Exception e) {
                System.out.println("DEBUG: Error checking Admin: " + e.getMessage());
                // Tiếp tục kiểm tra Customer
            }
        }
        
        // Nếu chưa xác định được role, kiểm tra Customer
        if (role.isEmpty()) {
            try {
                Optional<Customer> customerOpt = customerRepository.findByUsername(username);
                System.out.println("DEBUG: Checking Customer for username: " + username + ", found: " + customerOpt.isPresent());
                
                if (customerOpt.isPresent()) {
                    role = "CUSTOMER";
                    Customer c = customerOpt.get();
                    name = c.getName();
                    dob = c.getDob();
                    System.out.println("DEBUG: User is CUSTOMER");
                }
            } catch (Exception e) {
                System.out.println("DEBUG: Error checking Customer: " + e.getMessage());
            }
        }
        
        // Nếu vẫn chưa xác định được, mặc định là CUSTOMER
        if (role.isEmpty()) {
            role = "CUSTOMER";
            System.out.println("DEBUG: User type unknown, defaulting to CUSTOMER");
        }
        
        System.out.println("DEBUG: Final role determined: " + role);
        
        // Đảm bảo role không rỗng
        if (role.isEmpty()) {
            throw new Exception("Không thể xác định quyền của người dùng");
        }

        // Tạo JWT
        String token = jwtUtils.generateJwtToken(username, role);

        // Build Response
        LoginResponseDTO response = LoginResponseDTO.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .name(name)
                .dob(dob)
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus())
                .address(user.getAddress())
                .role(role)
                .token(token)
                .cinemaComplexId(cinemaComplexId)
                .avatar(user.getAvatar()) // Thêm avatar vào response
                .build();
        
        System.out.println("DEBUG: LoginResponseDTO - role: " + response.getRole() + ", token: " + (response.getToken() != null ? "present" : "null"));
        
        return response;
    }

    public LoginResponseDTO loginWithGoogle(String authorizationCode) throws Exception {
        if (authorizationCode == null || authorizationCode.isBlank()) {
            throw new Exception("Mã xác thực Google không hợp lệ");
        }

        GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                new NetHttpTransport(),
                JacksonFactory.getDefaultInstance(),
                "https://oauth2.googleapis.com/token",
                googleClientId,
                googleClientSecret,
                authorizationCode,
                googleRedirectUri
        ).execute();

        String idTokenString = tokenResponse.getIdToken();
        if (idTokenString == null || idTokenString.isBlank()) {
            throw new Exception("Không thể xác thực người dùng với Google");
        }

        GoogleIdToken verifierToken = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build()
                .verify(idTokenString);

        if (verifierToken == null) {
            throw new Exception("Token Google không hợp lệ");
        }

        GoogleIdToken.Payload payload = verifierToken.getPayload();
        String email = payload.getEmail();
        String name = (String) payload.get("name");

        if (email == null || email.isBlank()) {
            throw new Exception("Không thể lấy email từ tài khoản Google");
        }

        Customer customer = customerRepository.findByEmail(email)
                .orElseGet(() -> createCustomerFromGoogle(email, name));

        if (Boolean.FALSE.equals(customer.getStatus())) {
            throw new Exception("Tài khoản của bạn đã bị chặn. Vui lòng liên hệ quản trị viên.");
        }

        boolean shouldUpdate = false;
        if ((customer.getName() == null || customer.getName().isBlank()) && name != null) {
            customer.setName(name);
            shouldUpdate = true;
        }
        if (shouldUpdate) {
            customer = customerRepository.save(customer);
        }

        return buildCustomerLoginResponse(customer);
    }

    private Customer createCustomerFromGoogle(String email, String name) {
        String username = generateUsernameFromEmail(email);
        Customer newCustomer = Customer.builder()
                .email(email)
                .username(username)
                .name(name)
                .password(null) // User đăng nhập bằng Google không có password, sẽ tạo sau nếu cần
                .status(true)
                .build();

        return customerRepository.save(newCustomer);
    }

    private String generateUsernameFromEmail(String email) {
        String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        if (base.isBlank()) {
            base = "user";
        }
        String candidate = base;
        int suffix = 1;

        while (userRepository.findByUsername(candidate).isPresent()) {
            candidate = base + suffix;
            suffix++;
        }
        return candidate;
    }

    private LoginResponseDTO buildCustomerLoginResponse(Customer customer) {
        String token = jwtUtils.generateJwtToken(customer.getUsername(), "CUSTOMER");

        return LoginResponseDTO.builder()
                .userId(customer.getUserId())
                .username(customer.getUsername())
                .name(customer.getName())
                .dob(customer.getDob())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .status(customer.getStatus())
                .address(customer.getAddress())
                .role("CUSTOMER")
                .token(token)
                .avatar(customer.getAvatar()) // Thêm avatar vào response
                .build();
    }
}