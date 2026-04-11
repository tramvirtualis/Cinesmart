package com.example.backend.repositories;

import com.example.backend.entities.Voucher;
import com.example.backend.entities.enums.VoucherScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    
    Optional<Voucher> findByCode(String code);
    
    List<Voucher> findByScope(VoucherScope scope);
    
    boolean existsByCode(String code);
}


