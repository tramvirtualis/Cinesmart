package com.example.backend.dtos;

import com.example.backend.entities.enums.RoomType;
import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateCinemaRoomDTO {
    @NotBlank(message = "Tên phòng chiếu không được để trống")
    private String roomName;
    
    @NotNull(message = "Loại phòng không được để trống")
    private RoomType roomType;
    
    @com.fasterxml.jackson.annotation.JsonProperty("hasPanorama")
    private Boolean panorama;

    
    @NotNull(message = "Cinema complex ID không được để trống")
    private Long cinemaComplexId;
    
    @NotNull(message = "Số hàng ghế không được để trống")
    @Min(value = 1, message = "Số hàng ghế phải lớn hơn 0")
    private Integer rows;
    
    @NotNull(message = "Số cột ghế không được để trống")
    @Min(value = 1, message = "Số cột ghế phải lớn hơn 0")
    private Integer cols;

    /**
     * Ô trống thêm (ngoài lối đi mặc định: cột 5,10,… và giữa khi rộng), định dạng "A6", "B10".
     * Lối đi chuẩn và phân loại VIP/Couple khi tạo ghế do server xử lý như layout cũ.
     */
    private List<String> emptyCells;

    /**
     * Khi true: xóa toàn bộ ghế cũ và tạo lưới mới toàn ghế Thường (dùng khi đổi số hàng/cột).
     */
    private Boolean resetLayout;
}

