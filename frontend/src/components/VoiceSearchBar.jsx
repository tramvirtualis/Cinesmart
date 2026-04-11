import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { movieService } from '../services/movieService';
import { enumService } from '../services/enumService';

const VoiceSearchBar = ({ onSearch, placeholder = "Tìm kiếm phim..." }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [movies, setMovies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const recognitionRef = useRef(null);
  const searchContainerRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load danh sách phim để gợi ý
  useEffect(() => {
    const loadMovies = async () => {
      try {
        const result = await movieService.getPublicMovies();
        if (result.success && result.data) {
          setMovies(result.data);
        }
      } catch (error) {
        console.error('Error loading movies for suggestions:', error);
      }
    };
    loadMovies();
  }, []);

  // Filter movies based on search term
  const suggestions = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      return [];
    }
    const term = searchTerm.toLowerCase();
    const filtered = movies.filter(movie => 
      movie.title?.toLowerCase().includes(term)
    ).slice(0, 7); // Tối đa 7 gợi ý
    return filtered;
  }, [movies, searchTerm]);

  // Kiểm tra hỗ trợ Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'vi-VN'; // Tiếng Việt

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = event.results[0][0].transcript;
        
        // Loại bỏ dấu câu (dấu chấm, dấu phẩy, dấu chấm hỏi, dấu chấm than, v.v.)
        transcript = transcript
          .replace(/[.,!?;:]/g, '') // Loại bỏ các dấu câu phổ biến
          .replace(/\s+/g, ' ') // Loại bỏ khoảng trắng thừa
          .trim(); // Loại bỏ khoảng trắng ở đầu và cuối
        
        setSearchTerm(transcript);
        setIsListening(false);
        
        // Tự động navigate đến trang search results sau khi nhận diện
        if (transcript.trim()) {
          navigate(`/search?q=${encodeURIComponent(transcript.trim())}`);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Hiển thị thông báo lỗi phù hợp
        if (event.error === 'no-speech') {
          alert('Không phát hiện giọng nói. Vui lòng thử lại.');
        } else if (event.error === 'not-allowed') {
          alert('Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.');
        } else {
          alert('Có lỗi xảy ra khi nhận diện giọng nói. Vui lòng thử lại.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onSearch]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(e);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleVoiceSearch = () => {
    if (!isSupported) {
      alert('Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói. Vui lòng sử dụng Chrome, Edge hoặc Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        alert('Không thể bắt đầu nhận diện giọng nói. Vui lòng thử lại.');
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      // Luôn navigate đến trang search results
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      // Nếu có callback onSearch, vẫn gọi nó (cho các trường hợp đặc biệt)
      if (onSearch) {
        onSearch(searchTerm.trim());
      }
    }
  };

  const handleSuggestionClick = (movie) => {
    setSearchTerm(movie.title);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    navigate(`/search?q=${encodeURIComponent(movie.title)}`);
    if (onSearch) {
      onSearch(movie.title);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  return (
    <div 
      ref={searchContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%'
      }}
    >
      <form 
        onSubmit={handleSearch}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(45, 38, 39, 0.9)',
          border: `1.5px solid ${isListening ? '#e83b41' : 'rgba(255, 255, 255, 0.2)'}`,
          borderRadius: '50px',
          padding: '4px 10px',
          transition: 'all 0.3s ease',
          boxShadow: isListening 
            ? '0 0 15px rgba(232, 59, 65, 0.4)' 
            : '0 1px 4px rgba(0, 0, 0, 0.15)'
        }}>
        {/* Search Icon - Clickable */}
        <button
          type="submit"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '6px'
          }}
          title="Tìm kiếm"
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{
              color: '#e6e1e2',
              flexShrink: 0
            }}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Input */}
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e6e1e2',
            fontSize: '13px',
            padding: '0',
            minWidth: '120px'
          }}
        />

        {/* Voice Search Button */}
        <button
          type="button"
          onClick={handleVoiceSearch}
          disabled={!isSupported}
          style={{
            background: isListening 
              ? 'rgba(232, 59, 65, 0.2)' 
              : 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isSupported ? 'pointer' : 'not-allowed',
            marginLeft: '4px',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
          title={isSupported 
            ? (isListening ? 'Đang nghe... (Nhấn để dừng)' : 'Tìm kiếm bằng giọng nói')
            : 'Trình duyệt không hỗ trợ tìm kiếm bằng giọng nói'}
        >
          {isListening ? (
            <>
              {/* Pulsing animation */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'rgba(232, 59, 65, 0.3)',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                style={{
                  color: '#e83b41',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </>
          ) : (
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{
                color: isSupported ? '#e6e1e2' : '#666',
                transition: 'color 0.3s ease'
              }}
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
      </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: 'rgba(30, 24, 25, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            backdropFilter: 'blur(10px)'
          }}
        >
          {suggestions.map((movie, index) => (
            <div
              key={movie.movieId}
              onClick={() => handleSuggestionClick(movie)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : 'none',
                background: selectedIndex === index 
                  ? 'rgba(232, 59, 65, 0.2)' 
                  : 'transparent',
                transition: 'background 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {movie.poster && (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  style={{
                    width: '40px',
                    height: '56px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: '#e6e1e2',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {movie.title}
                </div>
                {movie.genre && movie.genre.length > 0 && (
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {Array.isArray(movie.genre) 
                      ? movie.genre.map(g => {
                          const genreValue = typeof g === 'string' ? g.toUpperCase() : g;
                          return enumService.mapGenreToVietnamese(genreValue);
                        }).join(', ') 
                      : enumService.mapGenreToVietnamese(typeof movie.genre === 'string' ? movie.genre.toUpperCase() : movie.genre)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS Animation for pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceSearchBar;

