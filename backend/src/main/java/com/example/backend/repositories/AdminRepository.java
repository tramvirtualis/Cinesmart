package com.example.backend.repositories;

import com.example.backend.entities.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    // Với JOINED inheritance, Admin kế thừa username từ User
    // JPA sẽ tự động join bảng users và admins khi query
    Optional<Admin> findByUsername(String username);
}

