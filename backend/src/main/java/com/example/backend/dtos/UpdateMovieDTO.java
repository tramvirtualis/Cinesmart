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
public class UpdateMovieDTO {
    @Size(max = 255, message = "Tiêu đề phim không được vượt quá 255 ký tự")
    private String title;

    private List<Genre> genre;

    @Min(value = 1, message = "Thời lượng phim phải lớn hơn 0")
    private Integer duration;

    private LocalDate releaseDate;

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

    // Status có thể được admin cập nhật thủ công (đặc biệt là ENDED)
    // Nếu không truyền vào, sẽ tự động tính từ showtime (COMING_SOON hoặc NOW_SHOWING)
    private MovieStatus status;

    private List<RoomType> formats;

    private List<Language> languages;
}

