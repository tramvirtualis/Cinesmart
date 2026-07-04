package com.example.backend.dtos.n8n;

import com.example.backend.entities.enums.AgeRating;
import com.example.backend.entities.enums.Genre;
import com.example.backend.entities.enums.MovieStatus;
import com.example.backend.entities.enums.RoomType;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

public final class N8nAgentLabels {

    private static final DateTimeFormatter SHOWTIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy", Locale.forLanguageTag("vi-VN"));

    private N8nAgentLabels() {
    }

    public static String movieStatus(MovieStatus status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case NOW_SHOWING -> "Đang chiếu";
            case COMING_SOON -> "Sắp chiếu";
            case ENDED -> "Đã kết thúc";
        };
    }

    public static String genre(Genre genre) {
        if (genre == null) {
            return null;
        }
        return switch (genre) {
            case ACTION -> "Hành động";
            case COMEDY -> "Hài";
            case HORROR -> "Kinh dị";
            case DRAMA -> "Chính kịch";
            case ROMANCE -> "Lãng mạn";
            case THRILLER -> "Giật gân";
            case ANIMATION -> "Hoạt hình";
            case FANTASY -> "Giả tưởng";
            case SCI_FI -> "Khoa học viễn tưởng";
            case MUSICAL -> "Nhạc kịch";
            case FAMILY -> "Gia đình";
            case DOCUMENTARY -> "Tài liệu";
            case ADVENTURE -> "Phiêu lưu";
            case SUPERHERO -> "Siêu anh hùng";
        };
    }

    public static List<String> genres(List<Genre> genres) {
        if (genres == null || genres.isEmpty()) {
            return List.of();
        }
        return genres.stream()
                .map(N8nAgentLabels::genre)
                .collect(Collectors.toList());
    }

    public static String ageRating(AgeRating rating) {
        if (rating == null) {
            return null;
        }
        return switch (rating) {
            case P -> "P - Mọi lứa tuổi";
            case K -> "K - Dưới 13 tuổi cần người lớn đi cùng";
            case AGE_13_PLUS -> "13+";
            case AGE_16_PLUS -> "16+";
            case AGE_18_PLUS -> "18+";
        };
    }

    public static String roomType(RoomType roomType) {
        if (roomType == null) {
            return null;
        }
        return switch (roomType) {
            case TYPE_2D -> "2D";
            case TYPE_3D -> "3D";
            case DELUXE -> "Deluxe";
        };
    }

    public static String formatShowtime(LocalDateTime startTime) {
        if (startTime == null) {
            return null;
        }
        return startTime.format(SHOWTIME_FORMAT);
    }
}
