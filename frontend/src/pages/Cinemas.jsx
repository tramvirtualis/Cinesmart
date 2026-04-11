import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { cinemaComplexService } from '../services/cinemaComplexService';

export default function Cinemas() {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCinemas = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await cinemaComplexService.getAllCinemaComplexes();
        if (result.success && result.data) {
          setCinemas(result.data);
        } else {
          setError(result.error || 'Không thể tải danh sách rạp');
        }
      } catch (err) {
        console.error('Error loading cinemas:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải danh sách rạp');
      } finally {
        setLoading(false);
      }
    };

    loadCinemas();
  }, []);

  return (
    <div className="min-h-screen cinema-mood">
      <Header />

      <main className="main">
        <section className="section section--compact">
          <div className="container">
            <h1 className="section__title" style={{ fontSize: '24px', marginBottom: '16px' }}>Danh sách rạp</h1>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#c9c4c5' }}>
                Đang tải danh sách rạp...
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#e83b41' }}>
                {error}
              </div>
            ) : cinemas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#c9c4c5' }}>
                Không có rạp nào
              </div>
            ) : (
              <div className="cinemas-grid">
                {cinemas.map((cinema) => (
                  <Link
                    key={cinema.complexId}
                    to={`/cinema/${encodeURIComponent(cinema.name)}?province=${encodeURIComponent(cinema.addressProvince || '')}`}
                    className="cinema-item-link"
                  >
                    Cinesmart {cinema.name} ({cinema.addressProvince || ''})
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

