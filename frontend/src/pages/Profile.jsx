import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import interstellar from '../assets/images/interstellar.jpg';
import inception from '../assets/images/inception.jpg';
import darkKnightRises from '../assets/images/the-dark-knight-rises.jpg';
import driveMyCar from '../assets/images/drive-my-car.jpg';
import { updateCustomerProfile, uploadAvatar, getExpenseStatistics, getCurrentProfile, updateOldOrders, checkPassword, updatePassword, createPassword } from '../services/customer.js';
import { customerVoucherService } from '../services/customerVoucherService';
import { walletService, walletPinService } from '../services/walletService';
import { paymentService } from '../services/paymentService';

const PROVINCES = [
  'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'An Giang', 'Bà Rịa - Vũng Tàu',
  'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương',
  'Bình Phước', 'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương',
  'Hậu Giang', 'Hòa Bình', 'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình',
  'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh',
  'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

const storedUser = JSON.parse(localStorage.getItem('user')) || {};

const initialUserData = {
  userId: storedUser.userId || "",
  name: storedUser.name || "",
  email: storedUser.email || "",
  phone: storedUser.phone || "",
  dob: storedUser.dob || "",
  joinDate: storedUser.joinDate || "",
  address: {
    description: storedUser.address?.description || "",
    province: storedUser.address?.province || ""
  },
  avatar: storedUser.avatar || null,
  totalBookings: storedUser.totalBookings || 0,
  totalSpent: storedUser.totalSpent || 0,
  favoriteMovies: storedUser.favoriteMovies || 0,
};

// Vouchers sẽ được load từ API

const favoriteMovies = [
  { id: 1, title: 'Inception', poster: inception, addedDate: '2024-10-15' },
  { id: 2, title: 'Interstellar', poster: interstellar, addedDate: '2024-09-20' },
  { id: 3, title: 'The Dark Knight Rises', poster: darkKnightRises, addedDate: '2024-08-10' },
  { id: 4, title: 'Drive My Car', poster: driveMyCar, addedDate: '2024-07-05' },
];


export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(initialUserData);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [expenseStats, setExpenseStats] = useState({
    totalSpent: 0,
    totalTickets: 0,
    totalOrders: 0,
    totalTopUp: 0,
    thisMonthSpent: 0,
    lastMonthSpent: 0,
    lastThreeMonthsSpent: 0
  });
  const [loadingExpenseStats, setLoadingExpenseStats] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [loadingPasswordCheck, setLoadingPasswordCheck] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  
  // Wallet states
  const [walletInfo, setWalletInfo] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('MOMO');
  const [walletMessage, setWalletMessage] = useState({ type: '', text: '' });
  
  // PIN states
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [hasPin, setHasPin] = useState(null);
  const [loadingPinCheck, setLoadingPinCheck] = useState(false);
  const [pinMessage, setPinMessage] = useState({ type: '', text: '' });

  // Load user profile from API
  useEffect(() => {
    const loadUserProfile = async () => {
      const token = localStorage.getItem('jwt');
      const storedUser = JSON.parse(localStorage.getItem('user')) || {};
      
      if (!token) {
        // Fallback to localStorage if no token
        if (storedUser.userId) {
          setUserData({
            userId: storedUser.userId || "",
            name: storedUser.name || "",
            email: storedUser.email || "",
            phone: storedUser.phone || "",
            dob: storedUser.dob || "",
            joinDate: storedUser.joinDate || "",
            address: {
              description: storedUser.address?.description || "",
              province: storedUser.address?.province || ""
            },
            avatar: storedUser.avatar || null,
            totalBookings: storedUser.totalBookings || 0,
            totalSpent: storedUser.totalSpent || 0,
            favoriteMovies: storedUser.favoriteMovies || 0,
          });
        }
        return;
      }

      try {
        const profile = await getCurrentProfile();
        
        // Update userData
        setUserData({
          userId: profile.userId || "",
          name: profile.name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          dob: profile.dob || "",
          joinDate: storedUser.joinDate || "",
          address: {
            description: profile.address?.description || "",
            province: profile.address?.province || ""
          },
          avatar: profile.avatar || null,
          totalBookings: storedUser.totalBookings || 0,
          totalSpent: storedUser.totalSpent || 0,
          favoriteMovies: storedUser.favoriteMovies || 0,
        });

        // Update localStorage với avatar mới
        storedUser.avatar = profile.avatar;
        storedUser.name = profile.name;
        storedUser.email = profile.email;
        storedUser.phone = profile.phone;
        storedUser.dob = profile.dob;
        if (profile.address) {
          storedUser.address = profile.address;
        }
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        // Dispatch event để Header cập nhật avatar
        window.dispatchEvent(new Event('userUpdated'));
      } catch (error) {
        console.error('Error loading profile from API:', error);
        // Fallback to localStorage
        if (storedUser.userId) {
          setUserData({
            userId: storedUser.userId || "",
            name: storedUser.name || "",
            email: storedUser.email || "",
            phone: storedUser.phone || "",
            dob: storedUser.dob || "",
            joinDate: storedUser.joinDate || "",
            address: {
              description: storedUser.address?.description || "",
              province: storedUser.address?.province || ""
            },
            avatar: storedUser.avatar || null,
            totalBookings: storedUser.totalBookings || 0,
            totalSpent: storedUser.totalSpent || 0,
            favoriteMovies: storedUser.favoriteMovies || 0,
          });
        }
      }
    };

    loadUserProfile();
  }, []);

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['overview', 'vouchers', 'expenses', 'password', 'wallet', 'pin'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      // If no tab in URL, default to overview (but don't add ?tab=overview to URL)
      setActiveTab('overview');
    }
  }, []); // Only run on mount

  // Load password status when password tab is active
  useEffect(() => {
    const loadPasswordStatus = async () => {
      if (activeTab === 'password') {
        setLoadingPasswordCheck(true);
        setPasswordMessage({ type: '', text: '' }); // Clear previous messages
        try {
          const hasPwd = await checkPassword();
          const isTrue = hasPwd === true || hasPwd === 'true' || hasPwd === 1;
          setHasPassword(isTrue);
        } catch (error) {
          console.error('Error checking password status:', error);
          // Set to false nếu có lỗi (giả sử chưa có mật khẩu để hiển thị form tạo)
          setHasPassword(false);
        } finally {
          setLoadingPasswordCheck(false);
        }
      }
    };
    
    // Only run if activeTab is password
    if (activeTab === 'password') {
      loadPasswordStatus();
    } else {
      // Reset khi chuyển tab khác
      setHasPassword(null);
    }
  }, [activeTab]);

  // Load vouchers from API
  useEffect(() => {
    const loadVouchers = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setVouchers([]);
        return;
      }

      setLoadingVouchers(true);
      try {
        const result = await customerVoucherService.getUserVouchers();
        if (result.success) {
          setVouchers(result.data || []);
        } else {
          setVouchers([]);
        }
      } catch (error) {
        console.error('Error loading vouchers:', error);
        setVouchers([]);
      } finally {
        setLoadingVouchers(false);
      }
    };

    loadVouchers();
  }, []);


  // Load expense statistics when expenses tab is active
  useEffect(() => {
    const loadExpenseStatistics = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        console.error('No JWT token found');
        return;
      }
      
      if (activeTab !== 'expenses') {
        return;
      }

      setLoadingExpenseStats(true);
      
      try {
        // First, update old orders to set vnpPayDate
        await updateOldOrders();
        
        const stats = await getExpenseStatistics();
        
        const expenseData = {
          totalSpent: stats.totalSpent ? Number(stats.totalSpent) : 0,
          totalTickets: stats.totalTickets ? Number(stats.totalTickets) : 0,
          totalOrders: stats.totalOrders ? Number(stats.totalOrders) : 0,
          totalTopUp: stats.totalTopUp ? Number(stats.totalTopUp) : 0,
          thisMonthSpent: stats.thisMonthSpent ? Number(stats.thisMonthSpent) : 0,
          lastMonthSpent: stats.lastMonthSpent ? Number(stats.lastMonthSpent) : 0,
          lastThreeMonthsSpent: stats.lastThreeMonthsSpent ? Number(stats.lastThreeMonthsSpent) : 0
        };
        
        setExpenseStats(expenseData);
      } catch (error) {
        // Keep default values on error
      } finally {
        setLoadingExpenseStats(false);
      }
    };

    loadExpenseStatistics();
  }, [activeTab]);

  // Load wallet data when wallet tab is active
  useEffect(() => {
    const loadWalletData = async () => {
      if (activeTab === 'wallet') {
        setLoadingWallet(true);
        setWalletMessage({ type: '', text: '' });
        try {
          const wallet = await walletService.getWallet();
          setWalletInfo(wallet);
        } catch (err) {
          console.error('Error loading wallet:', err);
          setWalletMessage({ type: 'error', text: err.message || 'Không thể tải thông tin ví' });
        } finally {
          setLoadingWallet(false);
        }
      } else {
        // Reset wallet data when switching tabs
        setWalletInfo(null);
      }
    };
    
    if (activeTab === 'wallet') {
      loadWalletData();
    }
  }, [activeTab]);

  // Load PIN status when PIN tab is active
  useEffect(() => {
    const loadPinStatus = async () => {
      if (activeTab === 'pin') {
        setLoadingPinCheck(true);
        setPinMessage({ type: '', text: '' });
        try {
          const status = await walletPinService.getPinStatus();
          setHasPin(status.hasPin);
          if (status.locked) {
            setPinMessage({ 
              type: 'error', 
              text: `Mã PIN của bạn đang bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau.` 
            });
          }
        } catch (error) {
          console.error('Error checking PIN status:', error);
          setHasPin(false);
        } finally {
          setLoadingPinCheck(false);
        }
      } else {
        setHasPin(null);
      }
    };
    
    if (activeTab === 'pin') {
      loadPinStatus();
    }
  }, [activeTab]);

  // Handler to change tab and update URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      // Remove tab parameter for overview (default tab)
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('tab');
      setSearchParams(newSearchParams, { replace: true });
    } else {
      // Update URL with tab parameter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('tab', tab);
      setSearchParams(newSearchParams, { replace: true });
    }
  };

  // Handle wallet top-up
  const handleTopUp = async (e) => {
    e.preventDefault();
    setWalletMessage({ type: '', text: '' });
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.status === false) {
      setWalletMessage({ type: 'error', text: 'Tài khoản của bạn đã bị chặn. Bạn không thể nạp ví. Vui lòng liên hệ quản trị viên để được hỗ trợ.' });
      return;
    }

    const amount = Number(topUpAmount);
    if (!amount || amount < 10000) {
      setWalletMessage({ type: 'error', text: 'Số tiền nạp tối thiểu là 10.000đ' });
      return;
    }

    try {
      setTopUpLoading(true);

      if (paymentMethod === 'MOMO') {
        const response = await paymentService.createMomoPayment({
          amount: amount,
          orderDescription: `Nạp tiền vào ví Cinesmart - ${amount.toLocaleString('vi-VN')}đ`,
          voucherId: null,
          voucherCode: null,
          showtimeId: null,
          seatIds: [],
          foodCombos: [],
          cinemaComplexId: null
        });

        if (response.success && response.data?.paymentUrl) {
          window.location.href = response.data.paymentUrl;
        } else {
          setWalletMessage({ type: 'error', text: response.message || 'Không thể tạo đơn thanh toán MoMo' });
          setTopUpLoading(false);
        }
      } else if (paymentMethod === 'ZALOPAY') {
        const orderId = `TOPUP-${Date.now()}`;
        const description = `Nạp tiền vào ví Cinesmart - ${amount.toLocaleString('vi-VN')}đ`;

        const response = await paymentService.createZaloPayOrder(
          amount,
          description,
          orderId,
          {
            showtimeId: null,
            seatIds: [],
            foodCombos: [],
            voucherCode: null,
            cinemaComplexId: null
          }
        );

        if (response.success && response.data?.payment_url) {
          window.location.href = response.data.payment_url;
        } else {
          setWalletMessage({ type: 'error', text: response.error || response.message || 'Không thể tạo đơn thanh toán ZaloPay' });
          setTopUpLoading(false);
        }
      }
    } catch (err) {
      console.error('Error creating top-up payment:', err);
      setWalletMessage({ type: 'error', text: err.message || 'Nạp tiền thất bại' });
      setTopUpLoading(false);
    }
  };

  // Handle PIN submit
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinMessage({ type: '', text: '' });

    // Validate PIN format (6 digits)
    const pinRegex = /^\d{6}$/;

    try {
      if (hasPin === true) {
        // Update PIN
        if (!pinForm.currentPin || !pinForm.newPin || !pinForm.confirmPin) {
          setPinMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
          return;
        }
        if (!pinRegex.test(pinForm.currentPin) || !pinRegex.test(pinForm.newPin)) {
          setPinMessage({ type: 'error', text: 'Mã PIN phải là 6 chữ số' });
          return;
        }
        if (pinForm.newPin !== pinForm.confirmPin) {
          setPinMessage({ type: 'error', text: 'Mã PIN mới và xác nhận không khớp' });
          return;
        }
        if (pinForm.currentPin === pinForm.newPin) {
          setPinMessage({ type: 'error', text: 'Mã PIN mới phải khác mã PIN cũ' });
          return;
        }
        
        await walletPinService.updatePin({
          currentPin: pinForm.currentPin,
          newPin: pinForm.newPin,
          confirmPin: pinForm.confirmPin
        });
        
        setPinMessage({ type: 'success', text: 'Đổi mã PIN thành công!' });
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        // Create PIN
        if (!pinForm.newPin || !pinForm.confirmPin) {
          setPinMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
          return;
        }
        if (!pinRegex.test(pinForm.newPin)) {
          setPinMessage({ type: 'error', text: 'Mã PIN phải là 6 chữ số' });
          return;
        }
        if (pinForm.newPin !== pinForm.confirmPin) {
          setPinMessage({ type: 'error', text: 'Mã PIN và xác nhận không khớp' });
          return;
        }
        
        await walletPinService.createPin({
          pin: pinForm.newPin,
          confirmPin: pinForm.confirmPin
        });
        
        setPinMessage({ type: 'success', text: 'Tạo mã PIN thành công!' });
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
        setHasPin(true);
      }
    } catch (error) {
      setPinMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    // Validation regex giống đăng ký
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

    try {
      if (hasPassword === true) {
        // Update password
        if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp' });
          return;
        }
        if (passwordForm.newPassword.length < 8 || passwordForm.newPassword.length > 32) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải từ 8 đến 32 ký tự' });
          return;
        }
        if (!passwordRegex.test(passwordForm.newPassword)) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số' });
          return;
        }
        // Kiểm tra mật khẩu mới phải khác mật khẩu cũ (backend cũng check nhưng check ở frontend để UX tốt hơn)
        if (passwordForm.oldPassword === passwordForm.newPassword) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu cũ' });
          return;
        }
        await updatePassword(passwordForm.oldPassword, passwordForm.newPassword, passwordForm.confirmPassword);
        setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        // Create password
        if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu và xác nhận mật khẩu không khớp' });
          return;
        }
        if (passwordForm.newPassword.length < 8 || passwordForm.newPassword.length > 32) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu phải từ 8 đến 32 ký tự' });
          return;
        }
        if (!passwordRegex.test(passwordForm.newPassword)) {
          setPasswordMessage({ type: 'error', text: 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số' });
          return;
        }
        await createPassword(passwordForm.newPassword, passwordForm.confirmPassword);
        setPasswordMessage({ type: 'success', text: 'Tạo mật khẩu thành công!' });
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setHasPassword(true); // Update state after creating password
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
    }
  };


  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  };
  
  const [editData, setEditData] = useState({
    name: initialUserData.name,
    email: initialUserData.email,
    phone: initialUserData.phone,
    dob: initialUserData.dob,
    addressDescription: initialUserData.address.description,
    addressProvince: initialUserData.address.province,
  });

  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  // Update editData when isEditing becomes true (when opening the edit form)
  useEffect(() => {
    if (isEditing) {
      setEditData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        dob: userData.dob || '',
        addressDescription: userData.address?.description || '',
        addressProvince: userData.address?.province || '',
      });
    }
  }, [isEditing]); // Only update when isEditing changes, not when userData changes (to avoid overwriting user's edits)

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const showFormMessage = (type, text) => {
    setFormMessage({ type, text });
    // Scroll to top of modal content
    setTimeout(() => {
      const modalContent = document.querySelector('.movie-modal__content');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
    }, 0);
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Chỉ chấp nhận file ảnh');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Kích thước file không được vượt quá 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const avatarUrl = await uploadAvatar(userData.userId, file);
      
      // Update userData and localStorage
      const updatedUserData = { ...userData, avatar: avatarUrl };
      setUserData(updatedUserData);
      
      // Update localStorage
      const storedUser = JSON.parse(localStorage.getItem('user')) || {};
      storedUser.avatar = avatarUrl;
      localStorage.setItem('user', JSON.stringify(storedUser));
      
      // Dispatch event to update header avatar
      window.dispatchEvent(new Event('userUpdated'));
      
      showMessage('success', 'Cập nhật ảnh đại diện thành công');
    } catch (error) {
      showMessage('error', error.message || 'Có lỗi xảy ra khi upload ảnh');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      e.target.value = '';
    }
  };



  const handleSaveChanges = async () => {
    try {
      // Clear previous messages
      setFormMessage({ type: '', text: '' });

      // Validate: Tên không được để trống
      if (!editData.name.trim()) {
        showFormMessage('error', 'Vui lòng nhập họ và tên');
        return;
      }

      // Validate: Tuổi phải từ 13 trở lên
      if (editData.dob) {
        const birthDate = new Date(editData.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 13) {
          showFormMessage('error', 'Bạn phải từ 13 tuổi trở lên');
          return;
        }
      }

      const updatedUser = await updateCustomerProfile(userData.userId, {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        dob: editData.dob,
        addressDescription: editData.addressDescription,
        addressProvince: editData.addressProvince,
      });
  
      const formatDate = (date) => {
        if (!date) return "";
        if (typeof date === 'string') return date;
        return date;
      };
  
      // Map response data correctly
      const updatedUserData = {
        userId: updatedUser.userId || userData.userId,
        name: updatedUser.name || editData.name || "",
        email: updatedUser.email || editData.email || "",
        phone: updatedUser.phone || editData.phone || "",
        dob: formatDate(updatedUser.dob) || editData.dob || "",
        joinDate: userData.joinDate || "",
        avatar: updatedUser.avatar || userData.avatar || null,
        address: {
          description: (updatedUser.address && updatedUser.address.description) 
            ? updatedUser.address.description 
            : (editData.addressDescription || ""),
          province: (updatedUser.address && updatedUser.address.province) 
            ? updatedUser.address.province 
            : (editData.addressProvince || ""),
        },
        totalBookings: userData.totalBookings || 0,
        totalSpent: userData.totalSpent || 0,
        favoriteMovies: userData.favoriteMovies || 0,
      };
  
      setUserData(updatedUserData);
      
      // Preserve JWT token and other important data when updating localStorage
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const updatedUserWithToken = {
        ...updatedUserData,
        // Preserve JWT token if it exists
        token: currentUser.token || undefined,
        // Preserve role if it exists
        role: currentUser.role || updatedUserData.role,
        // Preserve joinDate if it exists
        joinDate: currentUser.joinDate || updatedUserData.joinDate,
      };
      localStorage.setItem('user', JSON.stringify(updatedUserWithToken));
      
      // Dispatch event to update header
      window.dispatchEvent(new Event('userUpdated'));
      
      // Show success message but don't close form
      showFormMessage('success', 'Cập nhật thông tin thành công!');
      
      // Auto close after 3 seconds
      setTimeout(() => {
        setIsEditing(false);
        setFormMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      console.error('Lỗi cập nhật profile:', err);
      let errorMessage = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi cập nhật thông tin';
      
      // Xóa các prefix "email:", "dob:", "phone:" khỏi thông báo lỗi
      errorMessage = errorMessage
        .replace(/email:\s*/gi, '')
        .replace(/dob:\s*/gi, '')
        .replace(/phone:\s*/gi, '')
        .replace(/name:\s*/gi, '')
        .replace(/address:\s*/gi, '');
      
      // Show error message inside form, don't close form
      showFormMessage('error', errorMessage);
    }
  };

  return (
    <div className="min-h-screen cinema-mood">
      <Header />
      <main className="main">
        <section className="section">
          <div className="container">
            {/* Profile Header */}
            <div className="profile-header">
              <div className="profile-header__avatar">
                {userData.avatar ? (
                  <img 
                    src={userData.avatar} 
                    alt="Avatar" 
                    className="profile-avatar-image"
                  />
                ) : (
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="60" cy="60" r="60" fill="#4a3f41"/>
                    <circle cx="60" cy="45" r="25" fill="#e6e1e2"/>
                    <path d="M30 90c0-16.569 13.431-30 30-30s30 13.431 30 30" fill="#e6e1e2"/>
                  </svg>
                )}
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    style={{
                      position: 'absolute',
                      width: '40px',
                      height: '40px',
                      opacity: 0,
                      cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                      zIndex: 2
                    }}
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="profile-header__edit-avatar"
                    title={uploadingAvatar ? 'Đang tải...' : 'Đổi ảnh đại diện'}
                    style={{
                      cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                      opacity: uploadingAvatar ? 0.6 : 1
                    }}
                  >
                    {uploadingAvatar ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
                          <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                          <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    )}
                  </label>
                </div>
              </div>
              <div className="profile-header__info">
                <h1 className="profile-header__name">{userData.name}</h1>
                <div className="profile-header__meta">
                  <span>{userData.email}</span>
                  <span>{userData.phone}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
              <button
                className={`profile-tab ${activeTab === 'overview' ? 'profile-tab--active' : ''}`}
                onClick={() => handleTabChange('overview')}
              >
                Tổng quan
              </button>
              <button
                className={`profile-tab ${activeTab === 'vouchers' ? 'profile-tab--active' : ''}`}
                onClick={() => handleTabChange('vouchers')}
              >
                Voucher
              </button>
              <button
                className={`profile-tab ${activeTab === 'expenses' ? 'profile-tab--active' : ''}`}
                onClick={() => handleTabChange('expenses')}
              >
                Chi tiêu
              </button>
              <button
                className={`profile-tab ${activeTab === 'wallet' ? 'profile-tab--active' : ''}`}
                onClick={() => handleTabChange('wallet')}
              >
                Ví Cinesmart
              </button>
              <button
                className={`profile-tab ${activeTab === 'pin' ? 'profile-tab--active' : ''}`}
                onClick={() => handleTabChange('pin')}
              >
                Cài đặt PIN
              </button>
              <button
                className={`profile-tab ${activeTab === 'password' ? 'profile-tab--active' : ''}`}
                onClick={() => handleTabChange('password')}
              >
                Cập nhật mật khẩu
              </button>
            </div>

            {/* Tab Content */}
            <div className="profile-content">
              {activeTab === 'overview' && (
                <div>
                  {/* Personal Information */}
                  <div className="profile-section">
                    <h2 className="profile-section__title">Thông tin cá nhân</h2>
                    <div className="profile-info-grid">
                      <div className="profile-info-item">
                        <span className="profile-info-item__label">Họ và tên</span>
                        <span className="profile-info-item__value">{userData.name}</span>
                      </div>
                      <div className="profile-info-item">
                        <span className="profile-info-item__label">Email</span>
                        <span className="profile-info-item__value">{userData.email}</span>
                      </div>
                      <div className="profile-info-item">
                        <span className="profile-info-item__label">Số điện thoại</span>
                        <span className="profile-info-item__value">{userData.phone}</span>
                      </div>
                      <div className="profile-info-item">
                        <span className="profile-info-item__label">Ngày sinh</span>
                        <span className="profile-info-item__value">
                          {userData.dob ? new Date(userData.dob).toLocaleDateString('vi-VN') : '-'}
                        </span>
                      </div>
                      <div className="profile-info-item col-span-full">
                        <span className="profile-info-item__label">Địa chỉ</span>
                        <span className="profile-info-item__value">
                          {[userData.address?.description, userData.address?.province]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </span>
                      </div>
                    </div>
                    <button className="btn btn--primary mt-5" onClick={() => setIsEditing(true)}>
                      Chỉnh sửa thông tin
                    </button>
                  </div>
                  
                </div>
              )}

              {activeTab === 'vouchers' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 className="profile-section__title">Voucher của tôi ({vouchers.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loadingVouchers ? (
                      <div className="col-span-full flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#e83b41] mb-4"></div>
                          <p className="text-[#c9c4c5]">Đang tải voucher...</p>
                        </div>
                      </div>
                    ) : vouchers.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <svg className="w-16 h-16 mx-auto mb-4 text-[#4a3f41]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                        <p className="text-[#c9c4c5] text-lg">Bạn chưa có voucher nào</p>
                        <a href="/events" className="text-[#e83b41] hover:text-[#ff5258] mt-2 inline-block">
                          Khám phá voucher ngay →
                        </a>
                      </div>
                    ) : (
                      vouchers.map((voucher) => {
                        const discountBadge = voucher.discountType === 'PERCENT'
                          ? `-${voucher.discountPercent}%`
                          : voucher.discount > 0
                          ? `-${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(voucher.discount)}`
                          : 'FREE';
                        const isAvailable = voucher.status === 'available';
                        const statusText = voucher.status === 'upcoming' ? 'Sắp diễn ra' : voucher.status === 'available' ? 'Có thể dùng' : 'Đã hết hạn';
                        const statusColor = voucher.status === 'upcoming' ? 'bg-[#ff9800]' : voucher.status === 'available' ? 'bg-[#4caf50]' : 'bg-[#9e9e9e]';
                        
                        return (
                          <div 
                            key={voucher.voucherId || voucher.id} 
                            className="group relative bg-gradient-to-br from-[#2d2627] to-[#1a1415] border border-[#4a3f41] rounded-2xl overflow-hidden hover:border-[#e83b41] transition-all duration-300 hover:shadow-xl hover:shadow-[#e83b41]/20 hover:-translate-y-1"
                          >
                            {/* Image Section */}
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={voucher.image || 'https://via.placeholder.com/1000x430?text=Voucher'}
                                alt={voucher.title || voucher.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                              
                              <div className="absolute top-3 left-3 bg-gradient-to-r from-[#e83b41] to-[#ff5258] text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm border border-white/20">
                                {discountBadge}
                              </div>
                              
                              <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold uppercase shadow-lg backdrop-blur-sm border ${statusColor} text-white border-white/20`}>
                                {statusText}
                              </div>
                            </div>

                            {/* Content Section */}
                            <div className="p-5 flex flex-col min-h-[200px]">
                              <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 leading-tight">
                                {voucher.title || voucher.name}
                              </h3>

                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="inline-flex items-center px-3 py-1.5 bg-[#4a3f41]/60 border border-[#4a3f41] rounded-lg text-xs font-semibold text-[#ffd159]">
                                  Mã: {voucher.code}
                                </span>
                                {voucher.expiryDate && (
                                  <span className="inline-flex items-center px-3 py-1.5 bg-[#4a3f41]/60 border border-[#4a3f41] rounded-lg text-xs font-semibold text-[#ffd159]">
                                    HSD: {new Date(voucher.expiryDate).toLocaleDateString('vi-VN')}
                                  </span>
                                )}
                              </div>

                              <p className="text-sm text-[#c9c4c5] line-clamp-2 mb-4 flex-1">
                                {voucher.description || 'Không có mô tả'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'expenses' && (
                <div>
                  {loadingExpenseStats ? (
                    <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd159] mb-5"></div>
                      <p className="text-base m-0">Đang tải thống kê chi tiêu...</p>
                    </div>
                  ) : (
                    <>
                      {/* Main Statistics - 3 columns */}
                      <div className="profile-stats-grid" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {/* Tổng chi tiêu */}
                        <div className="profile-stat-card">
                          <div className="profile-stat-card__icon text-[#ffd159]">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="1" x2="12" y2="23"/>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                          </div>
                          <div className="profile-stat-card__content">
                            <div className="profile-stat-card__value">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(expenseStats.totalSpent)}
                            </div>
                            <div className="profile-stat-card__label">Tổng chi tiêu</div>
                          </div>
                        </div>

                        {/* Tổng số đơn hàng */}
                        <div className="profile-stat-card">
                          <div className="profile-stat-card__icon text-[#4caf50]">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                              <path d="M9 12h6M9 16h6"/>
                            </svg>
                          </div>
                          <div className="profile-stat-card__content">
                            <div className="profile-stat-card__value">{expenseStats.totalOrders}</div>
                            <div className="profile-stat-card__label">Tổng số đơn hàng</div>
                          </div>
                        </div>

                        {/* Tổng số tiền nạp vào ví */}
                        <div className="profile-stat-card">
                          <div className="profile-stat-card__icon text-[#4a90e2]">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                              <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                          </div>
                          <div className="profile-stat-card__content">
                            <div className="profile-stat-card__value">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(expenseStats.totalTopUp)}
                            </div>
                            <div className="profile-stat-card__label">Tổng số tiền nạp vào ví</div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Expenses */}
                      <div className="profile-section">
                        <h2 className="profile-section__title">Chi tiêu theo tháng</h2>
                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <div style={{ fontSize: '13px', color: '#c9c4c5', marginBottom: '8px' }}>Tháng này</div>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(expenseStats.thisMonthSpent)}
                              </div>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <div style={{ fontSize: '13px', color: '#c9c4c5', marginBottom: '8px' }}>Tháng trước</div>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(expenseStats.lastMonthSpent)}
                              </div>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <div style={{ fontSize: '13px', color: '#c9c4c5', marginBottom: '8px' }}>3 tháng qua</div>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(expenseStats.lastThreeMonthsSpent)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'wallet' && (
                <div>
                  <div className="profile-section">
                    <h2 className="profile-section__title">Ví Cinesmart</h2>
                    <p className="text-[#c9c4c5] mb-6">
                      Quản lý số dư và thanh toán nhanh chóng, tiện lợi
                    </p>

                    {loadingWallet ? (
                      <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd159] mb-5"></div>
                        <p className="text-base m-0">Đang tải thông tin ví...</p>
                      </div>
                    ) : walletMessage.text && walletMessage.type === 'error' ? (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg text-center">
                        {walletMessage.text}
                        <button
                          onClick={() => {
                            setActiveTab('wallet');
                            const event = new Event('tabchange');
                            window.dispatchEvent(event);
                          }}
                          className="block mx-auto mt-2 text-sm underline hover:text-red-400"
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : (
                      <div className="max-w-2xl mx-auto space-y-6">
                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-[#2d2627] to-[#1f191a] p-6 rounded-2xl border border-[#4a3f41] shadow-xl">
                          <p className="text-[#c9c4c5] text-sm font-medium uppercase tracking-wider mb-1">Số dư khả dụng</p>
                          <h2 className="text-4xl font-bold text-[#ffd159]">
                            {formatCurrency(walletInfo?.balance)}
                          </h2>
                        </div>

                        {/* Top Up Form */}
                        <div className="bg-[#2d2627] p-6 rounded-2xl border border-[#4a3f41]">
                          <h3 className="text-xl font-bold mb-4">Nạp tiền</h3>

                          {walletMessage.text && (
                            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${walletMessage.type === 'success'
                                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                                }`}>
                              {walletMessage.text}
                            </div>
                          )}

                          <form onSubmit={handleTopUp} className="space-y-4">
                            <div>
                              <label className="block text-sm text-[#c9c4c5] mb-1">Số tiền cần nạp</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="10000"
                                  step="10000"
                                  value={topUpAmount}
                                  onChange={(e) => setTopUpAmount(e.target.value)}
                                  className="w-full bg-[#1f191a] border border-[#4a3f41] rounded-lg px-4 py-3 text-white focus:border-[#e83b41] focus:outline-none transition-colors pl-4 pr-12"
                                  placeholder="Nhập số tiền..."
                                  required
                                  disabled={storedUser.status === false}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#c9c4c5]">đ</span>
                              </div>
                              <p className="text-xs text-[#6b6264] mt-1">Tối thiểu 10.000đ</p>
                            </div>

                            <div>
                              <label className="block text-sm text-[#c9c4c5] mb-2">Phương thức thanh toán</label>
                              <div className="grid grid-cols-2 gap-3">
                                <label className={`cursor-pointer p-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                  paymentMethod === 'MOMO' 
                                    ? 'border-[#e83b41] bg-[#e83b41]/10' 
                                    : 'border-[#4a3f41] bg-[#1f191a] hover:border-[#6b6264]'
                                }`}>
                                  <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="MOMO"
                                    checked={paymentMethod === 'MOMO'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="hidden"
                                  />
                                  <img 
                                    src="/momo.png" 
                                    alt="MoMo" 
                                    className="h-6 w-auto object-contain"
                                  />
                                  <span className="text-sm font-semibold text-white">MoMo</span>
                                </label>
                                <label className={`cursor-pointer p-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                  paymentMethod === 'ZALOPAY' 
                                    ? 'border-[#e83b41] bg-[#e83b41]/10' 
                                    : 'border-[#4a3f41] bg-[#1f191a] hover:border-[#6b6264]'
                                }`}>
                                  <input
                                    type="radio"
                                    name="paymentMethod"
                                    value="ZALOPAY"
                                    checked={paymentMethod === 'ZALOPAY'}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="hidden"
                                  />
                                  <img 
                                    src="/zalopay.png" 
                                    alt="ZaloPay" 
                                    className="h-6 w-auto object-contain"
                                  />
                                  <span className="text-sm font-semibold text-white">ZaloPay</span>
                                </label>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={topUpLoading || storedUser.status === false}
                              className="w-full bg-gradient-to-r from-[#e83b41] to-[#ff5258] text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-[#e83b41]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                              {topUpLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Đang xử lý...
                                </>
                              ) : (
                                `Nạp tiền bằng ${paymentMethod === 'MOMO' ? 'MoMo' : 'ZaloPay'}`
                              )}
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pin' && (
                <div>
                  <div className="profile-section">
                    <h2 className="profile-section__title">Cài đặt mã PIN</h2>
                    <p className="text-[#c9c4c5] mb-6">
                      Mã PIN giúp bảo vệ ví Cinesmart của bạn. Sử dụng mã PIN 6 chữ số để xác thực các giao dịch quan trọng.
                    </p>
                    
                    {loadingPinCheck ? (
                      <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd159] mb-5"></div>
                        <p className="text-base m-0">Đang kiểm tra trạng thái PIN...</p>
                      </div>
                    ) : hasPin === null ? (
                      <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd159] mb-5"></div>
                        <p className="text-base m-0">Đang kiểm tra trạng thái PIN...</p>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto">
                        {hasPin === false && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-[#ffd159]/10 to-[#ffd159]/5 border border-[#ffd159]/30 rounded-lg">
                            <div className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-[#ffd159] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-[#ffd159] font-semibold mb-1">Bạn chưa có mã PIN</p>
                                <p className="text-[#c9c4c5] text-sm">
                                  Tạo mã PIN để bảo vệ ví Cinesmart của bạn. Mã PIN gồm 6 chữ số.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <form onSubmit={handlePinSubmit} className="space-y-6">
                          {pinMessage.text && (
                            <div className={`p-4 rounded-lg font-semibold ${
                              pinMessage.type === 'success' 
                                ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                                : 'bg-red-500/20 border border-red-500/50 text-red-400'
                            }`}>
                              {pinMessage.text}
                            </div>
                          )}

                          {hasPin === true && (
                            <div>
                              <label className="block text-sm font-semibold text-[#c9c4c5] mb-2">
                                Mã PIN hiện tại
                              </label>
                              <input
                                type="password"
                                inputMode="numeric"
                                maxLength={6}
                                value={pinForm.currentPin}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  setPinForm({ ...pinForm, currentPin: value });
                                }}
                                className="w-full px-4 py-3 bg-[#2d2627] border border-[#4a3f41] rounded-lg text-white placeholder-[#6b6264] focus:outline-none focus:border-[#e83b41] transition-colors text-center text-2xl tracking-widest"
                                placeholder="000000"
                                required
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-semibold text-[#c9c4c5] mb-2">
                              {hasPin === true ? 'Mã PIN mới' : 'Mã PIN'} <span className="text-[#6b6264] text-xs">(6 chữ số)</span>
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={6}
                              value={pinForm.newPin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPinForm({ ...pinForm, newPin: value });
                              }}
                              className="w-full px-4 py-3 bg-[#2d2627] border border-[#4a3f41] rounded-lg text-white placeholder-[#6b6264] focus:outline-none focus:border-[#e83b41] transition-colors text-center text-2xl tracking-widest"
                              placeholder="000000"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-[#c9c4c5] mb-2">
                              Xác nhận {hasPin === true ? 'mã PIN mới' : 'mã PIN'}
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={6}
                              value={pinForm.confirmPin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPinForm({ ...pinForm, confirmPin: value });
                              }}
                              className="w-full px-4 py-3 bg-[#2d2627] border border-[#4a3f41] rounded-lg text-white placeholder-[#6b6264] focus:outline-none focus:border-[#e83b41] transition-colors text-center text-2xl tracking-widest"
                              placeholder="000000"
                              required
                            />
                          </div>

                          <div className="flex flex-col items-center gap-4 pt-4">
                            <button
                              type="submit"
                              className="btn btn--primary"
                              style={{ 
                                minWidth: '220px',
                                padding: '14px 32px',
                                textAlign: 'center',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}
                            >
                              {hasPin === true ? 'Đổi mã PIN' : 'Tạo mã PIN'}
                            </button>
                            
                            {hasPin === true && (
                              <button
                                type="button"
                                onClick={() => navigate('/forgot-pin')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#c9c4c5',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  padding: '8px'
                                }}
                              >
                                Quên mã PIN?
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div>
                  <div className="profile-section">
                    <h2 className="profile-section__title">Cập nhật mật khẩu</h2>
                    
                    {loadingPasswordCheck ? (
                      <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd159] mb-5"></div>
                        <p className="text-base m-0">Đang kiểm tra trạng thái mật khẩu...</p>
                      </div>
                    ) : hasPassword === null ? (
                      <div className="text-center py-[60px] px-5 text-[#c9c4c5]">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd159] mb-5"></div>
                        <p className="text-base m-0">Đang kiểm tra trạng thái mật khẩu...</p>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto">
                        {hasPassword === false && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-[#ffd159]/10 to-[#ffd159]/5 border border-[#ffd159]/30 rounded-lg">
                            <div className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-[#ffd159] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-[#ffd159] font-semibold mb-1">Bạn chưa có mật khẩu</p>
                                <p className="text-[#c9c4c5] text-sm">
                                  Bạn đang đăng nhập bằng tài khoản Google. Tạo mật khẩu để bảo vệ tài khoản tốt hơn và có thể đăng nhập bằng email/mật khẩu.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                          {passwordMessage.text && (
                            <div className={`p-4 rounded-lg font-semibold ${
                              passwordMessage.type === 'success' 
                                ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                                : 'bg-red-500/20 border border-red-500/50 text-red-400'
                            }`}>
                              {passwordMessage.text}
                            </div>
                          )}

                          {hasPassword === true && (
                            <div>
                              <label className="block text-sm font-semibold text-[#c9c4c5] mb-2">
                                Mật khẩu cũ
                              </label>
                              <input
                                type="password"
                                value={passwordForm.oldPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                className="w-full px-4 py-3 bg-[#2d2627] border border-[#4a3f41] rounded-lg text-white placeholder-[#6b6264] focus:outline-none focus:border-[#e83b41] transition-colors"
                                placeholder="Nhập mật khẩu cũ"
                                required
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-semibold text-[#c9c4c5] mb-2">
                              {hasPassword === true ? 'Mật khẩu mới' : 'Mật khẩu'} <span className="text-[#6b6264] text-xs">(8-32 ký tự, có chữ hoa, chữ thường, số)</span>
                            </label>
                            <input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-[#2d2627] border border-[#4a3f41] rounded-lg text-white placeholder-[#6b6264] focus:outline-none focus:border-[#e83b41] transition-colors"
                              placeholder={hasPassword === true ? "Nhập mật khẩu mới (8-32 ký tự, có chữ hoa, chữ thường, số)" : "Nhập mật khẩu (8-32 ký tự, có chữ hoa, chữ thường, số)"}
                              required
                              minLength={8}
                              maxLength={32}
                              pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-[#c9c4c5] mb-2">
                              Xác nhận {hasPassword === true ? 'mật khẩu mới' : 'mật khẩu'}
                            </label>
                            <input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                              className="w-full px-4 py-3 bg-[#2d2627] border border-[#4a3f41] rounded-lg text-white placeholder-[#6b6264] focus:outline-none focus:border-[#e83b41] transition-colors"
                              placeholder={hasPassword === true ? "Nhập lại mật khẩu mới" : "Nhập lại mật khẩu"}
                              required
                              minLength={8}
                              maxLength={32}
                            />
                          </div>

                          <div className="flex justify-center pt-4">
                            <button
                              type="submit"
                              className="btn btn--primary"
                              style={{ 
                                minWidth: '220px',
                                padding: '14px 32px',
                                textAlign: 'center',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}
                            >
                              {hasPassword === true ? 'Đổi mật khẩu' : 'Tạo mật khẩu'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="movie-modal-overlay" onClick={() => {
          setIsEditing(false);
          setFormMessage({ type: '', text: '' });
          setEditData({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            dob: userData.dob,
            addressDescription: userData.address.description,
            addressProvince: userData.address.province,
          });
        }}>
          <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
            <div className="movie-modal__header">
              <h2>Chỉnh sửa thông tin cá nhân</h2>
              <button className="movie-modal__close" onClick={() => {
                setIsEditing(false);
                setFormMessage({ type: '', text: '' });
                setEditData({
                  name: userData.name,
                  email: userData.email,
                  phone: userData.phone,
                  dob: userData.dob,
                  addressDescription: userData.address.description,
                  addressProvince: userData.address.province,
                });
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="movie-modal__content">
              {/* Message inside form */}
              {formMessage.text && (
                <div className={`mb-4 px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  formMessage.type === 'success' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}>
                  {formMessage.text}
                </div>
              )}
              <div className="movie-form">
                <div className="movie-form__group">
                  <label>Họ và tên <span className="required">*</span></label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Nhập họ và tên"
                  />
                </div>
                <div className="movie-form__row">
                  <div className="movie-form__group">
                    <label>Email <span className="required">*</span></label>
                    <input
                      type="email"
                      value={editData.email}
                      readOnly
                      style={{ cursor: 'not-allowed', backgroundColor: '#1a1415', opacity: 0.7 }}
                      placeholder="Nhập email"
                      title="Email không thể thay đổi"
                    />
                  </div>
                  <div className="movie-form__group">
                    <label>Số điện thoại <span className="required">*</span></label>
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                </div>
                <div className="movie-form__group">
                  <label>Ngày sinh <span className="required">*</span></label>
                  <input
                    type="date"
                    value={editData.dob}
                    onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
                  />
                </div>
                <div className="movie-form__group">
                  <label>Địa chỉ - Mô tả <span className="required">*</span></label>
                  <input
                    type="text"
                    value={editData.addressDescription}
                    onChange={(e) => setEditData({ ...editData, addressDescription: e.target.value })}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện"
                  />
                </div>
                <div className="movie-form__group">
                  <label>Tỉnh/Thành phố <span className="required">*</span></label>
                  <select
                    value={editData.addressProvince}
                    onChange={(e) => setEditData({ ...editData, addressProvince: e.target.value })}
                  >
                    <option value="">-- Chọn tỉnh/thành phố --</option>
                    {PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="movie-modal__footer">
              <button className="btn btn--ghost" onClick={() => {
                setIsEditing(false);
                setFormMessage({ type: '', text: '' });
                setEditData({
                  name: userData.name,
                  email: userData.email,
                  phone: userData.phone,
                  dob: userData.dob,
                  addressDescription: userData.address.description,
                  addressProvince: userData.address.province,
                });
              }}>
                Hủy
              </button>
              <button className="btn btn--primary" onClick={handleSaveChanges}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Notification */}
      {message.text && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ${
          message.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <Footer />
    </div>
  );
}