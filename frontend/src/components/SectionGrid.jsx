import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProgressiveImage from './ProgressiveImage.jsx';

export function Section({ id, title, linkText, children }) {
  return (
    <section className="section" id={id}>
      <div className="container">
        <div className="section__head">
          <h2 className="section__title">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

export function CardsGrid({ items, isNowShowing = false, onPlayTrailer }) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const displayItems = items.length > 0 ? items : [];
  const itemsPerScroll = 5; // Số phim cuộn mỗi lần (tương ứng với grid 5 cột)

  // Scroll to current index với animation mềm mại
  useEffect(() => {
    if (scrollContainerRef.current && displayItems.length > 0) {
      const container = scrollContainerRef.current.querySelector('.movie-carousel-track');
      if (container) {
        const cardElement = container.querySelector('.card');
        if (cardElement) {
          const cardWidth = cardElement.offsetWidth;
          const gap = 24; // gap giữa các cards
          const scrollPosition = currentIndex * (cardWidth + gap);
          const startPosition = container.scrollLeft;
          const distance = scrollPosition - startPosition;
          const duration = 1000; // 1 giây cho animation mượt
          let startTime = null;

          // Custom smooth scroll với easing function
          const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          };

          const animateScroll = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const easedProgress = easeInOutCubic(progress);
            
            container.scrollLeft = startPosition + distance * easedProgress;
            
            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            }
          };

          requestAnimationFrame(animateScroll);
        }
      }
    }
  }, [currentIndex, displayItems.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex - itemsPerScroll;
      return newIndex < 0 ? Math.max(0, displayItems.length - itemsPerScroll) : newIndex;
    });
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + itemsPerScroll;
      return nextIndex >= displayItems.length ? 0 : nextIndex;
    });
  };

  if (displayItems.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#e6e1e2' }}>
        Chưa có phim nào
      </div>
    );
  }

  const canScroll = displayItems.length > itemsPerScroll;

  return (
    <div style={{ position: 'relative' }}>
      {/* Navigation Buttons */}
      {canScroll && (
        <>
          <button
            onClick={handlePrev}
            className="movie-carousel-nav movie-carousel-nav--prev"
            aria-label="Previous"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="movie-carousel-nav movie-carousel-nav--next"
            aria-label="Next"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </>
      )}

      {/* Horizontal Carousel Container */}
      <div 
        ref={scrollContainerRef}
        className="movie-carousel-wrapper"
      >
        <div className="grid grid--cards movie-carousel-track">
          {displayItems.map((m, idx) => (
            <div key={idx} className="card" style={{ position: 'relative' }}>
              <div 
                onClick={() => navigate(`/movie/${m.movieId || encodeURIComponent(m.title)}`)}
                style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}
              >
                <div className="card__img-wrapper">
                  {m.rating && (
                    <span className="card__rating-badge">{m.rating}</span>
                  )}
                  <ProgressiveImage
                    src={m.poster}
                    alt={m.title}
                    className="card__img"
                  />
                  <div className="card__play-overlay">
                    <div className="card__buttons">
                      <button 
                        className="card__play-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onPlayTrailer && m.trailerId) {
                            onPlayTrailer(m.trailerId);
                          }
                        }}
                        aria-label="Play trailer"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </button>
                      {isNowShowing && (
                        <button
                          className="card__book-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/movie/${m.movieId || encodeURIComponent(m.title)}`);
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9z"/>
                            <path d="M6 9v6M18 9v6"/>
                          </svg>
                          <span>Đặt vé</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="card__body">
                  <h3 className="card__title">{m.title}</h3>
                  {m.genre ? (
                    <p 
                      className="card__meta" 
                      style={{ 
                        whiteSpace: 'normal', 
                        overflow: 'visible', 
                        textOverflow: 'clip' 
                      }}
                    >
                      {m.genre}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .movie-carousel-wrapper {
          position: relative;
          overflow: hidden;
        }

        .movie-carousel-track {
          display: flex !important;
          grid-template-columns: none !important;
          flex-wrap: nowrap;
          gap: 24px;
          overflow-x: auto;
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 10px;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }

        .movie-carousel-track::-webkit-scrollbar {
          display: none;
        }

        .movie-carousel-track .card {
          flex: 0 0 auto;
          width: calc((100% - 96px) / 5);
          min-width: 200px;
          max-width: 280px;
          scroll-snap-align: start;
          transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease-out;
        }

        @media (max-width: 1400px) {
          .movie-carousel-track .card {
            width: calc((100% - 72px) / 5);
            min-width: 180px;
            max-width: 260px;
          }
        }

        @media (max-width: 1200px) {
          .movie-carousel-track .card {
            width: calc((100% - 72px) / 4);
            min-width: 180px;
            max-width: 240px;
          }
        }

        @media (max-width: 900px) {
          .movie-carousel-track .card {
            width: calc((100% - 48px) / 3);
            min-width: 160px;
            max-width: 200px;
          }
        }

        @media (max-width: 600px) {
          .movie-carousel-track .card {
            width: calc((100% - 24px) / 2);
            min-width: 140px;
            max-width: 180px;
          }
        }

        .movie-carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(42, 38, 39, 0.95);
          border: 2px solid rgba(255, 209, 89, 0.6);
          color: #ffd159;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        .movie-carousel-nav:hover {
          background: rgba(255, 209, 89, 0.25);
          border-color: #ffd159;
          transform: translateY(-50%) scale(1.15);
          box-shadow: 0 6px 24px rgba(255, 209, 89, 0.4);
        }

        .movie-carousel-nav:active {
          transform: translateY(-50%) scale(1.05);
        }

        .movie-carousel-nav--prev {
          left: -24px;
        }

        .movie-carousel-nav--next {
          right: -24px;
        }

        @media (max-width: 768px) {
          .movie-carousel-nav {
            width: 40px;
            height: 40px;
          }
          .movie-carousel-nav--prev {
            left: -20px;
          }
          .movie-carousel-nav--next {
            right: -20px;
          }
        }
      `}</style>
    </div>
  );
}

export function HallsGrid({ items }) {
  return (
    <div className="grid grid--halls">
      {items.map((h, idx) => (
        <article key={idx} className="card hall">
          <ProgressiveImage
            src={h.image}
            alt={h.name}
            className="card__img"
          />
          <div className="card__body">
            <h3 className="card__title">{h.name}</h3>
            {h.desc ? <p className="card__meta">{h.desc}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PromosGrid({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((p, idx) => (
        <div key={idx} className="promo-card bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-xl overflow-hidden hover:border-[#e83b41] transition-all duration-300 hover:shadow-lg hover:shadow-[#e83b41]/20">
          <div className="flex flex-col md:flex-row h-full">
            {/* Poster */}
            <div className="promo-card__poster w-full md:w-36 h-40 md:h-auto flex-shrink-0 overflow-hidden relative">
              <ProgressiveImage
                src={p.image || 'https://via.placeholder.com/1000x430?text=Promotion'}
                alt={p.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-[#4caf50] text-white text-[9px] px-2 py-0.5 rounded-md font-bold uppercase shadow-lg">
                Đang diễn ra
              </div>
            </div>
            
            {/* Content */}
            <div className="promo-card__content flex-1 flex flex-col justify-between p-4 min-w-0">
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-2 line-clamp-2 leading-tight">{p.title}</h3>
                {p.desc && (
                  <p className="text-xs text-[#c9c4c5] line-clamp-2 leading-relaxed">{p.desc}</p>
                )}
              </div>
              
              {/* Button - Căn giữa */}
              <div className="mt-4 flex justify-center">
                <Link 
                  to="/events" 
                  className="inline-flex items-center justify-center bg-gradient-to-r from-[#e83b41] to-[#ff5258] hover:from-[#ff5258] hover:to-[#ff6b6b] text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                >
                  Xem chi tiết
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}