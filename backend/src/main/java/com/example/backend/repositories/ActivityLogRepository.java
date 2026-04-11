package com.example.backend.repositories;

import com.example.backend.entities.ActivityLog;
import com.example.backend.entities.User;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    
    // Tìm tất cả hoạt động
    List<ActivityLog> findAllByOrderByTimestampDesc();
    
    // Tìm hoạt động theo actor
    List<ActivityLog> findByActorOrderByTimestampDesc(User actor);
    
    // Tìm hoạt động theo actor username
    @Query("SELECT a FROM ActivityLog a WHERE a.actor.username = :username ORDER BY a.timestamp DESC")
    List<ActivityLog> findByActorUsernameOrderByTimestampDesc(@Param("username") String username);
    
    // Tìm hoạt động theo action
    List<ActivityLog> findByActionOrderByTimestampDesc(Action action);
    
    // Tìm hoạt động theo objectType
    List<ActivityLog> findByObjectTypeOrderByTimestampDesc(ObjectType objectType);
    
    // Tìm hoạt động theo actor và action
    List<ActivityLog> findByActorAndActionOrderByTimestampDesc(User actor, Action action);
    
    // Tìm hoạt động theo actor username và action
    @Query("SELECT a FROM ActivityLog a WHERE a.actor.username = :username AND a.action = :action ORDER BY a.timestamp DESC")
    List<ActivityLog> findByActorUsernameAndActionOrderByTimestampDesc(
        @Param("username") String username, 
        @Param("action") Action action
    );
    
    // Tìm hoạt động theo khoảng thời gian
    @Query("SELECT a FROM ActivityLog a WHERE a.timestamp >= :startDate AND a.timestamp <= :endDate ORDER BY a.timestamp DESC")
    List<ActivityLog> findByTimestampBetweenOrderByTimestampDesc(
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
    
    // Tìm hoạt động theo actor và khoảng thời gian
    @Query("SELECT a FROM ActivityLog a WHERE a.actor.username = :username AND a.timestamp >= :startDate AND a.timestamp <= :endDate ORDER BY a.timestamp DESC")
    List<ActivityLog> findByActorUsernameAndTimestampBetweenOrderByTimestampDesc(
        @Param("username") String username,
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
    
    // Tìm hoạt động với filter đầy đủ
    @Query("SELECT a FROM ActivityLog a " +
           "LEFT JOIN FETCH a.actor " +
           "WHERE " +
           "(:username IS NULL OR a.actor.username = :username) AND " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:objectType IS NULL OR a.objectType = :objectType) AND " +
           "(:startDate IS NULL OR a.timestamp >= :startDate) AND " +
           "(:endDate IS NULL OR a.timestamp <= :endDate) " +
           "ORDER BY a.timestamp DESC")
    List<ActivityLog> findWithFilters(
        @Param("username") String username,
        @Param("action") Action action,
        @Param("objectType") ObjectType objectType,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // Tìm hoạt động với pagination
    @Query("SELECT a FROM ActivityLog a WHERE " +
           "(:username IS NULL OR a.actor.username = :username) AND " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:objectType IS NULL OR a.objectType = :objectType) AND " +
           "(:startDate IS NULL OR a.timestamp >= :startDate) AND " +
           "(:endDate IS NULL OR a.timestamp <= :endDate) " +
           "ORDER BY a.timestamp DESC")
    Page<ActivityLog> findWithFiltersPaged(
        @Param("username") String username,
        @Param("action") Action action,
        @Param("objectType") ObjectType objectType,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );
    
    // Tìm activity log với actor được eager fetch
    @Query("SELECT a FROM ActivityLog a LEFT JOIN FETCH a.actor WHERE a.activityId = :activityId")
    Optional<ActivityLog> findByIdWithActor(@Param("activityId") Long activityId);
}

