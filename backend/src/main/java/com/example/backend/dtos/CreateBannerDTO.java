package com.example.backend.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class CreateBannerDTO {
    @NotBlank(message = "Tên banner không được để trống")
    @Size(max = 255, message = "Tên banner không được vượt quá 255 ký tự")
    private String name;

    @NotBlank(message = "URL ảnh banner không được để trống")
    @Size(max = 2000, message = "URL ảnh không được vượt quá 2000 ký tự")
    private String image;

    private Integer displayOrder;
}

