package com.example.backend.dtos;

import com.example.backend.entities.enums.DiscountType;
import com.example.backend.entities.enums.VoucherScope;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateVoucherDTO {
    @Size(max = 50, message = "Mã voucher không được vượt quá 50 ký tự")
    private String code;

    @Size(max = 255, message = "Tên voucher không được vượt quá 255 ký tự")
    private String name;

    @Size(max = 1000, message = "Mô tả không được vượt quá 1000 ký tự")
    private String description;

    private DiscountType discountType;

    @DecimalMin(value = "0.0", inclusive = false, message = "Giá trị giảm giá phải lớn hơn 0")
    private BigDecimal discountValue;

    @DecimalMin(value = "0.0", message = "Giảm tối đa phải lớn hơn hoặc bằng 0")
    private BigDecimal maxDiscountAmount;

    @DecimalMin(value = "0.0", message = "Đơn tối thiểu phải lớn hơn hoặc bằng 0")
    private BigDecimal minOrderAmount;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private VoucherScope scope;

    @Size(max = 2000, message = "URL ảnh không được vượt quá 2000 ký tự")
    private String image;
}


