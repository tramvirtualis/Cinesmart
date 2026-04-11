import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickBooking from './QuickBooking.jsx';

const FloatingQuickBooking = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleFilterChange = (filters) => {
    // Check if this is a reset (all values are undefined)
    const isReset = filters.cinemaId === undefined && 
                    filters.movieId === undefined && 
                    filters.date === undefined;
    
    // Only navigate if not a reset (i.e., at least one filter is selected)
    if (!isReset) {
      // Navigate to schedule page with filters
      const params = new URLSearchParams();
      if (filters.cinemaId) params.set('cinema', filters.cinemaId);
      if (filters.movieId) params.set('movie', filters.movieId);
      if (filters.date) params.set('date', filters.date);
      
      navigate(`/schedule?${params.toString()}`);
      setIsOpen(false); // Close panel after navigating
    }
    // If reset, just reset the form without navigating
  };

  return (
    <>
      {/* Floating Tab Button */}
      <button
        className="floating-quick-booking-tab"
        onClick={handleToggle}
        style={{
          position: 'fixed',
          left: isOpen ? '380px' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
          color: '#fff',
          border: 'none',
          borderTopRightRadius: '8px',
          borderBottomRightRadius: '8px',
          padding: '16px 12px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(156, 39, 176, 0.4)',
          transition: 'all 0.3s ease',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'linear-gradient(135deg, #AB47BC 0%, #8E24AA 100%)';
          e.target.style.boxShadow = '0 6px 16px rgba(156, 39, 176, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)';
          e.target.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
        }}
      >
        ĐẶT VÉ NHANH
      </button>

      {/* QuickBooking Panel */}
      {isOpen && (
        <div
          className="floating-quick-booking-panel"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '380px',
            background: 'linear-gradient(135deg, #1f1a1b 0%, #151011 100%)',
            borderRight: '2px solid rgba(156, 39, 176, 0.3)',
            zIndex: 999,
            overflowY: 'auto',
            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)',
            transition: 'transform 0.3s ease'
          }}
        >
          <div style={{ padding: '20px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ 
                color: '#fff', 
                fontSize: '20px', 
                fontWeight: 700,
                margin: 0
              }}>
                Đặt Vé Nhanh
              </h2>
              <button
                onClick={handleToggle}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                ×
              </button>
            </div>
            <QuickBooking onFilterChange={handleFilterChange} />
          </div>
        </div>
      )}

      {/* Overlay when panel is open */}
      {isOpen && (
        <div
          onClick={handleToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      <style>{`
        .floating-quick-booking-panel::-webkit-scrollbar {
          width: 6px;
        }
        
        .floating-quick-booking-panel::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        
        .floating-quick-booking-panel::-webkit-scrollbar-thumb {
          background: rgba(156, 39, 176, 0.5);
          border-radius: 3px;
        }
        
        .floating-quick-booking-panel::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 39, 176, 0.7);
        }
        
        @media (max-width: 768px) {
          .floating-quick-booking-tab {
            font-size: 12px !important;
            padding: 12px 8px !important;
            min-height: 100px !important;
          }
          
          .floating-quick-booking-panel {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  );
};

export default FloatingQuickBooking;

