package com.example.backend.repositories;

import com.example.backend.entities.Order;
import com.example.backend.entities.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Methods from HEAD (for getting orders)
    List<Order> findByUserUserIdOrderByOrderDateDesc(Long userId);
    
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.tickets t " +
           "LEFT JOIN FETCH t.showtime s " +
           "LEFT JOIN FETCH s.movieVersion mv " +
           "LEFT JOIN FETCH mv.movie m " +
           "LEFT JOIN FETCH t.seat se " +
           "LEFT JOIN FETCH s.cinemaRoom cr " +
           "LEFT JOIN FETCH cr.cinemaComplex cc " +
           "LEFT JOIN FETCH cc.address a " +
           "WHERE o.user.userId = :userId " +
           "ORDER BY o.orderDate DESC")
    List<Order> findByUserUserIdWithDetails(@Param("userId") Long userId);
    
    // Get all orders for admin (including food-only orders)
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.tickets t " +
           "LEFT JOIN FETCH t.showtime s " +
           "LEFT JOIN FETCH s.movieVersion mv " +
           "LEFT JOIN FETCH mv.movie m " +
           "LEFT JOIN FETCH t.seat se " +
           "LEFT JOIN FETCH s.cinemaRoom cr " +
           "LEFT JOIN FETCH cr.cinemaComplex cc " +
           "LEFT JOIN FETCH cc.address a " +
           "LEFT JOIN FETCH o.user u " +
           "WHERE o.vnpPayDate IS NOT NULL " +
           "ORDER BY o.orderDate DESC")
    List<Order> findAllWithDetails();
    
    // Get orders by cinema complex ID for manager (including food-only orders)
    // Note: orderCombos will be loaded lazily in service layer to avoid MultipleBagFetchException
    // Food-only orders (no tickets) are shown to all managers since they're not tied to a specific cinema
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.tickets t " +
           "LEFT JOIN FETCH t.showtime s " +
           "LEFT JOIN FETCH s.movieVersion mv " +
           "LEFT JOIN FETCH mv.movie m " +
           "LEFT JOIN FETCH t.seat se " +
           "LEFT JOIN FETCH s.cinemaRoom cr " +
           "LEFT JOIN FETCH cr.cinemaComplex cc " +
           "LEFT JOIN FETCH cc.address a " +
           "LEFT JOIN FETCH o.user u " +
           "WHERE o.vnpPayDate IS NOT NULL " +
           "AND (cc.complexId = :complexId OR NOT EXISTS (SELECT 1 FROM Ticket t2 WHERE t2.order = o)) " +
           "ORDER BY o.orderDate DESC")
    List<Order> findByCinemaComplexIdWithDetails(@Param("complexId") Long complexId);
    
    // Methods from origin/nhan (for MoMo payment)
    Optional<Order> findByVnpTxnRef(String vnpTxnRef);
    
    // Check if voucher has been used by user in any order (excluding cancelled orders - can restore if order cancelled)
    @Query("SELECT COUNT(o) > 0 FROM Order o WHERE o.user.userId = :userId AND o.voucher.voucherId = :voucherId AND o.status != 'CANCELLED'")
    boolean existsByUserUserIdAndVoucherVoucherId(@Param("userId") Long userId, @Param("voucherId") Long voucherId);
    
    // Check if voucher has ever been used by user in any order (including cancelled orders)
    @Query("SELECT COUNT(o) > 0 FROM Order o WHERE o.user.userId = :userId AND o.voucher.voucherId = :voucherId")
    boolean hasEverUsedVoucher(@Param("userId") Long userId, @Param("voucherId") Long voucherId);
    
    // Load order with all relations for email sending
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.tickets t " +
           "LEFT JOIN FETCH t.showtime s " +
           "LEFT JOIN FETCH s.movieVersion mv " +
           "LEFT JOIN FETCH mv.movie m " +
           "LEFT JOIN FETCH t.seat se " +
           "LEFT JOIN FETCH s.cinemaRoom cr " +
           "LEFT JOIN FETCH cr.cinemaComplex cc " +
           "LEFT JOIN FETCH cc.address a " +
           "LEFT JOIN FETCH o.user u " +
           "LEFT JOIN FETCH o.voucher v " +
           "WHERE o.orderId = :orderId")
    Optional<Order> findByIdWithDetails(@Param("orderId") Long orderId);

    long countByUserUserIdAndStatusAndCancelledAtBetween(
        Long userId,
        OrderStatus status,
        LocalDateTime start,
        LocalDateTime end
    );
}
