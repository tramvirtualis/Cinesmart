package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

import com.example.backend.entities.enums.Language;
import com.example.backend.entities.enums.RoomType;

@Entity
@Table(name = "movie_versions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovieVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long movieVersionId;

    @ManyToOne
    @JoinColumn(name = "movie_id")
    private Movie movie;

    @Enumerated(EnumType.STRING)
    private Language language;

    @Enumerated(EnumType.STRING)
    private RoomType roomType;

    @OneToMany(mappedBy = "movieVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Showtime> showtimes;
}
