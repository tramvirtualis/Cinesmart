package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "order_combos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderCombo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderComboId;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne
    @JoinColumn(name = "food_combo_id")
    private FoodCombo foodCombo; // Reference đến FoodCombo gốc trong menu

    private Integer quantity;
    private BigDecimal price;
}