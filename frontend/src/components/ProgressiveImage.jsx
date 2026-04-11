import React, { useState, useEffect, useRef } from 'react';

const ProgressiveImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  ...props 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);

  // Tạo placeholder blur từ ảnh gốc hoặc dùng placeholder mặc định
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    
    // Tạo một data URL blur placeholder đơn giản
    // Hoặc có thể dùng một service để tạo blur từ ảnh gốc
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMmEyNjI3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2U2ZTFlMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+';
  };

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;

    const handleLoad = () => {
      setImageLoaded(true);
    };

    const handleError = () => {
      setImageError(true);
      setImageLoaded(true); // Vẫn hiển thị placeholder nếu lỗi
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // Nếu ảnh đã được cache, load ngay
    if (img.complete) {
      handleLoad();
    }

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src]);

  return (
    <div 
      className={`progressive-image-wrapper ${className}`}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        display: 'block'
      }}
    >
      {/* Placeholder - luôn hiển thị, ẩn khi ảnh load xong */}
      <img
        src={getPlaceholder()}
        alt=""
        className="progressive-image-placeholder"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(10px)',
          transform: 'scale(1.1)',
          transition: 'opacity 0.5s ease-out',
          opacity: imageLoaded ? 0 : 1,
          zIndex: 1,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      
      {/* Full Image - fade in khi load xong */}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`progressive-image-full ${className}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.5s ease-in',
            opacity: imageLoaded ? 1 : 0,
            zIndex: 2,
            display: 'block',
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
          {...props}
        />
      )}

      <style>{`
        .progressive-image-wrapper {
          background-color: #2a2627;
        }
        
        .progressive-image-wrapper.card__img {
          aspect-ratio: 2/3;
        }
        
        /* Đảm bảo ProgressiveImage hoạt động trong carousel */
        .poster-carousel__slide .progressive-image-wrapper {
          width: 100%;
          height: 100%;
        }
        
        .progressive-image-full {
          will-change: opacity;
        }
        
        .progressive-image-full.card__img {
          aspect-ratio: 2/3;
        }
        
        .progressive-image-placeholder {
          will-change: opacity;
        }
      `}</style>
    </div>
  );
};

export default ProgressiveImage;

