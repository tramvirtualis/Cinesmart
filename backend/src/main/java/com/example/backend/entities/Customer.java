package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;
import java.util.List;

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