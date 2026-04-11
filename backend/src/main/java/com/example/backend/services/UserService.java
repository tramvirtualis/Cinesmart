package com.example.backend.services;

import com.example.backend.dtos.CreateStaffRequestDTO;
import com.example.backend.dtos.UserResponseDTO;
import com.example.backend.entities.*;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final ManagerRepository managerRepository;
    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    private final CinemaComplexRepository cinemaComplexRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;
    
    /**
     * Lấy danh sách tất cả users với filter
     */
    public List<UserResponseDTO> getAllUsers(String searchTerm, String role, Boolean status, String province) {
        log.info("Loading all users with filters - searchTerm: {}, role: {}, status: {}, province: {}", 
                searchTerm, role, status, province);
        
        // Load tất cả users từ các repository riêng để đảm bảo type được xác định đúng
        List<User> allUsers = new java.util.ArrayList<>();
        
        // Load Admins - Thêm log để debug
        List<Admin> admins = adminRepository.findAll();
        log.info("Loaded {} admins", admins.size());
        allUsers.addAll(admins);
        
        // Load Managers với cinemaComplex
        List<Manager> managers = managerRepository.findAll();
        log.info("Loaded {} managers", managers.size());
        managers.forEach(manager -> {
            // Eager load cinemaComplex
            if (manager.getCinemaComplex() != null) {
                manager.getCinemaComplex().getComplexId();
            }
        });
        allUsers.addAll(managers);
        
        // Load Customers
        List<Customer> customers = customerRepository.findAll();
        log.info("Loaded {} customers", customers.size());
        allUsers.addAll(customers);
        
        log.info("Total users loaded: {}", allUsers.size());
        
        return allUsers.stream()
                .filter(user -> {
                    // Filter by search term
                    if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                        String search = searchTerm.toLowerCase();
                        boolean matches = (user.getUsername() != null && user.getUsername().toLowerCase().contains(search)) ||
                                        (user.getEmail() != null && user.getEmail().toLowerCase().contains(search)) ||
                                        (user.getPhone() != null && user.getPhone().toLowerCase().contains(search));
                        if (!matches) return false;
                    }
                    
                    // Filter by role
                    if (role != null && !role.trim().isEmpty()) {
                        String userRole = getUserRole(user);
                        log.debug("User {} has role: {}, filtering by: {}", user.getUserId(), userRole, role);
                        if (!role.equals(userRole)) return false;
                    }
                    
                    // Filter by status
                    if (status != null) {
                        if (user.getStatus() == null || !user.getStatus().equals(status)) return false;
                    }
                    
                    // Filter by province
                    if (province != null && !province.trim().isEmpty()) {
                        String userProvince = getUserProvince(user);
                        if (!province.equals(userProvince)) return false;
                    }
                    
                    return true;
                })
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Tạo tài khoản staff (Admin hoặc Manager)
     */
    @Transactional
    public UserResponseDTO createStaff(CreateStaffRequestDTO request) throws Exception {
        // Kiểm tra username đã tồn tại chưa
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new Exception("Username đã tồn tại");
        }
        
        // Kiểm tra email đã tồn tại chưa
        if (customerRepository.existsByEmail(request.getEmail())) {
            throw new Exception("Email đã được sử dụng");
        }
        
        // Kiểm tra Manager phải có cinemaComplexId
        if ("MANAGER".equals(request.getRole()) && request.getCinemaComplexId() == null) {
            throw new Exception("Manager cần gán vào một cụm rạp");
        }
        
        // Tạo Address
        Address address = Address.builder()
                .description(request.getAddressDescription())
                .province(request.getAddressProvince())
                .build();
        address = addressRepository.save(address);
        
        // Encode password
        String encodedPassword = passwordEncoder.encode(request.getPassword());
        
        User savedUser;
        
        if ("ADMIN".equals(request.getRole())) {
            // Tạo Admin
            Admin admin = Admin.builder()
                    .username(request.getUsername())
                    .password(encodedPassword)
                    .email(request.getEmail())
                    .phone(request.getPhone())
                    .address(address)
                    .status(request.getStatus())
                    .build();
            savedUser = adminRepository.save(admin);
            log.info("Created new Admin with ID: {}", savedUser.getUserId());
        } else if ("MANAGER".equals(request.getRole())) {
            // Tạo Manager
            CinemaComplex cinemaComplex = cinemaComplexRepository.findById(request.getCinemaComplexId())
                    .orElseThrow(() -> new Exception("Không tìm thấy cụm rạp với ID: " + request.getCinemaComplexId()));
            
            Manager manager = Manager.builder()
                    .username(request.getUsername())
                    .password(encodedPassword)
                    .email(request.getEmail())
                    .phone(request.getPhone())
                    .address(address)
                    .status(request.getStatus())
                    .cinemaComplex(cinemaComplex)
                    .build();
            savedUser = managerRepository.save(manager);
            log.info("Created new Manager with ID: {} for cinema complex: {}", 
                    savedUser.getUserId(), cinemaComplex.getComplexId());
        } else {
            throw new Exception("Role không hợp lệ. Chỉ cho phép ADMIN hoặc MANAGER");
        }
        
        return mapToDTO(savedUser);
    }
    
    /**
     * Toggle status của user (chặn/bỏ chặn)
     */
    @Transactional
    public UserResponseDTO toggleUserStatus(Long userId, String username) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("Không tìm thấy user với ID: " + userId));
        
        // Không cho phép chặn Admin
        if (user instanceof Admin) {
            throw new Exception("Không thể thay đổi trạng thái của Admin");
        }
        
        // Toggle status
        user.setStatus(!user.getStatus());
        User updatedUser = userRepository.save(user);
        
        log.info("Toggled status for user ID: {} to {}", userId, updatedUser.getStatus());
        
        // Log activity - username được truyền từ controller
        log.info("Attempting to log activity - username: {}", username);
        if (username != null && !username.isEmpty()) {
            try {
                String actionDescription = updatedUser.getStatus() 
                    ? "Bỏ chặn người dùng" 
                    : "Chặn người dùng";
                String userDisplayName = updatedUser.getUsername();
                
                log.info("Logging user activity - Admin: {}, Action: {}, User: {}, Status: {}", 
                        username, actionDescription, userDisplayName, updatedUser.getStatus());
                
                activityLogService.logActivity(
                    username,
                    Action.UPDATE,
                    ObjectType.USER,
                    updatedUser.getUserId(),
                    userDisplayName,
                    actionDescription + ": " + userDisplayName
                );
                
                log.info("User activity logged successfully");
            } catch (Exception e) {
                log.error("ERROR: Failed to log user activity: {}", e.getMessage(), e);
                System.err.println("ERROR: Failed to log user activity: " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            log.warn("Cannot log activity: Username is null or empty");
        }
        
        return mapToDTO(updatedUser);
    }
    
    /**
     * Map User entity sang UserResponseDTO
     */
    private UserResponseDTO mapToDTO(User user) {
        String role = getUserRole(user);
        Long cinemaComplexId = null;
        
        // CRITICAL FIX: Check class type chính xác
        String className = user.getClass().getSimpleName();
        log.debug("Mapping user ID: {}, class: {}, role: {}", user.getUserId(), className, role);
        
        if (user instanceof Manager) {
            Manager manager = (Manager) user;
            cinemaComplexId = manager.getCinemaComplex() != null ? 
                    manager.getCinemaComplex().getComplexId() : null;
        }
        
        String address = getUserAddress(user);
        
        UserResponseDTO dto = UserResponseDTO.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(address)
                .status(user.getStatus())
                .role(role)
                .cinemaComplexId(cinemaComplexId)
                .avatar(user.getAvatar())
                .build();
        
        log.debug("Mapped DTO: userId={}, role={}", dto.getUserId(), dto.getRole());
        return dto;
    }
    
    /**
     * Lấy role của user - IMPROVED với fallback check
     */
    private String getUserRole(User user) {
        // Method 1: instanceof check (should work if entities are properly configured)
        if (user instanceof Admin) {
            log.debug("User {} detected as Admin via instanceof", user.getUserId());
            return "ADMIN";
        } else if (user instanceof Manager) {
            log.debug("User {} detected as Manager via instanceof", user.getUserId());
            return "MANAGER";
        } else if (user instanceof Customer) {
            log.debug("User {} detected as Customer via instanceof", user.getUserId());
            return "USER";
        }
        
        // Method 2: Fallback - check class name
        String className = user.getClass().getSimpleName();
        log.warn("instanceof check failed for user {}. Using class name: {}", user.getUserId(), className);
        
        if (className.contains("Admin")) {
            return "ADMIN";
        } else if (className.contains("Manager")) {
            return "MANAGER";
        } else if (className.contains("Customer")) {
            return "USER";
        }
        
        // Method 3: Last resort - check if user exists in specific repository
        if (adminRepository.existsById(user.getUserId())) {
            log.warn("User {} detected as Admin via repository check", user.getUserId());
            return "ADMIN";
        } else if (managerRepository.existsById(user.getUserId())) {
            log.warn("User {} detected as Manager via repository check", user.getUserId());
            return "MANAGER";
        }
        
        log.warn("Could not determine role for user {}. Defaulting to USER", user.getUserId());
        return "USER"; // Default
    }
    
    /**
     * Lấy địa chỉ dạng string "description, province"
     */
    private String getUserAddress(User user) {
        if (user.getAddress() == null) {
            return "";
        }
        Address addr = user.getAddress();
        if (addr.getDescription() != null && addr.getProvince() != null) {
            return addr.getDescription() + ", " + addr.getProvince();
        } else if (addr.getDescription() != null) {
            return addr.getDescription();
        } else if (addr.getProvince() != null) {
            return addr.getProvince();
        }
        return "";
    }
    
    /**
     * Lấy province từ user
     */
    private String getUserProvince(User user) {
        if (user.getAddress() != null && user.getAddress().getProvince() != null) {
            return user.getAddress().getProvince();
        }
        return "";
    }
}