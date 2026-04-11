package com.example.backend.dtos;

import com.example.backend.entities.enums.SeatType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddSeatRequestDTO {
    @NotBlank
    private String seatRow;

    @NotNull
    @Min(1)
    private Integer seatColumn;

    /** Kích thước lưới hiển thị (từ client), để validate ô nằm trong phòng */
    @NotNull
    @Min(1)
    private Integer gridRows;

    @NotNull
    @Min(1)
    private Integer gridCols;

    private SeatType type;
}
