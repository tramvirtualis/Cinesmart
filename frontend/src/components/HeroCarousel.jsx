import React, { useEffect, useRef, useState } from 'react';
import './carousel.css';
import ProgressiveImage from './ProgressiveImage.jsx';

const defaultPosters = [
  // royalty-free/sample posters
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1529101091764-c3526daf38fe?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=1920&auto=format&fit=crop',
];

export default function HeroCarousel({ posters = defaultPosters, autoplayMs = 3000 }) {
  const trackRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const isTouchRef = useRef(false);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);

  const slideCount = posters.length;

  const goTo = (index) => {
    if (slideCount === 0) return;
    const nextIndex = (index % slideCount + slideCount) % slideCount;
    setCurrent(nextIndex);
  };

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const start = () => {
    if (!autoplayMs || autoplayMs < 500) return;
    stop();
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slideCount);
    }, autoplayMs);
  };

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const restart = () => {
    stop();
    start();
  };

  useEffect(() => {
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideCount, autoplayMs]);

  useEffect(() => {
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translateX(${-current * 100}%)`;
    }
  }, [current]);

  // touch handlers on the root element
  const onTouchStart = (e) => {
    isTouchRef.current = true;
    startXRef.current = e.touches[0].clientX;
    deltaXRef.current = 0;
    stop();
  };
  const onTouchMove = (e) => {
    if (!isTouchRef.current) return;
    deltaXRef.current = e.touches[0].clientX - startXRef.current;
  };
  const onTouchEnd = () => {
    if (!isTouchRef.current) return;
    const threshold = Math.max(40, window.innerWidth * 0.08);
    if (deltaXRef.current > threshold) prev();
    else if (deltaXRef.current < -threshold) next();
    isTouchRef.current = false;
    restart();
  };

  return (
    <section className="hero hero--carousel" id="booking" aria-label="Featured movie posters">
      <div
        className="poster-carousel"
        onMouseEnter={stop}
        onMouseLeave={start}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          className="poster-carousel__arrow poster-carousel__arrow--prev"
          aria-label="Previous slide"
          onClick={() => {
            prev();
            restart();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>

        <div className="poster-carousel__track" role="list" ref={trackRef}>
          {posters.map((src, i) => (
            <div className="poster-carousel__slide" role="listitem" aria-label={`Slide ${i + 1}`} key={i}>
              <ProgressiveImage
                src={src}
                alt={`Featured movie poster ${i + 1}`}
                className=""
              />
            </div>
          ))}
        </div>

        <button
          className="poster-carousel__arrow poster-carousel__arrow--next"
          aria-label="Next slide"
          onClick={() => {
            next();
            restart();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>

        <div className="poster-carousel__dots" aria-label="Slide indicators" role="tablist">
          {posters.map((_, i) => (
            <button
              key={i}
              className="poster-carousel__dot"
              type="button"
              role="tab"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
              onClick={() => {
                goTo(i);
                restart();
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


