import React from 'react';

export default function TierBenefitsModal({ isOpen, onClose, currentTier }) {
  if (!isOpen) return null;

  const tiers = [
    {
      id: 'MEMBER',
      name: 'Thành viên',
      spendTarget: '0đ - 1.500.000đ',
      benefits: [
        'Tham gia tích lũy thăng hạng',
        'Cập nhật tin tức phim ảnh'
      ],
      color: 'from-gray-700 to-gray-900',
      badgeColor: 'bg-gray-600',
    },
    {
      id: 'SILVER',
      name: 'Bạc',
      spendTarget: 'Từ 1.500.000đ',
      benefits: [
        'Hoàn ví: Vé phim 5%, Đồ ăn 3%',
        'Hoàn vé: Tối đa 2 lượt / 30 ngày',
        'Có voucher riêng cho hạng Bạc'
      ],
      color: 'from-gray-400 to-gray-600',
      badgeColor: 'bg-gray-400',
    },
    {
      id: 'GOLD',
      name: 'Vàng',
      spendTarget: 'Từ 2.500.000đ',
      benefits: [
        'Hoàn ví: Vé phim 7%, Đồ ăn 4%',
        'Hoàn vé: Tối đa 3 lượt / 30 ngày',
        'Có voucher riêng cho hạng Vàng'
      ],
      color: 'from-yellow-400 to-yellow-600',
      badgeColor: 'bg-yellow-500',
    },
    {
      id: 'PLATINUM',
      name: 'Bạch Kim',
      spendTarget: 'Từ 4.500.000đ',
      benefits: [
        'Hoàn ví: Vé phim 10%, Đồ ăn 5%',
        'Hoàn vé: Tối đa 4 lượt / 30 ngày',
        'Có voucher riêng cho hạng Bạch Kim'
      ],
      color: 'from-[#0b2b40] to-[#16425b]',
      badgeColor: 'bg-blue-500',
    }
  ];

  return (
    <div className="movie-modal-overlay flex justify-center items-center fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#1a1415] border border-[#4a3f41] rounded-2xl w-full max-w-5xl mx-4 overflow-hidden shadow-2xl shadow-black relative"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex justify-between items-center p-6 border-b border-[#4a3f41] bg-[#2d2627]">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ffd159]">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            Quyền lợi thành viên
          </h2>
          <button 
            className="text-[#c9c4c5] hover:text-white transition-colors p-2 bg-[#1a1415] rounded-full hover:bg-[#e83b41]"
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
          <div className="mb-6 text-center text-[#c9c4c5]">
            <p>Hạng thẻ của bạn đang là: <strong className="text-white text-lg">{tiers.find(t => t.id === currentTier)?.name || 'Thành viên'}</strong></p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier) => (
              <div 
                key={tier.id} 
                className={`relative rounded-xl overflow-hidden border transition-all duration-300 ${tier.id === currentTier ? 'border-[#ffd159] scale-[1.02] shadow-lg shadow-[#ffd159]/20 z-10' : 'border-[#4a3f41] hover:border-gray-500'}`}
              >
                {tier.id === currentTier && (
                  <div className="absolute top-0 right-0 bg-[#ffd159] text-black text-xs font-bold px-3 py-1 rounded-bl-lg z-20">
                    HIỆN TẠI
                  </div>
                )}
                
                <div className={`h-28 bg-gradient-to-br ${tier.color} p-5 flex flex-col justify-end relative shadow-inner`}>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
                  <h3 className="text-2xl font-black text-white relative z-10 uppercase tracking-wide">{tier.name}</h3>
                  <p className="text-white/90 text-sm font-semibold relative z-10 mt-1">{tier.spendTarget}</p>
                </div>
                
                <div className="bg-[#1f191a] p-5 h-full min-h-[220px]">
                  <ul className="space-y-4">
                    {tier.benefits.map((benefit, index) => {
                      // Parse benefit string to make label bold
                      const isBullet = benefit.includes(':');
                      const [label, ...rest] = isBullet ? benefit.split(':') : [benefit];
                      
                      return (
                        <li key={index} className="flex items-start gap-3 text-sm text-[#e6e1e2] leading-relaxed">
                          <svg className={`w-5 h-5 mt-0.5 shrink-0 ${tier.badgeColor.replace('bg-', 'text-')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span>
                            {isBullet ? (
                              <><strong className="text-white font-semibold">{label}:</strong>{rest.join(':')}</>
                            ) : (
                              <span>{benefit}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 bg-[#2d2627] p-5 rounded-xl border border-[#4a3f41] text-sm text-[#c9c4c5]">
            <ul className="list-disc pl-5 space-y-2">
              <li>Hạng thành viên được xét duyệt dựa trên <strong>Tổng chi tiêu trong 12 tháng gần nhất</strong>.</li>
              <li>Khi đủ điều kiện, hạng thẻ sẽ tự động được nâng cấp và hệ thống sẽ áp dụng mức hoàn tiền tương ứng cho hạng thẻ mới ngay tại giao dịch.</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 border-t border-[#4a3f41] bg-[#2d2627] flex justify-end">
          <button 
            className="btn btn--primary px-6 py-2 rounded-lg"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
