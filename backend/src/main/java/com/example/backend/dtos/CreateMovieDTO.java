package com.example.backend.dtos;

import com.example.backend.entities.enums.AgeRating;
import com.example.backend.entities.enums.Genre;
import com.example.backend.entities.enums.Language;
import com.example.backend.entities.enums.MovieStatus;
import com.example.backend.entities.enums.RoomType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMovieDTO {
    @NotBlank(message = "Tiêu đề phim không được để trống")
    @Size(max = 255, message = "Tiêu đề phim không được vượt quá 255 ký tự")
    private String title;

    @NotEmpty(message = "Thể loại phim không được để trống")
    private List<Genre> genre;

    @NotNull(message = "Thời lượng phim không được để trống")
    @Min(value = 1, message = "Thời lượng phim phải lớn hơn 0")
    private Integer duration;

    @NotNull(message = "Ngày phát hành không được để trống")
    private LocalDate releaseDate;

    @NotNull(message = "Độ tuổi không được để trống")
    private AgeRating ageRating;

    @Size(max = 500, message = "Diễn viên không được vượt quá 500 ký tự")
    private String actor;

    @Size(max = 255, message = "Đạo diễn không được vượt quá 255 ký tự")
    private String director;

    // Không giới hạn độ dài mô tả vì database đã là TEXT
    private String description;

    @Size(max = 2000, message = "URL trailer không được vượt quá 2000 ký tự")
    private String trailerURL;

    // Không giới hạn độ dài URL poster để hỗ trợ base64 hoặc URL dài
    private String poster;

    // Status sẽ được tự động tính từ showtime sớm nhất, không cần truyền vào

    @NotEmpty(message = "Vui lòng chọn ít nhất 1 định dạng")
    private List<RoomType> formats;

    @NotEmpty(message = "Vui lòng chọn ít nhất 1 ngôn ngữ")
    private List<Language> languages;
}

