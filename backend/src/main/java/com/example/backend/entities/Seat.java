package com.example.backend.entities;

import jakarta.persistence.*;
import lombok.*;

import com.example.backend.entities.enums.SeatType;

@Entity
@Table(name = "seats")
@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long seatId;

    @Enumerated(EnumType.STRING)
    private SeatType type;

    private String seatRow;
    private Integer seatColumn;

    @ManyToOne
    @JoinColumn(name = "cinema_room_id")
    private CinemaRoom cinemaRoom;
}
