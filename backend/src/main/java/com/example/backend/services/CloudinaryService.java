package com.example.backend.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    @Autowired
    private Cloudinary cloudinary;

    public String uploadImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không được để trống");
        }
        
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            Object secureUrl = uploadResult.get("secure_url");
            
            if (secureUrl == null) {
                throw new IOException("Không nhận được URL từ Cloudinary");
            }
            
            return secureUrl.toString();
        } catch (Exception e) {
            throw new IOException("Lỗi khi upload lên Cloudinary: " + e.getMessage(), e);
        }
    }
    
    /**
     * Xóa ảnh từ Cloudinary dựa trên URL
     * @param imageUrl URL của ảnh cần xóa
     * @return true nếu xóa thành công
     */
    public boolean deleteImage(String imageUrl) throws IOException {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return false;
        }
        
        try {
            // Extract public_id từ URL
            // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
            String publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId == null || publicId.isEmpty()) {
                return false;
            }
            
            Map deleteResult = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            String result = deleteResult.get("result") != null ? deleteResult.get("result").toString() : "";
            return "ok".equals(result);
        } catch (Exception e) {
            throw new IOException("Lỗi khi xóa ảnh từ Cloudinary: " + e.getMessage(), e);
        }
    }
    
    /**
     * Extract public_id từ Cloudinary URL
     */
    private String extractPublicIdFromUrl(String url) {
        try {
            // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
            // Hoặc: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
            if (url.contains("/image/upload/")) {
                String[] parts = url.split("/image/upload/");
                if (parts.length > 1) {
                    String afterUpload = parts[1];
                    // Remove version if present (v1234567890/)
                    if (afterUpload.matches("^v\\d+/.*")) {
                        afterUpload = afterUpload.substring(afterUpload.indexOf('/') + 1);
                    }
                    // Remove file extension
                    int lastDot = afterUpload.lastIndexOf('.');
                    if (lastDot > 0) {
                        return afterUpload.substring(0, lastDot);
                    }
                    return afterUpload;
                }
            }
        } catch (Exception e) {
            // Log error but don't throw
        }
        return null;
    }
}
