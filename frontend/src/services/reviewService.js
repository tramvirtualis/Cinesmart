const API_BASE_URL = 'http://localhost:8080/api';

export const reviewService = {
  async createReview(movieId, rating, context) {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập để đánh giá phim');
    }

    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        movieId,
        rating,
        context: context || ''
      })
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi gửi đánh giá');
    }

    return data;
  },

  async getReviewsByMovie(movieId) {
    const response = await fetch(`${API_BASE_URL}/reviews/movie/${movieId}`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi lấy đánh giá');
    }

    return data.data || [];
  },

  async getReviewsByUser(userId) {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi lấy đánh giá');
    }

    return data.data || [];
  },

  async reportReview(reviewId, reason) {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập để báo cáo đánh giá');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        reason: reason || 'Nội dung không phù hợp'
      })
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi báo cáo đánh giá');
    }

    return data;
  },

  // Admin methods
  async getAllReviews() {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/admin/all`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi lấy danh sách đánh giá');
    }

    return data.data || [];
  },

  async getReportedReviews() {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/admin/reported`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi lấy danh sách đánh giá bị báo cáo');
    }

    return data.data || [];
  },

  async toggleReviewVisibility(reviewId) {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/admin/${reviewId}/toggle-visibility`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi thay đổi trạng thái đánh giá');
    }

    return data.data;
  },

  async getReviewReports(reviewId) {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/admin/${reviewId}/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi lấy danh sách báo cáo');
    }

    return data.data || [];
  },

  async deleteReview(reviewId) {
    const token = localStorage.getItem('jwt');
    if (!token) {
      throw new Error('Bạn cần đăng nhập');
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Có lỗi xảy ra khi xóa đánh giá');
    }

    return data;
  }
};


