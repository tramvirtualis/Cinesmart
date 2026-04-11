import React, { useState } from 'react';
import { reviewService } from '../services/reviewService';
import '../styles/components/review-form.css';

export default function ReviewForm({ movie, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStarClick = (value) => {
    setRating(value);
    setError('');
  };

  const handleStarHover = (value) => {
    setHoveredRating(value);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.status === false) {
      setError('Tài khoản của bạn đã bị chặn. Bạn không thể đánh giá. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
      return;
    }
    
    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Note: movieId should be passed from the booking data
      // For now, we'll use a placeholder - you may need to adjust this
      const movieId = movie?.movieId || 1; // This should come from actual booking data
      
      const result = await reviewService.createReview(movieId, rating, context);
      
      if (onSuccess) {
        onSuccess(result.data || { reviewId: result.reviewId, movieId: movieId });
      }
      
      onClose();
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isFilled = starValue <= (hoveredRating || rating);
      
      return (
        <button
          key={i}
          type="button"
          className="review-star"
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => handleStarHover(starValue)}
          onMouseLeave={handleStarLeave}
          aria-label={`${starValue} sao`}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill={isFilled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: isFilled ? '#ffd159' : 'rgba(255, 255, 255, 0.3)' }}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      );
    });
  };

  return (
    <div className="review-form-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="review-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-form__header">
          <h2 className="review-form__title">Viết đánh giá</h2>
          <button
            className="review-form__close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="review-form__content">
          {movie && (
            <div className="review-form__movie-info">
              <img 
                src={movie.poster} 
                alt={movie.title}
                className="review-form__poster"
              />
              <div className="review-form__movie-details">
                <h3 className="review-form__movie-title">{movie.title}</h3>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="review-form">
            <div className="review-form__section">
              <label className="review-form__label">
                Đánh giá của bạn <span className="required">*</span>
              </label>
              <div className="review-form__stars">
                {renderStars()}
                {rating > 0 && (
                  <span className="review-form__rating-text">
                    {rating} {rating === 1 ? 'sao' : 'sao'}
                  </span>
                )}
              </div>
            </div>

            <div className="review-form__section">
              <label htmlFor="review-context" className="review-form__label">
                Nội dung đánh giá
              </label>
              <textarea
                id="review-context"
                className="review-form__textarea"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn về bộ phim..."
                rows="6"
                maxLength={255}
              />
              <div className="review-form__char-count">
                {context.length}/255 ký tự
              </div>
            </div>

            {error && (
              <div className="review-form__error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="review-form__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

