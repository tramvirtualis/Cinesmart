// src/components/AdminDashboard/PriceManagement.jsx
import React, { useState, useEffect } from "react";
import { useEnums } from "../../hooks/useEnums";
import { enumService } from "../../services/enumService";
import { priceService } from "../../services/priceService";
import { useNotification } from "./NotificationSystem";

function PriceManagement({ prices: initialPricesList, onPricesChange }) {
  const { enums } = useEnums();

  // backend values (TYPE_2D, TYPE_3D,…)
  const backendRoomTypes = enums.roomTypes || [];
  const backendSeatTypes = enums.seatTypes || [];

  // Lấy showToast + NotificationContainer từ hook
  const { showToast, NotificationContainer } = useNotification();

  // display values (2D, 3D…)
  const roomTypes = backendRoomTypes.map(rt =>
    enumService.mapRoomTypeToDisplay(rt)
  );
  const seatTypes = backendSeatTypes.map(st => st);

  const [prices, setPrices] = useState(initialPricesList || []);
  const [draft, setDraft] = useState({});

  // Load bảng giá từ backend khi mount
  useEffect(() => {
    priceService.getAllPrices().then(res => {
      if (res.success) {
        setPrices(res.data);
      } else {
        alert(res.error);
      }
    });
  }, []);

  // Sync draft mỗi khi prices hoặc enums thay đổi
  useEffect(() => {
    const obj = {};
    roomTypes.forEach((rtDisplay, i) => {
      const rtBackend = backendRoomTypes[i];
      seatTypes.forEach(st => {
        const existing = prices.find(
          p => p.roomType === rtBackend && p.seatType === st
        );
        obj[`${rtDisplay}-${st}`] = existing ? Number(existing.price) : 0;
      });
    });
    setDraft(obj);
  }, [prices, roomTypes.length, seatTypes.length]);

  // Update parent khi prices thay đổi
  useEffect(() => {
    if (onPricesChange) onPricesChange(prices);
  }, [prices]);

  const getPrice = (roomTypeDisplay, seatType) =>
    draft[`${roomTypeDisplay}-${seatType}`] ?? 0;

  const setPrice = (roomTypeDisplay, seatType, value) => {
    setDraft(prev => ({
      ...prev,
      [`${roomTypeDisplay}-${seatType}`]: value
    }));
  };

  const handleReset = () => {
    const obj = {};
    roomTypes.forEach((rtDisplay, i) => {
      const rtBackend = backendRoomTypes[i];
      seatTypes.forEach(st => {
        const existing = prices.find(
          p => p.roomType === rtBackend && p.seatType === st
        );
        obj[`${rtDisplay}-${st}`] = existing ? Number(existing.price) : 0;
      });
    });
    setDraft(obj);
  };

  const handleSaveAll = async () => {
    const updatedItems = [];

    roomTypes.forEach((rtDisplay, i) => {
      const rtBackend = backendRoomTypes[i];
      seatTypes.forEach(st => {
        const priceValue = Number(draft[`${rtDisplay}-${st}`] || 0);
        updatedItems.push({
          roomType: rtBackend,
          seatType: st,
          price: priceValue
        });
      });
    });

    try {
      const res = await priceService.saveAllPrices(updatedItems);
      if (!res.success) {
        showToast(res.error || "Lỗi khi lưu!", "error");
        return;
      }
      setPrices(updatedItems);
      showToast("Đã lưu thành công!", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu giá!", "error");
    }
  };

  const formatCurrency = value =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(value);

  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <h2 className="admin-card__title">Bảng giá</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--ghost" onClick={handleReset}>
            Hoàn tác
          </button>
          <button className="btn btn--primary" onClick={handleSaveAll}>
            Lưu bảng giá
          </button>
        </div>
      </div>

      <div className="admin-card__content">
        <div className="admin-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 16 }}>Loại ghế / Loại phòng</th>
                {roomTypes.map(rt => (
                  <th key={rt} style={{ padding: 16, textAlign: "center" }}>
                    {rt}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {seatTypes.map(st => (
                <tr key={st}>
                  <td
                    style={{
                      padding: 16,
                      fontWeight: 600,
                      borderBottom: "1px solid rgba(255,255,255,0.05)"
                    }}
                  >
                    {st}
                  </td>

                  {roomTypes.map(rt => {
                    const val = getPrice(rt, st);
                    return (
                      <td
                        key={`${rt}-${st}`}
                        style={{
                          padding: 16,
                          textAlign: "center",
                          borderBottom: "1px solid rgba(255,255,255,0.05)"
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          value={val}
                          onChange={e =>
                            setPrice(rt, st, Number(e.target.value))
                          }
                          style={{
                            width: "120px",
                            padding: "10px",
                            background: "rgba(20, 15, 16, 0.8)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "14px",
                            textAlign: "center"
                          }}
                        />
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: "#ffd159"
                          }}
                        >
                          {formatCurrency(val)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⚠️ Notification container */}
      <NotificationContainer />
    </div>
  );
}

export default PriceManagement;
