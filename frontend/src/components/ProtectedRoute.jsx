import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component - Bảo vệ routes dựa trên role của user
 * 
 * @param {Object} props
 * @param {React.ReactElement} props.children - Component cần được bảo vệ
 * @param {string|string[]} props.allowedRoles - Role(s) được phép truy cập ('CUSTOMER', 'ADMIN', 'MANAGER' hoặc mảng)
 * @param {boolean} props.requireAuth - Yêu cầu đăng nhập (default: true)
 */
export default function ProtectedRoute({ children, allowedRoles, requireAuth = true }) {
  const getUserRole = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return (user.role || '').toString().toUpperCase().trim();
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
    return null;
  };

  const isAuthenticated = () => {
    const token = localStorage.getItem('jwt');
    const user = localStorage.getItem('user');
    return !!(token && user);
  };

  const isRoleAllowed = (userRole) => {
    if (!allowedRoles) return true; // Nếu không chỉ định roles, cho phép tất cả
    
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const normalizedRoles = rolesArray.map(r => r.toString().toUpperCase().trim());
    
    return normalizedRoles.includes(userRole);
  };

  // Kiểm tra authentication
  if (requireAuth && !isAuthenticated()) {
    return <Navigate to="/signin" replace />;
  }

  // Kiểm tra role nếu có yêu cầu
  if (allowedRoles) {
    const userRole = getUserRole();
    
    if (!userRole) {
      // Không có role, redirect về signin
      return <Navigate to="/signin" replace />;
    }

    if (!isRoleAllowed(userRole)) {
      // Role không được phép, redirect về dashboard tương ứng
      if (userRole === 'ADMIN') {
        return <Navigate to="/admin" replace />;
      } else if (userRole === 'MANAGER') {
        return <Navigate to="/manager" replace />;
      } else if (userRole === 'CUSTOMER') {
        return <Navigate to="/" replace />;
      }
      // Nếu role không xác định, về trang chủ
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

