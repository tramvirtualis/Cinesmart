package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;
import com.example.backend.entities.enums.UserTier;

@Entity
@Table(name = "customers")
@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Customer extends User {

    private String name;
    private LocalDate dob;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserTier tier = UserTier.MEMBER;

    @Builder.Default
    @Column(precision = 19, scale = 2)
    private BigDecimal totalSpendLast12Months = BigDecimal.ZERO;

    @ManyToMany
    @JoinTable(name = "customer_favorite_movies",
            joinColumns = @JoinColumn(name = "customer_id"),
            inverseJoinColumns = @JoinColumn(name = "movie_id"))
    private List<Movie> favorites;

    @ManyToMany
    @JoinTable(name = "customer_vouchers",
            joinColumns = @JoinColumn(name = "customer_id"),
            inverseJoinColumns = @JoinColumn(name = "voucher_id"))    
    private List<Voucher> vouchers;
}