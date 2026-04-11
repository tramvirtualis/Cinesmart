package com.example.backend.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatSelectionMessage {
    private Long showtimeId;
    private String seatId; // Format: "A1", "B2", etc.
    private String action; // "SELECT" or "DESELECT"
    private String sessionId; // To identify the user session
}













