package com.example.backend.repositories;

import com.example.backend.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    
    /**
     * Query để xác định user type từ database
     * Check xem userId có tồn tại trong bảng nào: admins, managers, hay customers
     */
    @Query(value = "SELECT CASE " +
            "WHEN EXISTS(SELECT 1 FROM admins WHERE user_id = :userId) THEN 'ADMIN' " +
            "WHEN EXISTS(SELECT 1 FROM managers WHERE user_id = :userId) THEN 'MANAGER' " +
            "WHEN EXISTS(SELECT 1 FROM customers WHERE user_id = :userId) THEN 'USER' " +
            "ELSE 'USER' END", nativeQuery = true)
    String getUserType(@Param("userId") Long userId);
}