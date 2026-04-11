import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { walletService } from '../services/walletService';
import { paymentService } from '../services/paymentService';

export default function Wallet() {
    const navigate = useNavigate();
    const [walletInfo, setWalletInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [topUpAmount, setTopUpAmount] = useState('');
    const [topUpLoading, setTopUpLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('MOMO'); // MOMO hoặc ZALOPAY
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isBlocked, setIsBlocked] = useState(false);
    
    // Check if user is blocked
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setIsBlocked(storedUser.status === false);
    }, []);

    const loadWalletData = useCallback(async () => {
        try {
            setLoading(true);
            const wallet = await walletService.getWallet();
            setWalletInfo(wallet);
        } catch (err) {
            console.error('Error loading wallet:', err);
            setError(err.message || 'Không thể tải thông tin ví');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWalletData();
    }, [loadWalletData]);

    const handleTopUp = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        
        if (isBlocked) {
            setMessage({ type: 'error', text: 'Tài khoản của bạn đã bị chặn. Bạn không thể nạp ví. Vui lòng liên hệ quản trị viên để được hỗ trợ.' });
            return;
        }

        const amount = Number(topUpAmount);
        if (!amount || amount < 10000) {
            setMessage({ type: 'error', text: 'Số tiền nạp tối thiểu là 10.000đ' });
            return;
        }

        try {
            setTopUpLoading(true);

            if (paymentMethod === 'MOMO') {
                // Tạo MoMo payment
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
                    setMessage({ type: 'error', text: response.message || 'Không thể tạo đơn thanh toán MoMo' });
                    setTopUpLoading(false);
                }
            } else if (paymentMethod === 'ZALOPAY') {
                // Tạo ZaloPay payment
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
                    setMessage({ type: 'error', text: response.error || response.message || 'Không thể tạo đơn thanh toán ZaloPay' });
                    setTopUpLoading(false);
                }
            }
        } catch (err) {
            console.error('Error creating top-up payment:', err);
            setMessage({ type: 'error', text: err.message || 'Nạp tiền thất bại' });
            setTopUpLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    };

    return (
        <div className="min-h-screen bg-[#1a1415] text-white flex flex-col">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#e83b41] to-[#ffd159]">
                            Ví Cinesmart
                        </h1>
                        <p className="text-[#c9c4c5]">
                            Quản lý số dư và thanh toán nhanh chóng, tiện lợi
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e83b41]"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg text-center">
                            {error}
                            <button
                                onClick={loadWalletData}
                                className="block mx-auto mt-2 text-sm underline hover:text-red-400"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto">
                            {/* Wallet Info & Top Up */}
                            <div className="space-y-6">
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

                                    {message.text && (
                                        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success'
                                                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                                : 'bg-red-500/20 text-red-500 border border-red-500/30'
                                            }`}>
                                            {message.text}
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
                                                    disabled={isBlocked}
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
                                            disabled={topUpLoading || isBlocked}
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
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
