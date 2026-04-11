package com.example.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.backend.entities.WalletTransaction;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId ORDER BY wt.createdAt DESC")
    List<WalletTransaction> findRecentByWalletId(@Param("walletId") Long walletId);
    
    @Query("SELECT COUNT(wt) > 0 FROM WalletTransaction wt WHERE wt.wallet.customer.userId = :userId AND wt.referenceCode LIKE :referenceCodePattern")
    boolean existsByUserIdAndReferenceCodePattern(@Param("userId") Long userId, @Param("referenceCodePattern") String referenceCodePattern);
}

