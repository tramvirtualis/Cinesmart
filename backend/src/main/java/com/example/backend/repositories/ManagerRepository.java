package com.example.backend.repositories;

import com.example.backend.entities.Manager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ManagerRepository extends JpaRepository<Manager, Long> {
    // Với JOINED inheritance, cần đảm bảo query chỉ trả về Manager
    // Sử dụng TYPE để đảm bảo chỉ query Manager, không phải Customer hay Admin
    @Query("SELECT m FROM Manager m " +
           "JOIN User u ON m.userId = u.userId " +
           "WHERE u.username = :username AND TYPE(m) = Manager")
    Optional<Manager> findByUsername(@Param("username") String username);
    
    // Query để load Manager cùng với cinemaComplex
    // Với JOINED inheritance, username nằm trong bảng users, không phải managers
    // Cần join với User để truy cập username và đảm bảo TYPE là Manager
    @Query("SELECT DISTINCT m FROM Manager m " +
           "LEFT JOIN FETCH m.cinemaComplex c " +
           "LEFT JOIN FETCH c.address " +
           "JOIN User u ON m.userId = u.userId " +
           "WHERE u.username = :username AND TYPE(m) = Manager")
    Optional<Manager> findByUsernameWithCinemaComplex(@Param("username") String username);
    
    // Query native để lấy cinema_complex_id trực tiếp từ database
    // Với JOINED inheritance: managers.user_id -> users.user_id, managers.cinema_complex_id -> cinema_complex.complex_id
    // Native query đảm bảo chỉ query từ bảng managers, không phải customers hay admins
    @Query(value = "SELECT m.cinema_complex_id FROM managers m " +
                   "INNER JOIN users u ON m.user_id = u.user_id " +
                   "WHERE u.username = :username AND m.cinema_complex_id IS NOT NULL", nativeQuery = true)
    Optional<Long> findCinemaComplexIdByUsername(@Param("username") String username);
}

