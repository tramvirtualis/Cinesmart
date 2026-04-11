import React from 'react';
import { ROOM_TYPES, SEAT_TYPES } from '../AdminDashboard/constants';

// Manager Price View Component (read-only)
function ManagerPriceView({ prices }) {
  const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <h2 className="admin-card__title">Bảng giá</h2>
      </div>
      <div className="admin-card__content">
        <div className="admin-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  Loại ghế / Loại phòng
                </th>
                {ROOM_TYPES.map(rt => (
                  <th key={rt} style={{ padding: '16px', textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    {rt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEAT_TYPES.map(st => (
                <tr key={st}>
                  <td style={{ padding: '16px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {st}
                  </td>
                  {ROOM_TYPES.map(rt => {
                    const price = (prices || []).find(p => p.roomType === rt && p.seatType === st);
                    return (
                      <td key={`${rt}-${st}`} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {price ? formatCurrency(price.price) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManagerPriceView;


