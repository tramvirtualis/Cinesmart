package com.example.backend.repositories;

import com.example.backend.entities.CinemaComplex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CinemaComplexRepository extends JpaRepository<CinemaComplex, Long> {
    Optional<CinemaComplex> findByComplexId(Long complexId);
    
    @Query("SELECT c FROM CinemaComplex c LEFT JOIN FETCH c.movies WHERE c.complexId = :complexId")
    Optional<CinemaComplex> findByIdWithMovies(@Param("complexId") Long complexId);
    
    @Query("SELECT c FROM CinemaComplex c LEFT JOIN FETCH c.foodCombos WHERE c.complexId = :complexId")
    Optional<CinemaComplex> findByIdWithFoodCombos(@Param("complexId") Long complexId);
}