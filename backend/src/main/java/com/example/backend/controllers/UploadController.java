package com.example.backend.controllers;

import com.example.backend.services.CloudinaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
        allowedHeaders = "*",
        allowCredentials = "true")
@PreAuthorize("hasRole('ADMIN')")
public class UploadController {

    @Autowired
    private CloudinaryService cloudinaryService;

    @PostMapping(value = "/upload-image", produces = "text/plain")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .header("Content-Type", "text/plain")
                    .body("File không được để trống");
            }
            
            String imageUrl = cloudinaryService.uploadImage(file);
            if (imageUrl == null || imageUrl.isEmpty()) {
                return ResponseEntity.status(500)
                    .header("Content-Type", "text/plain")
                    .body("Không thể upload ảnh lên Cloudinary");
            }
            
            // Trả về string trực tiếp với content-type text/plain
            return ResponseEntity.ok()
                .header("Content-Type", "text/plain")
                .body(imageUrl);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .header("Content-Type", "text/plain")
                .body("Upload failed: " + e.getMessage());
        }
    }
}