package com.example.backend.repositories;

import com.example.backend.entities.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
    
    boolean existsByPhoneAndUserIdNot(String phone, Long userId);
    
    Optional<Customer> findByUsername(String username);
    
    Optional<Customer> findByEmail(String email);

    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.vouchers WHERE c.userId = :userId")
    Optional<Customer> findByIdWithVouchers(@Param("userId") Long userId);

    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.favorites WHERE c.userId = :userId")
    Optional<Customer> findByIdWithFavorites(@Param("userId") Long userId);
}