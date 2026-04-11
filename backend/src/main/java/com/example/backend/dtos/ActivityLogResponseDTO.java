package com.example.backend.dtos;

import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLogResponseDTO {
    private Long activityId;
    private String actorUsername;
    private String actorName;
    private String actorRole; // ADMIN, MANAGER
    private Action action;
    private String actionLabel; // Thêm, Sửa, Xóa
    private ObjectType objectType;
    private String objectLabel; // Phim, Rạp, Phòng chiếu, ...
    private Long objectId;
    private String objectName;
    private String description;
    private LocalDateTime timestamp;
}

