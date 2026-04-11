import React, { useState, useEffect, useMemo } from 'react';
import VoucherAssignModal from './VoucherAssignModal';
import { userService } from '../../services/userService';
import { voucherService } from '../../services/voucherService';
import { useNotification } from './NotificationSystem';

const PROVINCES = [
  // Thành phố trực thuộc Trung ương
  'Hà Nội',
  'Hồ Chí Minh',
  'Hải Phòng',
  'Đà Nẵng',
  'Cần Thơ',
  // Các tỉnh
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bạc Liêu',
  'Bắc Giang',
  'Bắc Kạn',
  'Bắc Ninh',
  'Bến Tre',
  'Bình Định',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Đắk Nông',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Giang',
  'Hà Nam',
  'Hà Tĩnh',
  'Hải Dương',
  'Hậu Giang',
  'Hòa Bình',
  'Hưng Yên',
  'Khánh Hòa',
  'Kiên Giang',
  'Kon Tum',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Long An',
  'Nam Định',
  'Nghệ An',
  'Ninh Bình',
  'Ninh Thuận',
  'Phú Thọ',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sóc Trăng',
  'Sơn La',
  'Tây Ninh',
  'Thái Bình',
  'Thái Nguyên',
  'Thanh Hóa',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'Trà Vinh',
  'Tuyên Quang',
  'Vĩnh Long',
  'Vĩnh Phúc',
  'Yên Bái'
];

// User Management Component
function UserManagement({ users: initialUsersList, cinemas: cinemasList, vouchers: vouchersList, onUsersChange, onVouchersChange }) {
  const [users, setUsers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherAssigningUser, setVoucherAssigningUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    addressDescription: '',
    addressProvince: 'Hồ Chí Minh',
    status: true,
    role: 'MANAGER',
    cinemaComplexId: ''
  });

  // 🎨 Sử dụng custom notification system
  const { showToast, showConfirm, NotificationContainer } = useNotification();

  // Load users từ API
  const loadUsers = async () => {
    setLoading(true);
    try {
      const filters = {
        searchTerm: searchTerm || undefined,
        role: filterRole || undefined,
        status: filterStatus !== '' ? filterStatus === 'true' : undefined,
        province: filterProvince || undefined
      };
      
      const result = await userService.getAllUsers(filters);
      if (result.success) {
        // 🔧 Loại bỏ duplicate
        const uniqueUsers = Array.from(
          new Map((result.data || []).map(user => [user.userId, user])).values()
        );
        
        // ✨ Sắp xếp theo userId tăng dần
        const sortedUsers = uniqueUsers.sort((a, b) => a.userId - b.userId);
        
        setUsers(sortedUsers);
        if (onUsersChange) {
          onUsersChange(sortedUsers);
        }
      } else {
        showToast(result.error || 'Không thể tải danh sách người dùng', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Có lỗi xảy ra khi tải danh sách người dùng', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load vouchers từ API
  const loadVouchers = async () => {
    try {
      const result = await voucherService.getAllVouchers();
      if (result.success) {
        const { mapVoucherScopeFromBackend } = voucherService;
        const mappedVouchers = (result.data || []).map(voucher => {
          const isPublic = mapVoucherScopeFromBackend(voucher.scope);
          
          return {
            voucherId: voucher.voucherId,
            code: voucher.code,
            name: voucher.name,
            description: voucher.description || '',
            discountType: voucher.discountType,
            discountValue: voucher.discountValue,
            maxDiscount: voucher.maxDiscountAmount || 0,
            minOrder: voucher.minOrderAmount || 0,
            startDate: voucher.startDate ? voucher.startDate.split('T')[0] : '',
            endDate: voucher.endDate ? voucher.endDate.split('T')[0] : '',
            isPublic: isPublic,
            image: voucher.image || '',
            assignedUserIds: []
          };
        });
        
        setVouchers(mappedVouchers);
        if (onVouchersChange) {
          onVouchersChange(mappedVouchers);
        }
      }
    } catch (error) {
      console.error('Error loading vouchers:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadVouchers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timer);
  }, [searchTerm, filterRole, filterStatus, filterProvince]);

  const formatRole = (r) => r === 'ADMIN' ? 'Admin' : r === 'MANAGER' ? 'Manager' : 'Customer';

  const handleAddStaff = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      phone: '',
      addressDescription: '',
      addressProvince: 'Hồ Chí Minh',
      status: true,
      role: 'MANAGER',
      cinemaComplexId: ''
    });
    setShowModal(true);
  };

  const handleSaveStaff = async () => {
    // ✅ Validation với notification đẹp
    if (!formData.username || !formData.password || !formData.email || !formData.phone || !formData.addressDescription || !formData.addressProvince) {
      showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
      return;
    }

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast('Email không đúng định dạng', 'error');
      return;
    }

    // Validation phone format (10-11 số)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(formData.phone)) {
      showToast('Số điện thoại phải có 10-11 chữ số', 'error');
      return;
    }

    // Validation username (4-32 ký tự, chỉ chứa chữ cái, số và dấu gạch dưới)
    if (formData.username.length < 4 || formData.username.length > 32) {
      showToast('Tên đăng nhập phải từ 4 đến 32 ký tự', 'error');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      showToast('Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới', 'error');
      return;
    }

    // Validation password (8-32 ký tự, có chữ hoa, chữ thường và số)
    if (formData.password.length < 8 || formData.password.length > 32) {
      showToast('Mật khẩu phải có 8-32 ký tự', 'error');
      return;
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!passwordRegex.test(formData.password)) {
      showToast('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số', 'error');
      return;
    }

    // Manager luôn cần gán vào một cụm rạp
    if (!formData.cinemaComplexId) {
      showToast('Manager cần gán vào một cụm rạp', 'error');
      return;
    }

    setLoading(true);
    try {
      const staffData = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: formData.phone,
        addressDescription: formData.addressDescription,
        addressProvince: formData.addressProvince,
        status: formData.status,
        role: 'MANAGER', // Chỉ tạo MANAGER
        cinemaComplexId: Number(formData.cinemaComplexId)
      };

      const result = await userService.createStaff(staffData);
      if (result.success) {
        showToast(result.message || 'Tạo tài khoản thành công', 'success');
        setShowModal(false);
        setFormData({
          username: '',
          password: '',
          email: '',
          phone: '',
          addressDescription: '',
          addressProvince: 'Hồ Chí Minh',
          status: true,
          role: 'MANAGER',
          cinemaComplexId: ''
        });
        await loadUsers();
      } else {
        showToast(result.error || 'Không thể tạo tài khoản', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Có lỗi xảy ra khi tạo tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    // ✅ Sử dụng custom confirm dialog
    const confirmed = await showConfirm({
      title: user.status ? 'Chặn người dùng' : 'Bỏ chặn người dùng',
      message: `Bạn có chắc chắn muốn ${user.status ? 'chặn' : 'bỏ chặn'} người dùng "${user.username}" không?`,
      confirmText: user.status ? 'Chặn' : 'Bỏ chặn',
      cancelText: 'Hủy',
      type: user.status ? 'danger' : 'success'
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await userService.toggleUserStatus(user.userId);
      if (result.success) {
        showToast(result.message || 'Cập nhật trạng thái thành công', 'success');
        await loadUsers();
      } else {
        showToast(result.error || 'Không thể cập nhật trạng thái', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Có lỗi xảy ra khi cập nhật trạng thái', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canAssignVoucher = (user) => user.role === 'USER';

  // Filter users
  const filteredUsers = useMemo(() => users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesStatus = !filterStatus || String(user.status) === filterStatus;
    const matchesProvince = !filterProvince || user.address?.includes(filterProvince);
    return matchesSearch && matchesRole && matchesStatus && matchesProvince;
  }), [users, searchTerm, filterRole, filterStatus, filterProvince]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterStatus, filterProvince]);

  return (
    <>
      {/* 🎨 Notification Container */}
      <NotificationContainer />

      <div className="admin-card">
        <div className="admin-card__header">
          <h2 className="admin-card__title">Quản lý người dùng</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', alignItems: 'center' }}>
            <input
              className="movie-search__input"
              style={{ minWidth: 180, flex: 1 }}
              placeholder="Tìm username, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="movie-filter" style={{ minWidth: 120 }}>
              <option value="">Tất cả vai trò</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="USER">CUSTOMER</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="movie-filter" style={{ minWidth: 120 }}>
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Khóa</option>
            </select>
            <select value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)} className="movie-filter" style={{ minWidth: 120 }}>
              <option value="">Tất cả tỉnh/thành</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn btn--primary" onClick={handleAddStaff} style={{ whiteSpace: 'nowrap' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tạo tài khoản Staff
            </button>
          </div>
        </div>
        
        <div className="admin-card__content">
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #e83b41', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: '10px', color: '#666' }}>Đang tải...</p>
            </div>
          )}
          {!loading && (
            <div className="admin-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Địa chỉ</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        {searchTerm || filterRole || filterStatus || filterProvince ? 'Không tìm thấy người dùng nào phù hợp' : 'Không có dữ liệu'}
                      </td>
                    </tr>
                  ) : (
                    currentUsers.map(u => (
                  <tr key={u.userId}>
                    <td>{u.userId}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td>{u.address}</td>
                    <td>
                      {formatRole(u.role)}
                    </td>
                    <td>
                      <span 
                        className="movie-status-badge" 
                        style={{ 
                          backgroundColor: u.status ? '#4caf50' : '#9e9e9e',
                          cursor: u.role === 'ADMIN' ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '100px'
                        }}
                        onClick={u.role === 'ADMIN' ? undefined : () => handleToggleStatus(u)}
                        title={u.role === 'ADMIN' ? undefined : `Click để ${u.status ? 'chặn' : 'bỏ chặn'}`}
                      >
                        {u.status ? 'Hoạt động' : 'Khóa'}
                      </span>
                    </td>
                    <td>
                      <div className="movie-table-actions">
                        {u.role !== 'ADMIN' && (
                          <button 
                            className="movie-action-btn"
                            onClick={() => handleToggleStatus(u)}
                            title={u.status ? 'Chặn người dùng này' : 'Bỏ chặn người dùng này'}
                            style={{ color: u.status ? '#e83b41' : '#4caf50' }}
                          >
                            {u.status ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4" y1="4" x2="20" y2="20"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            )}
                          </button>
                        )}
                        {canAssignVoucher(u) && (
                          <button 
                            className="movie-action-btn" 
                            onClick={() => { setVoucherAssigningUser(u); setShowVoucherModal(true); }} 
                            title="Gán voucher"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M12 12v6M9 15h6"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > 0 && totalPages > 1 && (() => {
            const getPageNumbers = () => {
              const pages = [];
              const maxVisible = 7;
              
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                pages.push(1);
                
                if (currentPage <= 4) {
                  for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pages.push('ellipsis-start');
                  for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  pages.push('ellipsis-start');
                  pages.push(currentPage - 1);
                  pages.push(currentPage);
                  pages.push(currentPage + 1);
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                }
              }
              
              return pages;
            };
            
            const pageNumbers = getPageNumbers();
            
            return (
              <div className="movie-reviews-pagination mt-8 justify-center" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                <button
                  className="movie-reviews-pagination__btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                {pageNumbers.map((page, index) => {
                  if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        style={{
                          padding: '8px 4px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '14px',
                          userSelect: 'none'
                        }}
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={page}
                      className={`movie-reviews-pagination__btn movie-reviews-pagination__btn--number ${currentPage === page ? 'movie-reviews-pagination__btn--active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  className="movie-reviews-pagination__btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Modal tạo tài khoản Staff */}
        {showModal && (
          <div className="movie-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
              <div className="movie-modal__header">
                <h2>Tạo tài khoản Staff</h2>
                <button className="movie-modal__close" onClick={() => setShowModal(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="movie-modal__content">
                <div className="movie-form">
                  <div className="movie-form__row">
                    <div className="movie-form__group">
                      <label>Username <span className="required">*</span></label>
                      <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div className="movie-form__group">
                      <label>Password <span className="required">*</span></label>
                      <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </div>
                  <div className="movie-form__row">
                    <div className="movie-form__group">
                      <label>Email <span className="required">*</span></label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@email.com" />
                    </div>
                    <div className="movie-form__group">
                      <label>Phone <span className="required">*</span></label>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="10-11 chữ số" />
                    </div>
                  </div>
                  <div className="movie-form__group">
                    <label>Địa chỉ - Mô tả <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.addressDescription}
                      onChange={(e) => setFormData({ ...formData, addressDescription: e.target.value })}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện"
                    />
                  </div>
                  <div className="movie-form__group">
                    <label>Tỉnh/Thành phố <span className="required">*</span></label>
                    <select
                      value={formData.addressProvince}
                      onChange={(e) => setFormData({ ...formData, addressProvince: e.target.value })}
                    >
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="movie-form__row">
                    <div className="movie-form__group">
                      <label>Vai trò <span className="required">*</span></label>
                      <select
                        value={formData.role}
                        disabled
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                      >
                        <option value="MANAGER">MANAGER</option>
                      </select>
                    </div>
                    <div className="movie-form__group">
                      <label>Cụm rạp (Manager) <span className="required">*</span></label>
                      <select
                        value={formData.cinemaComplexId}
                        onChange={(e) => setFormData({ ...formData, cinemaComplexId: e.target.value })}
                      >
                        <option value="">Chọn cụm rạp</option>
                        {cinemasList.map(c => (
                          <option key={c.complexId} value={c.complexId}>
                            #{c.complexId} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="movie-modal__footer">
                <button className="btn btn--ghost" onClick={() => setShowModal(false)} disabled={loading}>Hủy</button>
                <button className="btn btn--primary" onClick={handleSaveStaff} disabled={loading}>
                  {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal gán voucher */}
        {showVoucherModal && voucherAssigningUser && vouchers && canAssignVoucher(voucherAssigningUser) && (
          <VoucherAssignModal
            user={voucherAssigningUser}
            vouchers={vouchers}
            onClose={() => { setShowVoucherModal(false); setVoucherAssigningUser(null); }}
            onSave={async (updatedVouchers) => {
              setVouchers(updatedVouchers);
              if (onVouchersChange) {
                onVouchersChange(updatedVouchers);
              }
              showToast('Cập nhật voucher thành công', 'success');
              setShowVoucherModal(false);
              setVoucherAssigningUser(null);
              await loadVouchers();
            }}
          />
        )}
      </div>
    </>
  );
}

export default UserManagement;