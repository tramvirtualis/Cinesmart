package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import com.example.backend.entities.enums.PanoramaType;
import com.example.backend.entities.enums.RoomType;

@Entity
@Table(name = "cinema_rooms")
@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long roomId;

    private String roomName;

    @Enumerated(EnumType.STRING)
    private RoomType roomType;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PanoramaType panoramaType = PanoramaType.NONE;

    @ManyToOne
    @JoinColumn(name = "cinema_complex_id")
    private CinemaComplex cinemaComplex;

    @OneToMany(mappedBy = "cinemaRoom", cascade = CascadeType.ALL)
    private List<Seat> seatLayout;
}
