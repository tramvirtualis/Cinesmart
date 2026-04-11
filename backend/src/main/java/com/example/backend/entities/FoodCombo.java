package com.example.backend.entities;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "food_combos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodCombo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long foodComboId;
    
    private String name;
    private BigDecimal price;
    private String description;
    private String image;
    
    // Quan hệ đúng: OrderCombo có @ManyToOne FoodCombo (không phải ngược lại)
    // FoodCombo là entity chính (menu item), không nên có quan hệ với OrderCombo
}