package com.example.backend.dtos;

import com.example.backend.entities.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CinemaRoomResponseDTO {
    private Long roomId;
    private String roomName;
    private RoomType roomType;
    private Long cinemaComplexId;
    private String cinemaComplexName;
    private Integer rows;
    private Integer cols;
    private List<SeatResponseDTO> seats;
}

