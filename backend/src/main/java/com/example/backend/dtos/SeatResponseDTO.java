package com.example.backend.dtos;

import com.example.backend.entities.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatResponseDTO {
    private Long seatId;
    private SeatType type;
    private String seatRow;
    private Integer seatColumn;
}

