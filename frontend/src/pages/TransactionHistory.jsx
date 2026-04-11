import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { walletService } from '../services/walletService';
import { getMyOrders } from '../services/customer';

export default function TransactionHistory() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [displayCount, setDisplayCount] = useState(10); // Số lượng giao dịch hiển thị ban đầu
    const itemsPerPage = 10; // Số lượng giao dịch mỗi lần tải thêm

    const loadTransactionHistory = useCallback(async () => {
        try {
            setLoading(true);
            const [walletTxs, orders] = await Promise.all([
                walletService.getTransactions().catch(() => []),
                getMyOrders().catch(() => [])
            ]);

            // Combine và sort transactions
            const combined = [];

            // Add wallet transactions
            walletTxs.forEach(tx => {
                combined.push({
                    id: `wallet-${tx.transactionId}`,
                    date: new Date(tx.createdAt),
                    type: tx.type === 'CREDIT' ? 'Top-up' : 'Payment',
                    paymentMethod: 'Wallet',
                    items: tx.description || (tx.type === 'CREDIT' ? 'Nạp tiền vào ví' : 'Thanh toán bằng ví'),
                    total: tx.amount,
                    walletChange: tx.type === 'CREDIT' ? `+${tx.amount.toLocaleString('vi-VN')}₫` : `-${tx.amount.toLocaleString('vi-VN')}₫`,
                    balance: tx.balanceAfter ? `${tx.balanceAfter.toLocaleString('vi-VN')}₫` : '',
                    isWallet: true
                });
            });

            // Add orders
            orders.forEach(order => {
                const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
                const items = [];
                
                // Get movie titles from items
                if (order.items && order.items.length > 0) {
                    const uniqueMovies = new Set();
                    order.items.forEach(item => {
                        if (item.movieTitle) {
                            uniqueMovies.add(item.movieTitle);
                        }
                    });
                    uniqueMovies.forEach(title => items.push(title));
                }
                
                // Get combo names
                if (order.combos && order.combos.length > 0) {
                    order.combos.forEach(combo => {
                        items.push(combo.comboName || combo.name || 'Combo');
                    });
                }
                
                if (items.length === 0) {
                    items.push('Đơn hàng');
                }

                // Map payment method - đảm bảo không có "Unknown"
                const mapPaymentMethod = (pm) => {
                    if (!pm) return '';
                    const pmStr = String(pm).toUpperCase();
                    if (pmStr === 'MOMO') return 'MoMo';
                    if (pmStr === 'ZALOPAY') return 'ZaloPay';
                    if (pmStr === 'VNPAY') return 'VNPay';
                    if (pmStr === 'WALLET') return 'Wallet';
                    return '';
                };

                let paymentMethod = mapPaymentMethod(order.paymentMethod);

                // Xác định loại giao dịch
                let typeText = 'Purchase';
                let finalPaymentMethod = paymentMethod;
                
                if (order.status === 'CANCELLED') {
                    // Nếu hủy và refund vào wallet, hiển thị như "Nạp tiền, Wallet"
                    if (order.refundedToWallet) {
                        typeText = 'Top-up';
                        finalPaymentMethod = 'Wallet';
                    } else {
                        typeText = 'Refund';
                        // Nếu refund không vào wallet, giữ nguyên paymentMethod gốc
                        if (!finalPaymentMethod) {
                            finalPaymentMethod = mapPaymentMethod(order.paymentMethod);
                        }
                    }
                }

                // Đảm bảo có paymentMethod - nếu vẫn không có, thử các cách khác
                if (!finalPaymentMethod) {
                    // Có thể paymentMethod được trả về dưới dạng khác
                    finalPaymentMethod = mapPaymentMethod(order.paymentMethod);
                }

                combined.push({
                    id: `order-${order.orderId}`,
                    date: orderDate,
                    type: typeText,
                    paymentMethod: finalPaymentMethod,
                    items: items.join(', '),
                    total: order.totalAmount,
                    walletChange: order.status === 'CANCELLED' && order.refundedToWallet 
                        ? `+${(order.refundAmount || 0).toLocaleString('vi-VN')}₫` 
                        : order.paymentMethod === 'WALLET' || order.paymentMethod === 'wallet'
                        ? `-${(order.totalAmount || 0).toLocaleString('vi-VN')}₫` 
                        : '',
                    balance: '',
                    isWallet: false,
                    orderId: order.orderId
                });
            });

            // Sort by date (newest first)
            combined.sort((a, b) => b.date - a.date);

            setTransactions(combined);
        } catch (err) {
            console.error('Error loading transaction history:', err);
            setError(err.message || 'Không thể tải lịch sử giao dịch');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTransactionHistory();
    }, [loadTransactionHistory]);

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const day = d.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month}, ${year}`;
    };

    const formatCurrency = (value) => {
        if (!value) return '0₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(Number(value)).replace('₫', '') + '₫';
    };

    return (
        <div className="min-h-screen cinema-mood">
            <Header />
            <main className="main">
                <section className="section">
                    <div className="container">
                        <div className="max-w-7xl mx-auto">
                            {/* Header */}
                            <div className="mb-8">
                                <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#e83b41] via-[#ff5258] to-[#ffd159]">
                                    Lịch sử giao dịch
                                </h1>
                                <p className="text-[#c9c4c5] text-sm">
                                    Có vấn đề với giao dịch? Chọn giao dịch bên dưới để được hỗ trợ.
                                </p>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e83b41]"></div>
                                </div>
                            ) : error ? (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-6 rounded-lg text-center">
                                    {error}
                                    <button
                                        onClick={loadTransactionHistory}
                                        className="block mx-auto mt-4 text-sm underline hover:text-red-400"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-20 text-[#c9c4c5]">
                                    <p className="text-lg">Chưa có giao dịch nào</p>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-br from-[#1a1415] via-[#2d2627] to-[#1a1415] rounded-2xl border border-[#4a3f41] shadow-2xl overflow-hidden">
                                    {/* Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-[#e83b41] to-[#ff5258] border-b border-[#4a3f41]">
                                                    <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                                                        Ngày
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                                                        Mục
                                                    </th>
                                                    <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider">
                                                        Loại
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wider">
                                                        Tổng
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wider">
                                                        Thay đổi ví
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-sm font-bold text-white uppercase tracking-wider">
                                                        Số dư
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.slice(0, displayCount).map((tx, index) => (
                                                    <tr
                                                        key={tx.id}
                                                        className={`border-b border-[#4a3f41]/50 transition-all hover:bg-[#2d2627]/50 ${
                                                            index % 2 === 0 ? 'bg-[#1a1415]/30' : 'bg-[#2d2627]/20'
                                                        }`}
                                                        style={{ cursor: tx.orderId ? 'pointer' : 'default' }}
                                                        onClick={() => {
                                                            if (tx.orderId) {
                                                                navigate(`/orders`);
                                                            }
                                                        }}
                                                    >
                                                        <td className="px-6 py-4 text-sm text-white">
                                                            {formatDate(tx.date)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-white font-medium">
                                                            {tx.items}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-white">
                                                            {tx.type === 'Purchase' && (
                                                                <span>Mua hàng{tx.paymentMethod ? `, ${tx.paymentMethod}` : ''}</span>
                                                            )}
                                                            {tx.type === 'Refund' && (
                                                                <span>Hoàn tiền{tx.paymentMethod ? `, ${tx.paymentMethod}` : ''}</span>
                                                            )}
                                                            {tx.type === 'Top-up' && (
                                                                <span>Nạp tiền{tx.paymentMethod ? `, ${tx.paymentMethod}` : ''}</span>
                                                            )}
                                                            {tx.type === 'Payment' && (
                                                                <span>Thanh toán{tx.paymentMethod ? `, ${tx.paymentMethod}` : ''}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-white font-semibold text-right">
                                                            {formatCurrency(tx.total)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-white text-right">
                                                            {tx.walletChange ? (
                                                                <span>{tx.walletChange}</span>
                                                            ) : (
                                                                <span>-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-white text-right">
                                                            {tx.balance || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {/* Load More Button */}
                                    {transactions.length > displayCount && (
                                        <div className="p-6 border-t border-[#4a3f41] flex justify-center">
                                            <button
                                                onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
                                                className="px-6 py-3 bg-[#2d2627] border border-[#4a3f41] text-white font-semibold hover:bg-[#3a3233] hover:border-[#6b6264] transition-all"
                                            >
                                                Tải thêm ({transactions.length - displayCount} giao dịch còn lại)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

