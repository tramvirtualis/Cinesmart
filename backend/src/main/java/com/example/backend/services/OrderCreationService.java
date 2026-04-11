package com.example.backend.services;

import com.example.backend.entities.*;
import com.example.backend.entities.enums.OrderStatus;
import com.example.backend.entities.enums.PaymentMethod;
import com.example.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderCreationService {
    
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final FoodComboRepository foodComboRepository;
    private final VoucherRepository voucherRepository;
    private final PriceRepository priceRepository;
    private final CustomerRepository customerRepository;
    private final PriceService priceService;
    
    /**
     * Tạo đơn hàng từ booking info
     * @param userId ID của user
     * @param showtimeId ID của showtime (có thể null nếu chỉ đặt đồ ăn)
     * @param seatIds Danh sách seat IDs (format: "A1", "B2", etc.) - có thể empty nếu chỉ đặt đồ ăn
     * @param foodComboIds Danh sách food combo IDs với quantity
     * @param totalAmount Tổng tiền
     * @param paymentMethod Phương thức thanh toán
     * @param voucherCode Mã voucher (nếu có)
     * @param cinemaComplexId ID của cụm rạp (cho đơn hàng chỉ có đồ ăn, có thể null nếu có vé phim)
     * @return Order đã tạo
     */
    @Transactional
    public Order createOrder(
            Long userId,
            Long showtimeId,
            List<String> seatIds,
            List<FoodComboRequest> foodComboRequests,
            BigDecimal totalAmount,
            PaymentMethod paymentMethod,
            String voucherCode,
            Long cinemaComplexId
    ) {
        // 1. Lấy User
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("User not found: " + userId);
        }
        User user = userOpt.get();
        
        // Kiểm tra user có bị chặn không
        if (Boolean.FALSE.equals(user.getStatus())) {
            throw new IllegalStateException("Tài khoản của bạn đã bị chặn. Vui lòng liên hệ quản trị viên để được hỗ trợ.");
        }
        
        // 2. Lấy Showtime (chỉ khi có showtimeId)
        Showtime showtime = null;
        CinemaRoom room = null;
        Long finalCinemaComplexId = cinemaComplexId; // Mặc định dùng cinemaComplexId từ parameter
        if (showtimeId != null) {
            Optional<Showtime> showtimeOpt = showtimeRepository.findByIdWithRelations(showtimeId);
            if (showtimeOpt.isEmpty()) {
                throw new IllegalArgumentException("Showtime not found: " + showtimeId);
            }
            showtime = showtimeOpt.get();
            room = showtime.getCinemaRoom();
            // Nếu có showtime, lấy cinemaComplexId từ room (ưu tiên hơn parameter)
            if (room != null && room.getCinemaComplex() != null) {
                finalCinemaComplexId = room.getCinemaComplex().getComplexId();
            }
        }
        
        // 3. Tạo Order
        Order order = Order.builder()
                .user(user)
                .totalAmount(totalAmount)
                .orderDate(LocalDateTime.now())
                .paymentMethod(paymentMethod)
                .status(OrderStatus.PENDING)
                .tickets(new ArrayList<>())
                .orderCombos(new ArrayList<>())
                .cinemaComplexId(finalCinemaComplexId) // Lưu cinemaComplexId vào Order
                .build();
        
        // 4. Set voucher nếu có (KHÔNG xóa voucher ở đây, sẽ xóa khi thanh toán thành công)
        if (voucherCode != null && !voucherCode.isEmpty()) {
            Optional<Voucher> voucherOpt = voucherRepository.findByCode(voucherCode);
            if (voucherOpt.isPresent()) {
                Voucher voucher = voucherOpt.get();
                order.setVoucher(voucher);
                System.out.println("Voucher " + voucherCode + " attached to order " + order.getOrderId() + " (will be removed when payment succeeds)");
            }
        }
        
        // 5. Tạo Tickets (chỉ khi có showtimeId và seatIds)
        List<Ticket> tickets = new ArrayList<>();
        if (showtimeId != null && seatIds != null && !seatIds.isEmpty() && room != null) {
            for (String seatId : seatIds) {
                // Parse seatId: "A1" -> row="A", column=1
                String seatRow = seatId.substring(0, 1);
                Integer seatColumn = Integer.parseInt(seatId.substring(1));
                
                // Tìm Seat trong room
                Seat seat = findSeatInRoom(room.getRoomId(), seatRow, seatColumn);
                if (seat == null) {
                    throw new IllegalArgumentException("Seat not found: " + seatId + " in room " + room.getRoomId());
                }
                
                // Tính giá vé từ database
                BigDecimal ticketPrice = calculateTicketPrice(seat, showtime);
                
                // Tạo Ticket
                Ticket ticket = Ticket.builder()
                        .showtime(showtime)
                        .seat(seat)
                        .price(ticketPrice)
                        .qrCode(generateQRCode(userId, showtimeId, seatId))
                        .order(order)
                        .build();
                
                tickets.add(ticket);
            }
        }
        order.setTickets(tickets);
        
        // 6. Tạo OrderCombos
        List<OrderCombo> orderCombos = new ArrayList<>();
        System.out.println("=== Creating OrderCombos ===");
        System.out.println("FoodCombo requests count: " + foodComboRequests.size());
        
        for (FoodComboRequest request : foodComboRequests) {
            System.out.println("Processing FoodCombo request: ID=" + request.getFoodComboId() + ", Quantity=" + request.getQuantity());
            
            Optional<FoodCombo> foodComboOpt = foodComboRepository.findById(request.getFoodComboId());
            if (foodComboOpt.isEmpty()) {
                throw new IllegalArgumentException("FoodCombo not found: " + request.getFoodComboId());
            }
            FoodCombo originalFoodCombo = foodComboOpt.get();
            System.out.println("Found FoodCombo: " + originalFoodCombo.getName() + ", Price: " + originalFoodCombo.getPrice());
            
            // Tạo OrderCombo - chỉ reference đến FoodCombo gốc, không tạo FoodCombo mới
            OrderCombo orderCombo = OrderCombo.builder()
                    .order(order)
                    .foodCombo(originalFoodCombo) // Reference đến FoodCombo gốc trong menu
                    .quantity(request.getQuantity())
                    .price(originalFoodCombo.getPrice().multiply(BigDecimal.valueOf(request.getQuantity())))
                    .build();
            
            orderCombos.add(orderCombo);
            System.out.println("Created OrderCombo with FoodCombo ID: " + originalFoodCombo.getFoodComboId() + ", Quantity: " + request.getQuantity());
        }
        order.setOrderCombos(orderCombos);
        System.out.println("Total OrderCombos: " + orderCombos.size());
        
        // 7. Lưu Order (cascade sẽ lưu tickets và orderCombos)
        System.out.println("=== Saving Order ===");
        System.out.println("Order totalAmount: " + order.getTotalAmount());
        System.out.println("Order tickets count: " + (order.getTickets() != null ? order.getTickets().size() : 0));
        System.out.println("Order orderCombos count: " + (order.getOrderCombos() != null ? order.getOrderCombos().size() : 0));
        
        Order savedOrder = orderRepository.save(order);
        
        System.out.println("=== Order Saved ===");
        System.out.println("Saved Order ID: " + savedOrder.getOrderId());
        System.out.println("Saved Order tickets count: " + (savedOrder.getTickets() != null ? savedOrder.getTickets().size() : 0));
        System.out.println("Saved Order orderCombos count: " + (savedOrder.getOrderCombos() != null ? savedOrder.getOrderCombos().size() : 0));
        
        // Verify OrderCombos were saved
        if (savedOrder.getOrderCombos() != null) {
            for (OrderCombo oc : savedOrder.getOrderCombos()) {
                System.out.println("  OrderCombo ID: " + oc.getOrderComboId() + ", Quantity: " + oc.getQuantity());
                if (oc.getFoodCombo() != null) {
                    System.out.println("    FoodCombo ID: " + oc.getFoodCombo().getFoodComboId() + ", Name: " + oc.getFoodCombo().getName());
                } else {
                    System.out.println("    FoodCombo is null!");
                }
            }
        }
        
        return savedOrder;
    }
    
    /**
     * Tìm Seat trong room theo row và column
     */
    private Seat findSeatInRoom(Long roomId, String seatRow, Integer seatColumn) {
        List<Seat> seats = seatRepository.findByCinemaRoom_RoomId(roomId);
        return seats.stream()
                .filter(s -> s.getSeatRow().equals(seatRow) && s.getSeatColumn().equals(seatColumn))
                .findFirst()
                .orElse(null);
    }
    
    /**
     * Tính giá vé dựa trên seat type và room type từ database
     * Áp dụng tăng 30% nếu là weekend (thứ 7 hoặc chủ nhật)
     */
    private BigDecimal calculateTicketPrice(Seat seat, Showtime showtime) {
        // Lấy room type từ showtime
        CinemaRoom room = showtime.getCinemaRoom();
        com.example.backend.entities.enums.RoomType roomType = room.getRoomType();
        
        // Lấy seat type
        com.example.backend.entities.enums.SeatType seatType = seat.getType();
        if (seatType == null) {
            seatType = com.example.backend.entities.enums.SeatType.NORMAL; // Default
        }
        
        // Lấy giá gốc từ database
        Optional<Price> priceOpt = priceRepository.findByRoomTypeAndSeatType(roomType, seatType);
        
        if (priceOpt.isPresent()) {
            BigDecimal basePrice = priceOpt.get().getPrice();
            // Tính giá với tăng 30% nếu là weekend
            BigDecimal adjustedPrice = priceService.calculateWeekendPrice(basePrice, showtime.getStartTime());
            return adjustedPrice;
        }
        
        // Fallback nếu không tìm thấy giá trong database
        System.err.println("Price not found for roomType: " + roomType + ", seatType: " + seatType);
        return BigDecimal.valueOf(100000); // Giá mặc định
    }
    
    /**
     * Generate QR code cho ticket
     */
    private String generateQRCode(Long userId, Long showtimeId, String seatId) {
        return String.format("TICKET_%d_%d_%s_%d", userId, showtimeId, seatId, System.currentTimeMillis());
    }
    
    /**
     * Inner class để chứa thông tin FoodCombo request
     */
    public static class FoodComboRequest {
        private Long foodComboId;
        private Integer quantity;
        
        public FoodComboRequest() {}
        
        public FoodComboRequest(Long foodComboId, Integer quantity) {
            this.foodComboId = foodComboId;
            this.quantity = quantity;
        }
        
        public Long getFoodComboId() {
            return foodComboId;
        }
        
        public void setFoodComboId(Long foodComboId) {
            this.foodComboId = foodComboId;
        }
        
        public Integer getQuantity() {
            return quantity;
        }
        
        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }
    }
}

