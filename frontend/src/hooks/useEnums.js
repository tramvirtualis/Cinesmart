import { useState, useEffect } from 'react';
import { enumService } from '../services/enumService';

export const useEnums = () => {
  const [enums, setEnums] = useState({
    genres: [],
    movieStatuses: [],
    ageRatings: [],
    roomTypes: [],
    seatTypes: [],
    languages: [],
    discountTypes: [],
    voucherScopes: [],
    paymentMethods: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEnums = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await enumService.getAllEnums();
        if (result.success) {
          setEnums(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách enum');
      } finally {
        setLoading(false);
      }
    };

    fetchEnums();
  }, []);

  return { enums, loading, error };
};

