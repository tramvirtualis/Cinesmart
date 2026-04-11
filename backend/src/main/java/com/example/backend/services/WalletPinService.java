package com.example.backend.services;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dtos.ForgotPinRequestDTO;
import com.example.backend.dtos.OtpSessionDTO;
import com.example.backend.dtos.ResetPinRequestDTO;
import com.example.backend.dtos.CreatePinRequestDTO;
import com.example.backend.dtos.PinStatusResponseDTO;
import com.example.backend.dtos.UpdatePinRequestDTO;
import com.example.backend.dtos.VerifyPinRequestDTO;
import com.example.backend.entities.Customer;
import com.example.backend.entities.WalletPin;
import com.example.backend.repositories.CustomerRepository;
import com.example.backend.repositories.WalletPinRepository;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service để quản lý mã PIN của ví Cinesmart
 * Sử dụng BCrypt để hash PIN, đảm bảo bảo mật tuyệt đối
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WalletPinService {

    private final WalletPinRepository walletPinRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // Cấu hình bảo mật
    private static final int MAX_FAILED_ATTEMPTS = 5; // Số lần nhập sai tối đa
    private static final int LOCK_DURATION_MINUTES = 30; // Thời gian lock (phút)
    
    // Cấu hình OTP quên PIN
    private static final int OTP_LENGTH = 6;
    private static final long FORGOT_PIN_OTP_VALIDITY_MINUTES = 5;
    private static final long FORGOT_PIN_RESEND_COOLDOWN_SECONDS = 30;
    private static final String FORGOT_PIN_OTP_SESSION_KEY = "FORGOT_PIN_OTP_SESSION";

    /**
     * Kiểm tra xem customer đã có PIN chưa
     */
    @Transactional(readOnly = true)
    public boolean hasPin(Long userId) {
        return walletPinRepository.existsByCustomerUserId(userId);
    }

    /**
     * Lấy trạng thái PIN của customer
     */
    @Transactional(readOnly = true)
    public PinStatusResponseDTO getPinStatus(Long userId) {
        Optional<WalletPin> pinOpt = walletPinRepository.findByCustomerUserId(userId);
        
        if (pinOpt.isEmpty()) {
            return PinStatusResponseDTO.builder()
                    .hasPin(false)
                    .locked(false)
                    .failedAttempts(0)
                    .build();
        }

        WalletPin pin = pinOpt.get();
        boolean isLocked = isLocked(pin);

        return PinStatusResponseDTO.builder()
                .hasPin(true)
                .locked(isLocked)
                .failedAttempts(pin.getFailedAttempts())
                .build();
    }

    /**
     * Tạo mã PIN mới
     * PIN được hash bằng BCrypt trước khi lưu vào database
     */
    @Transactional
    public void createPin(Long userId, CreatePinRequestDTO request) {
        // Validate PIN và confirm PIN khớp nhau
        if (!request.getPin().equals(request.getConfirmPin())) {
            throw new IllegalArgumentException("Mã PIN và xác nhận mã PIN không khớp");
        }

        // Kiểm tra xem đã có PIN chưa
        if (walletPinRepository.existsByCustomerUserId(userId)) {
            throw new IllegalStateException("Bạn đã có mã PIN. Vui lòng sử dụng chức năng đổi mã PIN.");
        }

        // Lấy customer
        Customer customer = customerRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));

        // Hash PIN bằng BCrypt (tự động có salt)
        // KHÔNG BAO GIỜ log PIN dạng plain text
        String hashedPin = passwordEncoder.encode(request.getPin());
        
        log.info("Creating PIN for customer ID: {}", userId);
        // KHÔNG log PIN, chỉ log việc tạo PIN

        // Tạo và lưu PIN
        WalletPin walletPin = WalletPin.builder()
                .customer(customer)
                .hashedPin(hashedPin)
                .failedAttempts(0)
                .lockedUntil(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        walletPinRepository.save(walletPin);
        log.info("PIN created successfully for customer ID: {}", userId);
    }

    /**
     * Cập nhật mã PIN
     * Yêu cầu nhập đúng PIN cũ
     */
    @Transactional
    public void updatePin(Long userId, UpdatePinRequestDTO request) {
        // Validate new PIN và confirm PIN khớp nhau
        if (!request.getNewPin().equals(request.getConfirmPin())) {
            throw new IllegalArgumentException("Mã PIN mới và xác nhận mã PIN mới không khớp");
        }

        // Validate new PIN khác current PIN
        if (request.getCurrentPin().equals(request.getNewPin())) {
            throw new IllegalArgumentException("Mã PIN mới phải khác mã PIN hiện tại");
        }

        // Lấy PIN hiện tại
        WalletPin walletPin = walletPinRepository.findByCustomerUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Bạn chưa có mã PIN. Vui lòng tạo mã PIN trước."));

        // Kiểm tra xem có bị lock không
        if (isLocked(walletPin)) {
            throw new IllegalStateException("Mã PIN của bạn đang bị khóa. Vui lòng thử lại sau " + 
                    getRemainingLockTime(walletPin) + " phút.");
        }

        // Xác thực PIN hiện tại
        if (!passwordEncoder.matches(request.getCurrentPin(), walletPin.getHashedPin())) {
            // Tăng số lần nhập sai
            walletPin.setFailedAttempts(walletPin.getFailedAttempts() + 1);
            
            // Nếu vượt quá số lần cho phép, lock PIN
            if (walletPin.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
                walletPin.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_DURATION_MINUTES));
                log.warn("PIN locked for customer ID: {} due to too many failed attempts", userId);
                walletPinRepository.save(walletPin);
                throw new IllegalStateException("Bạn đã nhập sai mã PIN quá nhiều lần. Mã PIN đã bị khóa trong " + 
                        LOCK_DURATION_MINUTES + " phút.");
            }
            
            walletPinRepository.save(walletPin);
            int remainingAttempts = MAX_FAILED_ATTEMPTS - walletPin.getFailedAttempts();
            throw new IllegalArgumentException("Mã PIN hiện tại không đúng. Còn " + remainingAttempts + " lần thử.");
        }

        // PIN đúng, reset failed attempts và hash PIN mới
        String hashedNewPin = passwordEncoder.encode(request.getNewPin());
        
        walletPin.setHashedPin(hashedNewPin);
        walletPin.setFailedAttempts(0); // Reset failed attempts
        walletPin.setLockedUntil(null); // Unlock nếu đang bị lock
        walletPin.setUpdatedAt(LocalDateTime.now());

        walletPinRepository.save(walletPin);
        log.info("PIN updated successfully for customer ID: {}", userId);
    }

    /**
     * Xác thực mã PIN (dùng cho các giao dịch quan trọng)
     * Trả về true nếu PIN đúng, false nếu sai
     * Tự động tăng failed attempts và lock nếu cần
     * 
     * Note: noRollbackFor để đảm bảo failedAttempts được lưu vào DB
     * ngay cả khi throw exception (vì RuntimeException sẽ rollback transaction)
     */
    @Transactional(noRollbackFor = {IllegalArgumentException.class, IllegalStateException.class})
    public boolean verifyPin(Long userId, VerifyPinRequestDTO request) {
        WalletPin walletPin = walletPinRepository.findByCustomerUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Bạn chưa có mã PIN. Vui lòng tạo mã PIN trước."));

        // Kiểm tra xem có bị lock không
        if (isLocked(walletPin)) {
            throw new IllegalStateException("Mã PIN của bạn đang bị khóa. Vui lòng thử lại sau " + 
                    getRemainingLockTime(walletPin) + " phút.");
        }

        // Xác thực PIN
        boolean isValid = passwordEncoder.matches(request.getPin(), walletPin.getHashedPin());

        if (isValid) {
            // PIN đúng, reset failed attempts
            walletPin.setFailedAttempts(0);
            walletPin.setLockedUntil(null);
            walletPinRepository.save(walletPin);
            log.info("PIN verified successfully for customer ID: {}", userId);
            return true;
        } else {
            // PIN sai, tăng failed attempts
            walletPin.setFailedAttempts(walletPin.getFailedAttempts() + 1);
            
            // Nếu vượt quá số lần cho phép, lock PIN
            if (walletPin.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
                walletPin.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_DURATION_MINUTES));
                log.warn("PIN locked for customer ID: {} due to too many failed attempts", userId);
                walletPinRepository.save(walletPin);
                throw new IllegalStateException("Bạn đã nhập sai mã PIN quá nhiều lần. Mã PIN đã bị khóa trong " + 
                        LOCK_DURATION_MINUTES + " phút.");
            }
            
            walletPinRepository.save(walletPin);
            walletPinRepository.flush(); // Force flush để đảm bảo save được commit ngay
            int remainingAttempts = MAX_FAILED_ATTEMPTS - walletPin.getFailedAttempts();
            log.info("PIN verification failed for customer ID: {}. Failed attempts: {}, Remaining: {}", 
                    userId, walletPin.getFailedAttempts(), remainingAttempts);
            throw new IllegalArgumentException("Mã PIN không đúng. Còn " + remainingAttempts + " lần thử.");
        }
    }

    /**
     * Kiểm tra xem PIN có đang bị lock không
     */
    private boolean isLocked(WalletPin walletPin) {
        if (walletPin.getLockedUntil() == null) {
            return false;
        }
        
        // Nếu thời gian lock đã hết, tự động unlock
        if (LocalDateTime.now().isAfter(walletPin.getLockedUntil())) {
            walletPin.setLockedUntil(null);
            walletPin.setFailedAttempts(0);
            walletPinRepository.save(walletPin);
            return false;
        }
        
        return true;
    }

    /**
     * Tính thời gian còn lại của lock (phút)
     */
    private long getRemainingLockTime(WalletPin walletPin) {
        if (walletPin.getLockedUntil() == null) {
            return 0;
        }
        
        long minutes = java.time.Duration.between(LocalDateTime.now(), walletPin.getLockedUntil()).toMinutes();
        return Math.max(0, minutes);
    }
    
    /**
     * Gửi OTP để quên mã PIN
     */
    @Transactional
    public void sendForgotPinOtp(ForgotPinRequestDTO request, HttpSession session) {
        String email = request.getEmail();
        
        // Kiểm tra email có tồn tại trong hệ thống không
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không đúng. Vui lòng kiểm tra lại email của bạn."));
        
        // Kiểm tra customer có PIN chưa
        if (!walletPinRepository.existsByCustomerUserId(customer.getUserId())) {
            throw new IllegalStateException("Bạn chưa có mã PIN. Vui lòng tạo mã PIN trước.");
        }
        
        // Kiểm tra cooldown 30 giây từ session
        OtpSessionDTO existingOtp = (OtpSessionDTO) session.getAttribute(FORGOT_PIN_OTP_SESSION_KEY);
        long nowMillis = System.currentTimeMillis();
        
        if (existingOtp != null && existingOtp.getEmail().equals(email)) {
            long timeSinceLastSent = (nowMillis - existingOtp.getLastSentAtMillis()) / 1000;
            
            if (timeSinceLastSent < FORGOT_PIN_RESEND_COOLDOWN_SECONDS) {
                long remainingSeconds = FORGOT_PIN_RESEND_COOLDOWN_SECONDS - timeSinceLastSent;
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
        otpSession.setExpiresAtMillis(nowMillis + (FORGOT_PIN_OTP_VALIDITY_MINUTES * 60 * 1000));
        otpSession.setLastSentAtMillis(nowMillis);
        
        session.setAttribute(FORGOT_PIN_OTP_SESSION_KEY, otpSession);
        session.setMaxInactiveInterval((int) (FORGOT_PIN_OTP_VALIDITY_MINUTES * 60));
        
        // Gửi email
        emailService.sendForgotPinOtpEmail(email, otpCode);
        
        log.info("Forgot PIN OTP sent to email: {}", email);
    }
    
    /**
     * Đặt lại mã PIN sau khi xác thực OTP
     */
    @Transactional
    public void resetPinWithOtp(ResetPinRequestDTO request, HttpSession session) {
        String email = request.getEmail();
        
        // Validate new PIN và confirm PIN khớp nhau
        if (!request.getNewPin().equals(request.getConfirmPin())) {
            throw new IllegalArgumentException("Mã PIN mới và xác nhận mã PIN không khớp");
        }
        
        // Lấy customer từ email
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trong hệ thống"));
        
        // Xác thực OTP từ session
        OtpSessionDTO otpSession = (OtpSessionDTO) session.getAttribute(FORGOT_PIN_OTP_SESSION_KEY);
        if (otpSession == null) {
            throw new RuntimeException("Không tìm thấy OTP trong session. Vui lòng gửi lại OTP");
        }
        
        // Kiểm tra email có khớp không
        if (!otpSession.getEmail().equals(email)) {
            throw new RuntimeException("Email không khớp với email đã gửi OTP");
        }
        
        // Kiểm tra OTP có khớp không
        if (!otpSession.getOtpCode().equals(request.getOtp())) {
            throw new RuntimeException("Mã OTP không đúng");
        }
        
        // Kiểm tra OTP có hết hạn không
        long nowMillis = System.currentTimeMillis();
        if (nowMillis > otpSession.getExpiresAtMillis()) {
            session.removeAttribute(FORGOT_PIN_OTP_SESSION_KEY);
            throw new RuntimeException("Mã OTP đã hết hạn. Vui lòng gửi lại OTP");
        }
        
        // Lấy PIN hiện tại
        WalletPin walletPin = walletPinRepository.findByCustomerUserId(customer.getUserId())
                .orElseThrow(() -> new IllegalStateException("Bạn chưa có mã PIN. Vui lòng tạo mã PIN trước."));
        
        // Hash PIN mới bằng BCrypt
        String hashedNewPin = passwordEncoder.encode(request.getNewPin());
        
        // Cập nhật PIN
        walletPin.setHashedPin(hashedNewPin);
        walletPin.setFailedAttempts(0); // Reset failed attempts
        walletPin.setLockedUntil(null); // Unlock nếu đang bị lock
        walletPin.setUpdatedAt(LocalDateTime.now());
        
        walletPinRepository.save(walletPin);
        
        // Xóa OTP khỏi session sau khi reset thành công
        session.removeAttribute(FORGOT_PIN_OTP_SESSION_KEY);
        
        log.info("PIN reset successfully for customer ID: {} via forgot PIN", customer.getUserId());
    }
    
    /**
     * Tạo mã OTP ngẫu nhiên
     */
    private String generateOtpCode() {
        Random random = new Random();
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }
}

