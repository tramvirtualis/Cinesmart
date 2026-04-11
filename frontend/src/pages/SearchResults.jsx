import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Section, CardsGrid } from '../components/SectionGrid.jsx';
import { enumService } from '../services/enumService';

// Helper function để map AgeRating từ backend sang format frontend (13+, 16+, 18+, P, K)
const mapAgeRating = (ageRating) => {
  // Use enumService to map age rating to display format
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

// Helper function để format movie data từ backend
const formatMovieData = (movie) => {
  let genreDisplay = 'N/A';
  if (movie.genre && movie.genre.length > 0) {
    genreDisplay = movie.genre.map(g => enumService.mapGenreToVietnamese(g)).join(', ');
  }
  
  return {
    movieId: movie.movieId,
    title: movie.title,
    genre: genreDisplay,
    poster: movie.poster,
    rating: mapAgeRating(movie.ageRating),
    trailerId: extractYouTubeId(movie.trailerURL)
  };
};

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [nowShowing, setNowShowing] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trailerModal, setTrailerModal] = useState({ isOpen: false, videoId: null });

  // Fetch movies from backend
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        
        const [nowShowingRes, comingSoonRes] = await Promise.all([
          axios.get('http://localhost:8080/api/public/movies/now-showing'),
          axios.get('http://localhost:8080/api/public/movies/coming-soon')
        ]);
        
        setNowShowing(nowShowingRes.data.map(formatMovieData));
        setComingSoon(comingSoonRes.data.map(formatMovieData));
      } catch (err) {
        console.error('Error fetching movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Filter movies based on search query
  const filteredNowShowing = useMemo(() => {
    if (!query.trim()) return [];
    const term = query.toLowerCase();
    return nowShowing.filter(movie => 
      movie.title.toLowerCase().includes(term) ||
      movie.genre.toLowerCase().includes(term)
    );
  }, [nowShowing, query]);

  const filteredComingSoon = useMemo(() => {
    if (!query.trim()) return [];
    const term = query.toLowerCase();
    return comingSoon.filter(movie => 
      movie.title.toLowerCase().includes(term) ||
      movie.genre.toLowerCase().includes(term)
    );
  }, [comingSoon, query]);

  const allResults = useMemo(() => {
    return [...filteredNowShowing, ...filteredComingSoon];
  }, [filteredNowShowing, filteredComingSoon]);

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
      
      <main className="main" style={{ paddingTop: '40px' }}>
        {/* Search Results Header */}
        <div style={{
          padding: '0 20px 32px',
          textAlign: 'center'
        }}>
          <h1 style={{
            color: '#e6e1e2',
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            Kết quả tìm kiếm
          </h1>
          {query ? (
            <p style={{
              color: '#c9c4c5',
              fontSize: '18px'
            }}>
              Tìm kiếm cho: <strong style={{ color: '#ffd159' }}>"{query}"</strong>
            </p>
          ) : (
            <p style={{
              color: '#c9c4c5',
              fontSize: '18px'
            }}>
              Vui lòng nhập từ khóa tìm kiếm
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            color: '#e6e1e2',
            fontSize: '18px'
          }}>
            Đang tải kết quả...
          </div>
        ) : !query.trim() ? (
          <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            color: '#e6e1e2',
            fontSize: '18px'
          }}>
            Vui lòng nhập từ khóa để tìm kiếm phim
          </div>
        ) : allResults.length === 0 ? (
          <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            color: '#e6e1e2'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>🔍</div>
            <h2 style={{
              fontSize: '24px',
              marginBottom: '8px',
              color: '#e6e1e2'
            }}>
              Không tìm thấy kết quả
            </h2>
            <p style={{
              color: '#c9c4c5',
              fontSize: '16px',
              marginBottom: '24px'
            }}>
              Không có phim nào phù hợp với từ khóa <strong style={{ color: '#ffd159' }}>"{query}"</strong>
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'linear-gradient(135deg, #e83b41 0%, #a10f14 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(232, 59, 65, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Về trang chủ
            </button>
          </div>
        ) : (
          <>
            {filteredNowShowing.length > 0 && (
              <Section id="now-showing" title={`Phim Đang Chiếu (${filteredNowShowing.length})`}>
                <CardsGrid 
                  items={filteredNowShowing} 
                  isNowShowing={true} 
                  onPlayTrailer={handlePlayTrailer} 
                />
              </Section>
            )}
            
            {filteredComingSoon.length > 0 && (
              <Section id="coming-soon" title={`Phim Sắp Chiếu (${filteredComingSoon.length})`}>
                <CardsGrid 
                  items={filteredComingSoon} 
                  isNowShowing={false} 
                  onPlayTrailer={handlePlayTrailer} 
                />
              </Section>
            )}
          </>
        )}
      </main>
      
      <Footer />

      {/* Trailer Modal */}
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

