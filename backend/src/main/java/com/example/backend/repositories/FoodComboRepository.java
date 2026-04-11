package com.example.backend.repositories;

import com.example.backend.entities.FoodCombo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodComboRepository extends JpaRepository<FoodCombo, Long> {
    
    @Query(value = "SELECT fc.* FROM food_combos fc " +
           "INNER JOIN complex_food_combo cfc ON fc.food_combo_id = cfc.food_combo_id " +
           "WHERE cfc.complex_id = :complexId", nativeQuery = true)
    List<FoodCombo> findByCinemaComplexId(@Param("complexId") Long complexId);
    
    // Lấy tất cả các FoodCombo (tất cả đều là system food combos - menu items)
    // FoodCombo không có quan hệ với OrderCombo, nên không cần filter
    List<FoodCombo> findAll();
    
    // Kiểm tra xem có OrderCombo nào đã thanh toán đang sử dụng FoodCombo này không
    @Query("SELECT COUNT(oc) > 0 FROM OrderCombo oc JOIN oc.order o WHERE oc.foodCombo.foodComboId = :foodComboId AND o.vnpPayDate IS NOT NULL")
    boolean existsPaidOrderCombosByFoodComboId(@Param("foodComboId") Long foodComboId);
}

