package com.example.backend.services;

import com.example.backend.dtos.ActivityLogResponseDTO;
import com.example.backend.entities.*;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.repositories.ActivityLogRepository;
import com.example.backend.repositories.AdminRepository;
import com.example.backend.repositories.ManagerRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.example.backend.entities.Manager;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final ManagerRepository managerRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Log một hoạt động (helper method để các service khác gọi)
     * Sử dụng REQUIRES_NEW để chạy trong transaction riêng, không bị ảnh hưởng bởi
     * transaction chính
     * 
     * @param username    Username của người thực hiện
     * @param action      Hành động (CREATE, UPDATE, DELETE)
     * @param objectType  Loại đối tượng
     * @param objectId    ID của đối tượng
     * @param objectName  Tên của đối tượng
     * @param description Mô tả chi tiết
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logActivity(String username, Action action, ObjectType objectType,
            Long objectId, String objectName, String description) {
        try {
            log.info("=== START LOGGING ACTIVITY ===");
            log.info("Username: {}, Action: {}, ObjectType: {}, ObjectId: {}, ObjectName: {}",
                    username, action, objectType, objectId, objectName);
            System.out.println("=== ActivityLogService.logActivity CALLED ===");
            System.out.println("Username: " + username);
            System.out.println("Action: " + action);
            System.out.println("ObjectType: " + objectType);
            System.out.println("ObjectId: " + objectId);
            System.out.println("ObjectName: " + objectName);

            if (username == null || username.isEmpty()) {
                log.error("Cannot log activity: Username is null or empty");
                System.err.println("✗ ERROR: Username is null or empty");
                return;
            }

            User actor = null;

            // Try to find as Admin first
            java.util.Optional<Admin> adminOpt = adminRepository.findByUsername(username);
            if (adminOpt.isPresent()) {
                actor = adminOpt.get();
                log.info("Actor identified as ADMIN");
            } else {
                // Try to find as Manager
                java.util.Optional<Manager> managerOpt = managerRepository.findByUsername(username);
                if (managerOpt.isPresent()) {
                    actor = managerOpt.get();
                    log.info("Actor identified as MANAGER");
                } else {
                    // Fallback to generic User
                    actor = userRepository.findByUsername(username).orElse(null);
                    log.info("Actor identified as generic USER");
                }
            }

            if (actor == null) {
                log.error("Cannot log activity: User not found with username: {}", username);
                log.error("Available users check - this is a critical error!");
                System.err.println("✗ ERROR: User not found with username: " + username);
                return;
            }

            log.info("Actor found - userId: {}, username: {}, class: {}",
                    actor.getUserId(), actor.getUsername(), actor.getClass().getName());
            System.out.println("✓ Actor found - userId: " + actor.getUserId() + ", username: " + actor.getUsername());

            ActivityLog activityLog = ActivityLog.builder()
                    .actor(actor)
                    .action(action)
                    .objectType(objectType)
                    .objectId(objectId)
                    .objectName(objectName != null ? objectName : "")
                    .description(description != null ? description : "")
                    .timestamp(LocalDateTime.now())
                    .build();

            log.info("ActivityLog entity created, attempting to save...");
            System.out.println("Attempting to save ActivityLog...");
            ActivityLog savedLog = activityLogRepository.save(activityLog);
            log.info("Activity saved successfully - activityId: {}", savedLog.getActivityId());
            log.info("Activity logged: {} {} {} by {}", action, objectType, objectName, username);
            System.out.println("✓ Activity saved successfully - activityId: " + savedLog.getActivityId());

            // Flush để đảm bảo đã lưu vào database
            activityLogRepository.flush();
            log.info("Database flush completed");
            System.out.println("✓ Database flush completed");

            // Broadcast activity to WebSocket - chỉ broadcast nếu actor là Admin hoặc
            // Manager
            try {
                if (actor instanceof Admin) {
                    ActivityLogResponseDTO activityDTO = convertToDTO(savedLog);
                    // Broadcast to all admins
                    messagingTemplate.convertAndSend("/topic/activities/admin", activityDTO);
                    log.info("Broadcasted to /topic/activities/admin");
                    log.info("Activity broadcasted via WebSocket: {} {} {}", action, objectType, objectName);
                } else if (actor instanceof Manager) {
                    ActivityLogResponseDTO activityDTO = convertToDTO(savedLog);
                    String destination = "/topic/activities/manager/" + actor.getUsername();
                    messagingTemplate.convertAndSend(destination, activityDTO);
                    log.info("Broadcasted to {}", destination);
                } else {
                    log.info("Activity not broadcasted - actor is not Admin (actor type: {})",
                            actor.getClass().getName());
                }
            } catch (Exception e) {
                log.error("Error broadcasting activity via WebSocket: {}", e.getMessage(), e);
                // Không throw exception để không ảnh hưởng đến flow chính
            }
            log.info("=== END LOGGING ACTIVITY ===");
        } catch (Exception e) {
            log.error("CRITICAL ERROR logging activity: {}", e.getMessage(), e);
            log.error("Exception type: {}", e.getClass().getName());
            e.printStackTrace();
            // KHÔNG throw exception để không ảnh hưởng đến flow chính
            // Activity log failure không nên làm fail business logic
        }
    }

    /**
     * Lấy tất cả hoạt động của admin (cho Admin)
     * Chỉ lấy activities của ADMIN, không lấy MANAGER
     * Có thể filter theo username, action, objectType, khoảng thời gian
     */
    public List<ActivityLogResponseDTO> getAllActivities(String username, Action action,
            ObjectType objectType,
            LocalDateTime startDate,
            LocalDateTime endDate) {
        try {
            log.info("=== getAllActivities called ===");
            log.info("Filters - username: {}, action: {}, objectType: {}, startDate: {}, endDate: {}",
                    username, action, objectType, startDate, endDate);
            System.out.println("=== ActivityLogService.getAllActivities ===");
            System.out
                    .println("Filters - username: " + username + ", action: " + action + ", objectType: " + objectType);

            List<ActivityLog> activities;

            // Lấy tất cả activities trước
            if (username != null || action != null || objectType != null || startDate != null || endDate != null) {
                // Có filter
                log.info("Using findWithFilters with filters");
                System.out.println("Using findWithFilters");
                activities = activityLogRepository.findWithFilters(
                        username, action, objectType, startDate, endDate);
            } else {
                // Không có filter, lấy tất cả
                log.info("Using findAllByOrderByTimestampDesc (no filters)");
                System.out.println("Using findAllByOrderByTimestampDesc (no filters)");
                activities = activityLogRepository.findAllByOrderByTimestampDesc();
            }

            log.info("Total activities found: {}", activities.size());
            System.out.println("Total activities found: " + activities.size());

            // Filter chỉ lấy activities của ADMIN
            List<ActivityLogResponseDTO> result = activities.stream()
                    .filter(activity -> {
                        boolean isAdmin = activity.getActor() instanceof Admin;
                        if (!isAdmin) {
                            log.debug("Filtering out non-admin activity: actor type = {}",
                                    activity.getActor() != null ? activity.getActor().getClass().getName() : "null");
                        }
                        return isAdmin;
                    })
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            log.info("Activities after filtering for ADMIN: {}", result.size());
            System.out.println("Activities after filtering for ADMIN: " + result.size());

            return result;
        } catch (Exception e) {
            log.error("ERROR in getAllActivities: {}", e.getMessage(), e);
            System.err.println("ERROR in getAllActivities: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Lấy hoạt động dành cho Manager hiện tại
     */
    public List<ActivityLogResponseDTO> getManagerActivities(String username,
            Action action,
            ObjectType objectType,
            LocalDateTime startDate,
            LocalDateTime endDate) {
        log.info("Getting manager activities for user: {}", username);

        if (username == null || username.isEmpty()) {
            return Collections.emptyList();
        }

        List<ActivityLog> activities = activityLogRepository.findWithFilters(
                username, action, objectType, startDate, endDate);

        log.info("Found {} activities in DB for user {}", activities.size(), username);

        List<ActivityLogResponseDTO> result = activities.stream()
                .filter(activity -> {
                    if (activity.getActor() == null) {
                        return false;
                    }
                    // Debug log for actor class
                    // log.info("Activity {} actor class: {}", activity.getActivityId(),
                    // activity.getActor().getClass().getName());

                    // Vì đã filter theo username trong query rồi, chỉ cần kiểm tra instanceof
                    // Manager
                    // Hoặc nếu user3 là User nhưng có role MANAGER, cần check logic khác?
                    // Tạm thời bỏ check instanceof Manager để xem có ra data không
                    return true;
                    // return activity.getActor() instanceof Manager;
                })
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.info("Returning {} activities after filtering", result.size());
        return result;
    }

    /**
     * Xóa một hoạt động theo ID
     * Chỉ admin mới có quyền xóa
     */
    @Transactional
    public boolean deleteActivity(Long activityId) {
        try {
            if (activityId == null) {
                log.error("Cannot delete activity: activityId is null");
                return false;
            }

            ActivityLog activity = activityLogRepository.findById(activityId)
                    .orElse(null);

            if (activity == null) {
                log.error("Cannot delete activity: Activity not found with id: {}", activityId);
                return false;
            }

            // Chỉ cho phép xóa activities của Admin
            if (!(activity.getActor() instanceof Admin)) {
                log.error("Cannot delete activity: Only admin activities can be deleted");
                return false;
            }

            activityLogRepository.deleteById(activityId);
            log.info("Activity deleted successfully - activityId: {}", activityId);
            return true;
        } catch (Exception e) {
            log.error("Error deleting activity: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Xóa hoạt động thuộc về Manager hiện tại
     */
    @Transactional
    public boolean deleteManagerActivity(Long activityId, String username) {
        if (activityId == null || username == null || username.isEmpty()) {
            log.error("Cannot delete manager activity: invalid input. activityId={}, username={}", activityId,
                    username);
            return false;
        }

        try {
            // Sử dụng query với JOIN FETCH để eager load actor
            ActivityLog activity = activityLogRepository.findByIdWithActor(activityId).orElse(null);
            if (activity == null) {
                log.error("Cannot delete manager activity: not found {}", activityId);
                return false;
            }

            if (activity.getActor() == null) {
                log.error("Cannot delete manager activity: actor is null");
                return false;
            }

            // Chỉ cần check username match, không cần check instanceof Manager
            // Vì nếu user có thể gọi API này thì đã được authenticate là Manager rồi
            if (!username.equals(activity.getActor().getUsername())) {
                log.error("Cannot delete manager activity: username mismatch. Expected: {}, Got: {}",
                        username, activity.getActor().getUsername());
                return false;
            }

            activityLogRepository.delete(activity);
            log.info("Manager activity deleted successfully - activityId: {}", activityId);
            return true;
        } catch (Exception e) {
            log.error("Error deleting manager activity: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Convert ActivityLog entity sang DTO
     */
    private ActivityLogResponseDTO convertToDTO(ActivityLog activityLog) {
        User actor = activityLog.getActor();
        String actorRole = "";
        String actorName = "";

        // Xác định role của actor
        if (actor instanceof Admin) {
            actorRole = "ADMIN";
            actorName = "Quản trị viên";
        } else if (actor instanceof Manager) {
            actorRole = "MANAGER";
            Manager manager = (Manager) actor;
            // Lấy tên từ cinemaComplex hoặc username
            if (manager.getCinemaComplex() != null) {
                actorName = "Quản lý " + manager.getCinemaComplex().getName();
            } else {
                actorName = "Quản lý " + actor.getUsername();
            }
        }

        // Map action label
        String actionLabel = "";
        switch (activityLog.getAction()) {
            case CREATE:
                actionLabel = "Thêm";
                break;
            case UPDATE:
                actionLabel = "Sửa";
                break;
            case DELETE:
                actionLabel = "Xóa";
                break;
        }

        // Map objectType label
        String objectLabel = "";
        switch (activityLog.getObjectType()) {
            case MOVIE:
                objectLabel = "Phim";
                break;
            case CINEMA:
                objectLabel = "Rạp";
                break;
            case ROOM:
                objectLabel = "Phòng chiếu";
                break;
            case SHOWTIME:
                objectLabel = "Lịch chiếu";
                break;
            case USER:
                objectLabel = "Người dùng";
                break;
            case VOUCHER:
                objectLabel = "Voucher";
                break;
            case BANNER:
                objectLabel = "Banner";
                break;
            case FOOD:
                objectLabel = "Đồ ăn";
                break;
            case SEAT:
                objectLabel = "Ghế";
                break;
            case PRICE:
                objectLabel = "Bảng giá";
                break;
        }

        return ActivityLogResponseDTO.builder()
                .activityId(activityLog.getActivityId())
                .actorUsername(actor.getUsername())
                .actorName(actorName)
                .actorRole(actorRole)
                .action(activityLog.getAction())
                .actionLabel(actionLabel)
                .objectType(activityLog.getObjectType())
                .objectLabel(objectLabel)
                .objectId(activityLog.getObjectId())
                .objectName(activityLog.getObjectName())
                .description(activityLog.getDescription())
                .timestamp(activityLog.getTimestamp())
                .build();
    }
}
