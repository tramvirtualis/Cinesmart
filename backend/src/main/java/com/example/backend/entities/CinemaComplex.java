package com.example.backend.entities;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaComplex {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long complexId;

    private String name;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "address_id", referencedColumnName = "addressId")
    private Address address;

    @OneToMany(mappedBy = "cinemaComplex", cascade = CascadeType.ALL)
    private List<CinemaRoom> rooms;

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "complex_food_combo",
        joinColumns = @JoinColumn(name = "complex_id"),
        inverseJoinColumns = @JoinColumn(name = "food_combo_id")
    )
    private List<FoodCombo> foodCombos;

    @ManyToMany
    @JoinTable(
        name = "complex_movies",
        joinColumns = @JoinColumn(name = "complex_id"),
        inverseJoinColumns = @JoinColumn(name = "movie_id")
    )
    private List<Movie> movies;
}