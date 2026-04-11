package com.example.backend.dtos;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class CreatePaymentRequest {

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền tối thiểu là 1.000đ")
    private BigDecimal amount;

    private Long voucherId;
    private String voucherCode;

    @Size(max = 255, message = "Mô tả đơn hàng tối đa 255 ký tự")
    private String orderDescription;
    
    // Booking info (optional - có thể chỉ có đồ ăn)
    private Long showtimeId;
    private List<String> seatIds;
    private List<Map<String, Object>> foodCombos;
    
    // CinemaComplexId cho đơn hàng chỉ có đồ ăn (food-only orders)
    private Long cinemaComplexId;
    
    // PIN để xác thực thanh toán bằng ví Cinesmart (required khi paymentMethod = WALLET)
    // Không dùng @Size validation ở đây vì PIN chỉ required khi paymentMethod = WALLET
    // Validation sẽ được kiểm tra trong controller
    private String pin;
}



