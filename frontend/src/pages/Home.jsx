import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import HeroCarousel from '../components/HeroCarousel.jsx';
import Footer from '../components/Footer.jsx';
import FloatingQuickBooking from '../components/FloatingQuickBooking.jsx';
import { Section, CardsGrid, PromosGrid } from '../components/SectionGrid.jsx';
import { enumService } from '../services/enumService';
import { bannerService } from '../services/bannerService';
import { voucherService } from '../services/voucherService';
import { recommendationService } from '../services/recommendationService';
import { movieService } from '../services/movieService';
import { isVoucherActive } from '../services/apiClient';
import interstellar from '../assets/images/interstellar.jpg';
import inception from '../assets/images/inception.jpg';
import darkKnightRises from '../assets/images/the-dark-knight-rises.jpg';
import driveMyCar from '../assets/images/drive-my-car.jpg';

const DEFAULT_BANNERS = [interstellar, inception, darkKnightRises, driveMyCar];

// Helper function để map AgeRating từ backend sang format frontend (13+, 16+, 18+, P, K)
const mapAgeRating = (ageRating) => {
  return enumService.mapAgeRatingToDisplay(ageRating) || 'P';
};

// Helper function để extract YouTube video ID từ URL
const extractYouTubeId = (url) => {
  if (!url) return null;
  
  if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
    return url;
  }
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Helper function để format movie data từ backend — null-safe
const formatMovieData = (movie) => {
  if (!movie || movie.movieId == null) return null;

  let genreDisplay = 'N/A';
  const genres = movie.genre;
  if (Array.isArray(genres) && genres.length > 0) {
    genreDisplay = genres.map(g => enumService.mapGenreToVietnamese(g)).join(', ');
  } else if (typeof genres === 'string' && genres.trim()) {
    genreDisplay = genres.split(',').map(g => enumService.mapGenreToVietnamese(g.trim())).join(', ');
  }
  
  return {
    movieId: movie.movieId,
    title: movie.title || 'Không có tên',
    genre: genreDisplay,
    poster: movie.poster,
    rating: mapAgeRating(movie.ageRating),
    trailerId: extractYouTubeId(movie.trailerURL)
  };
};

const mapMovies = (movies) => {
  if (!Array.isArray(movies)) return [];
  return movies.map(formatMovieData).filter(Boolean);
};

export default function Home() {
  const navigate = useNavigate();
  const [trailerModal, setTrailerModal] = useState({ isOpen: false, videoId: null });
  const [nowShowing, setNowShowing] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [banners, setBanners] = useState([]);
  const [promos, setPromos] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  useEffect(() => {
    const checkRole = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const role = (user.role || '').toString().toUpperCase().trim();
          
          if (role === 'ADMIN') {
            navigate('/admin', { replace: true });
          } else if (role === 'MANAGER') {
            navigate('/manager', { replace: true });
          }
        }
      } catch (e) {
        console.error('Error checking role:', e);
      }
    };
    
    checkRole();
  }, [navigate]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoadingBanners(true);
        const result = await bannerService.getPublicBanners();
        if (result.success && result.data?.length > 0) {
          const bannerImages = result.data
            .filter(banner => banner.image)
            .map(banner => banner.image);
          setBanners(bannerImages.length > 0 ? bannerImages : DEFAULT_BANNERS);
        } else {
          setBanners(DEFAULT_BANNERS);
        }
      } catch (err) {
        console.error('Error fetching banners:', err);
        setBanners(DEFAULT_BANNERS);
      } finally {
        setLoadingBanners(false);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        setLoadingPromos(true);
        const result = await voucherService.getPublicVouchers();
        if (result.success && Array.isArray(result.data)) {
          const mappedPromos = result.data
            .filter(isVoucherActive)
            .slice(0, 6)
            .map(voucher => ({
              title: voucher.name || voucher.code || 'Voucher',
              desc: voucher.description || `Mã: ${voucher.code || 'N/A'}`,
              image: voucher.image || 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?q=80&w=200&auto=format&fit=crop'
            }));
          setPromos(mappedPromos);
        } else {
          setPromos([]);
        }
      } catch (err) {
        console.error('Error fetching vouchers:', err);
        setPromos([]);
      } finally {
        setLoadingPromos(false);
      }
    };

    fetchVouchers();
  }, []);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const [nowShowingResult, comingSoonResult] = await Promise.all([
          movieService.getNowShowingMovies(),
          movieService.getComingSoonMovies()
        ]);

        if (nowShowingResult.success) {
          setNowShowing(mapMovies(nowShowingResult.data));
        }
        if (comingSoonResult.success) {
          setComingSoon(mapMovies(comingSoonResult.data));
        }
      } catch (err) {
        console.error('Error fetching movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        setLoadingRecommended(true);
        const result = await recommendationService.getRecommendedMovies();
        if (result.success && Array.isArray(result.data)) {
          setRecommended(mapMovies(result.data).slice(0, 6));
        }
      } catch (err) {
        console.error('Error fetching recommended movies:', err);
      } finally {
        setLoadingRecommended(false);
      }
    };
    fetchRecommended();
  }, []);

  const handlePlayTrailer = (trailerId) => {
    if (trailerId) {
      setTrailerModal({ isOpen: true, videoId: trailerId });
    }
  };

  const closeTrailer = () => {
    setTrailerModal({ isOpen: false, videoId: null });
  };

  return (
    <div className="min-h-screen cinema-mood">
      <Header />
      <FloatingQuickBooking />
      <HeroCarousel posters={banners.length > 0 ? banners : DEFAULT_BANNERS} />
      
      <main className="main">
        {recommended.length > 0 && (
          <Section id="recommended" title="Gợi Ý Dành Riêng Cho Bạn">
            {loadingRecommended ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
                Đang đề xuất phim...
              </div>
            ) : (
              <CardsGrid items={recommended} isNowShowing={true} onPlayTrailer={handlePlayTrailer} />
            )}
          </Section>
        )}
        <Section id="now-showing" title="Phim Đang Chiếu">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
              Đang tải phim...
            </div>
          ) : nowShowing.length > 0 ? (
            <CardsGrid items={nowShowing} isNowShowing={true} onPlayTrailer={handlePlayTrailer} />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
              Hiện chưa có phim đang chiếu
            </div>
          )}
        </Section>
        <Section id="coming-soon" title="Phim Sắp Chiếu">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
              Đang tải phim...
            </div>
          ) : comingSoon.length > 0 ? (
            <CardsGrid items={comingSoon} isNowShowing={false} onPlayTrailer={handlePlayTrailer} />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
              Hiện chưa có phim sắp chiếu
            </div>
          )}
        </Section>
        <Section id="promotions" title="Chương Trình Ưu Đãi">
          {loadingPromos ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
              Đang tải chương trình ưu đãi...
            </div>
          ) : promos.length > 0 ? (
            <PromosGrid items={promos} />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
              Hiện chưa có chương trình ưu đãi nào
            </div>
          )}
        </Section>
      </main>
      <Footer />

      {trailerModal.isOpen && (
        <div
          className="trailer-modal"
          onClick={closeTrailer}
        >
          <div
            className="trailer-modal__content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="trailer-modal__close"
              onClick={closeTrailer}
              aria-label="Close trailer"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerModal.videoId}?autoplay=1`}
              title="Movie Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
