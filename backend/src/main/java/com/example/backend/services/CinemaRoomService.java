package com.example.backend.services;

import com.example.backend.dtos.AddSeatRequestDTO;
import com.example.backend.dtos.CinemaRoomResponseDTO;
import com.example.backend.dtos.CreateCinemaRoomDTO;
import com.example.backend.dtos.SeatResponseDTO;
import com.example.backend.entities.CinemaComplex;
import com.example.backend.entities.CinemaRoom;
import com.example.backend.entities.Seat;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.entities.enums.PanoramaType;
import com.example.backend.entities.enums.SeatType;
import com.example.backend.repositories.CinemaComplexRepository;
import com.example.backend.repositories.CinemaRoomRepository;
import com.example.backend.repositories.SeatRepository;
import com.example.backend.repositories.TicketRepository;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CinemaRoomService {
    
    private final CinemaRoomRepository cinemaRoomRepository;
    private final CinemaComplexRepository cinemaComplexRepository;
    private final SeatRepository seatRepository;
    private final TicketRepository ticketRepository;
    private final ActivityLogService activityLogService;
    
    @Transactional
    public CinemaRoomResponseDTO createCinemaRoom(CreateCinemaRoomDTO createDTO, String username) {
        // Tìm CinemaComplex
        CinemaComplex cinemaComplex = cinemaComplexRepository.findById(createDTO.getCinemaComplexId())
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp với ID: " + createDTO.getCinemaComplexId()));
        
        // Tạo CinemaRoom
        CinemaRoom cinemaRoom = CinemaRoom.builder()
            .roomName(createDTO.getRoomName())
            .roomType(createDTO.getRoomType())
            .panoramaType(resolvePanoramaType(createDTO.getPanoramaType()))
            .cinemaComplex(cinemaComplex)
            .seatLayout(new ArrayList<>())
            .build();
        
        // Lưu CinemaRoom trước (để có roomId)
        CinemaRoom savedRoom = cinemaRoomRepository.save(cinemaRoom);
        
        // Phòng mới: lưới hình chữ nhật đầy ghế Thường (không lối đi / VIP / Couple tự động). Chỉnh layout sau qua modal sơ đồ ghế.
        List<Seat> seats = generateSeats(
            createDTO.getRows(),
            createDTO.getCols(),
            savedRoom,
            Collections.emptyList(),
            false,
            false
        );
        if (seats.isEmpty()) {
            cinemaRoomRepository.delete(savedRoom);
            throw new RuntimeException("Phòng phải có ít nhất một ghế. Giảm số ô trống hoặc tăng kích thước lưới.");
        }
        savedRoom.setSeatLayout(seats);
        
        // Lưu lại với ghế (cascade sẽ tự động lưu seats)
        savedRoom = cinemaRoomRepository.save(savedRoom);
        
        CinemaRoomResponseDTO responseDTO = mapToDTO(savedRoom);
        logRoomActivity(username, Action.CREATE, savedRoom, "Tạo phòng chiếu " + responseDTO.getRoomName());
        return responseDTO;
    }
    
    private Set<Integer> walkwayColumns(int cols) {
        Set<Integer> s = new HashSet<>();
        for (int c = 5; c <= cols; c += 5) {
            s.add(c);
        }
        if (cols > 10) {
            int middle = cols / 2;
            s.add(middle);
            s.add(middle + 1);
        }
        return s;
    }

    /**
     * Phòng đã có ghế trên cột lối đi → coi là layout cũ (full lưới), không tự thêm lối đi khi cập nhật.
     */
    private boolean applyWalkwayAsEmptySlots(CinemaRoom room, int cols) {
        if (room == null || room.getSeatLayout() == null || room.getSeatLayout().isEmpty()) {
            return true;
        }
        Set<Integer> walkCols = walkwayColumns(cols);
        return room.getSeatLayout().stream().noneMatch(seat -> walkCols.contains(seat.getSeatColumn()));
    }

    private Set<String> mergeEmptyWithWalkways(List<String> userEmptyRaw, int rows, int cols, boolean addWalkwaySlots) {
        Set<String> empty = normalizeEmptyCells(userEmptyRaw, rows, cols);
        if (!addWalkwaySlots) {
            return empty;
        }
        Set<Integer> walkCols = walkwayColumns(cols);
        for (int row = 0; row < rows; row++) {
            String rowStr = String.valueOf((char) ('A' + row));
            for (int c : walkCols) {
                if (c >= 1 && c <= cols) {
                    empty.add(rowStr + c);
                }
            }
        }
        return empty;
    }

    private SeatType resolveSeatTypeForNewSeat(int rowIdx, int col, int rows, int cols) {
        if (rowIdx < Math.floor(rows * 0.15)) {
            return SeatType.VIP;
        }
        if (rowIdx >= rows - 2 && cols > 12 && (rowIdx * 31 + col) % 5 == 0) {
            return SeatType.COUPLE;
        }
        return SeatType.NORMAL;
    }

    /**
     * @param addWalkwaySlots true → gộp cột lối đi mặc định vào ô trống (chỉ dùng khi cập nhật layout theo quy tắc cũ).
     * @param assignVipCoupleSeatTypes true → VIP hàng trên + ghế đôi theo quy tắc cũ; false → toàn ghế Thường (tạo phòng mới).
     */
    private List<Seat> generateSeats(
        Integer rows,
        Integer cols,
        CinemaRoom cinemaRoom,
        List<String> emptyCellsRaw,
        boolean addWalkwaySlots,
        boolean assignVipCoupleSeatTypes
    ) {
        Set<String> empty = mergeEmptyWithWalkways(emptyCellsRaw, rows, cols, addWalkwaySlots);
        List<Seat> seats = new ArrayList<>();

        for (int row = 0; row < rows; row++) {
            char rowChar = (char) ('A' + row);
            String rowStr = String.valueOf(rowChar);
            for (int col = 1; col <= cols; col++) {
                String key = rowStr + col;
                if (empty.contains(key)) {
                    continue;
                }
                SeatType seatType = assignVipCoupleSeatTypes
                    ? resolveSeatTypeForNewSeat(row, col, rows, cols)
                    : SeatType.NORMAL;
                Seat seat = Seat.builder()
                    .type(seatType)
                    .seatRow(rowStr)
                    .seatColumn(col)
                    .cinemaRoom(cinemaRoom)
                    .build();
                seats.add(seat);
            }
        }

        return seats;
    }

    /**
     * Chuẩn hóa danh sách ô trống: một chữ cái hàng (A–Z) + số cột, ví dụ A6, B12.
     */
    private Set<String> normalizeEmptyCells(List<String> raw, int rows, int cols) {
        Set<String> out = new HashSet<>();
        if (raw == null) {
            return out;
        }
        for (String s : raw) {
            if (s == null || s.isBlank()) {
                continue;
            }
            String t = s.trim().toUpperCase();
            if (t.length() < 2) {
                continue;
            }
            char rowChar = t.charAt(0);
            if (rowChar < 'A' || rowChar > 'Z') {
                continue;
            }
            int rowIdx = rowChar - 'A';
            if (rowIdx >= rows) {
                continue;
            }
            String numPart = t.substring(1);
            int col;
            try {
                col = Integer.parseInt(numPart);
            } catch (NumberFormatException e) {
                continue;
            }
            if (col < 1 || col > cols) {
                continue;
            }
            out.add(rowStr(rowChar) + col);
        }
        return out;
    }

    private static String rowStr(char rowChar) {
        return String.valueOf(rowChar);
    }

    private PanoramaType resolvePanoramaType(PanoramaType raw) {
        return raw != null ? raw : PanoramaType.NONE;
    }

    /** Lưới đầy đủ rows×cols — không lối đi / ô trống. */
    private Set<String> computeFullGridSeatKeys(int rows, int cols) {
        Set<String> keys = new HashSet<>();
        for (int row = 0; row < rows; row++) {
            String rowLabel = rowStr((char) ('A' + row));
            for (int col = 1; col <= cols; col++) {
                keys.add(rowLabel + col);
            }
        }
        return keys;
    }

    private int currentGridRows(CinemaRoom room) {
        if (room.getSeatLayout() == null || room.getSeatLayout().isEmpty()) {
            return 0;
        }
        return room.getSeatLayout().stream()
            .map(Seat::getSeatRow)
            .filter(row -> row != null && !row.isEmpty())
            .mapToInt(row -> row.charAt(0) - 'A' + 1)
            .max()
            .orElse(0);
    }

    private int currentGridCols(CinemaRoom room) {
        if (room.getSeatLayout() == null || room.getSeatLayout().isEmpty()) {
            return 0;
        }
        return room.getSeatLayout().stream()
            .map(Seat::getSeatColumn)
            .filter(col -> col != null && col > 0)
            .mapToInt(Integer::intValue)
            .max()
            .orElse(0);
    }
    
    public List<CinemaRoomResponseDTO> getRoomsByComplexId(Long complexId) {
        List<CinemaRoom> rooms = cinemaRoomRepository.findByCinemaComplexIdWithSeats(complexId);
        return rooms.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public CinemaRoomResponseDTO getRoomById(Long roomId) {
        CinemaRoom room = cinemaRoomRepository.findByIdWithSeats(roomId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu với ID: " + roomId));
        return mapToDTO(room);
    }
    
    private void replaceSeatLayoutWithNormalGrid(CinemaRoom room, int rows, int cols) {
        List<Seat> existing = seatRepository.findByCinemaRoom_RoomId(room.getRoomId());
        if (!existing.isEmpty()) {
            seatRepository.deleteAll(existing);
        }
        if (room.getSeatLayout() == null) {
            room.setSeatLayout(new ArrayList<>());
        } else {
            room.getSeatLayout().clear();
        }
        List<Seat> newSeats = generateSeats(
            rows,
            cols,
            room,
            Collections.emptyList(),
            false,
            false
        );
        if (newSeats.isEmpty()) {
            throw new RuntimeException("Phòng phải có ít nhất một ghế. Tăng số hàng/cột.");
        }
        room.getSeatLayout().addAll(newSeats);
    }

    @Transactional
    public CinemaRoomResponseDTO updateCinemaRoom(Long roomId, CreateCinemaRoomDTO updateDTO, String username) {
        CinemaRoom room = cinemaRoomRepository.findByIdWithSeats(roomId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu với ID: " + roomId));

        Set<String> fullGridKeys = computeFullGridSeatKeys(updateDTO.getRows(), updateDTO.getCols());
        Set<String> currentSeatKeys = (room.getSeatLayout() == null || room.getSeatLayout().isEmpty())
            ? Collections.emptySet()
            : room.getSeatLayout().stream()
                .map(s -> s.getSeatRow() + String.valueOf(s.getSeatColumn()))
                .collect(Collectors.toSet());

        boolean resetLayout = Boolean.TRUE.equals(updateDTO.getResetLayout());
        boolean dimensionsChanged = resetLayout
            || !updateDTO.getRows().equals(currentGridRows(room))
            || !updateDTO.getCols().equals(currentGridCols(room));
        boolean layoutChanged = dimensionsChanged || !currentSeatKeys.equals(fullGridKeys);
        boolean roomTypeChanged = !room.getRoomType().equals(updateDTO.getRoomType());
        boolean hasPaidTickets = ticketRepository.existsPaidTicketsByRoomId(roomId);

        if (hasPaidTickets && dimensionsChanged) {
            throw new RuntimeException("Không thể thay đổi số hàng/cột vì đã có vé được đặt và thanh toán. Vui lòng liên hệ quản trị viên để xử lý.");
        }

        if (hasPaidTickets && roomTypeChanged) {
            throw new RuntimeException("Không thể thay đổi loại phòng chiếu vì đã có vé được đặt và thanh toán. Vui lòng liên hệ quản trị viên để xử lý.");
        }

        // Panorama luôn được cập nhật — không phụ thuộc đặt chỗ
        room.setRoomName(updateDTO.getRoomName());
        room.setPanoramaType(resolvePanoramaType(updateDTO.getPanoramaType()));

        if (!hasPaidTickets) {
            room.setRoomType(updateDTO.getRoomType());

            if (layoutChanged) {
                replaceSeatLayoutWithNormalGrid(room, updateDTO.getRows(), updateDTO.getCols());
            } else if (room.getSeatLayout() == null || room.getSeatLayout().isEmpty()) {
                replaceSeatLayoutWithNormalGrid(room, updateDTO.getRows(), updateDTO.getCols());
            }
        }

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);
        
        CinemaRoomResponseDTO responseDTO = mapToDTO(savedRoom);
        logRoomActivity(username, Action.UPDATE, savedRoom, "Cập nhật phòng chiếu " + responseDTO.getRoomName());
        return responseDTO;
    }
    
    /**
     * Kiểm tra xem phòng chiếu có đặt chỗ hay không
     * @param roomId ID của phòng chiếu
     * @return true nếu có đặt chỗ, false nếu không
     */
    public boolean hasBookings(Long roomId) {
        return ticketRepository.existsByRoomId(roomId);
    }
    
    @Transactional
    public void deleteCinemaRoom(Long roomId, String username) {
        CinemaRoom room = cinemaRoomRepository.findById(roomId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu với ID: " + roomId));
        
        // Ràng buộc: Không cho xóa phòng chiếu nếu đã có vé thanh toán thành công
        boolean hasPaidTickets = ticketRepository.existsPaidTicketsByRoomId(roomId);
        if (hasPaidTickets) {
            throw new RuntimeException("Không thể xóa phòng chiếu vì đã có vé được đặt và thanh toán. Vui lòng liên hệ quản trị viên để xử lý.");
        }
        
        cinemaRoomRepository.delete(room);
        logRoomActivity(username, Action.DELETE, room, "Xóa phòng chiếu " + room.getRoomName());
    }
    
    @Transactional
    public SeatResponseDTO updateSeatType(Long seatId, SeatType newType, String username) {
        Seat seat = seatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế với ID: " + seatId));
        
        // Ràng buộc: Không cho thay đổi loại ghế nếu đã có vé thanh toán
        // (Có thể cho phép thay đổi nhưng cần cảnh báo vì ảnh hưởng đến giá vé đã bán)
        boolean hasPaidTickets = ticketRepository.existsPaidTicketsBySeatId(seatId);
        if (hasPaidTickets) {
            throw new RuntimeException("Không thể thay đổi loại ghế vì đã có vé được đặt và thanh toán cho ghế này. Vui lòng liên hệ quản trị viên để xử lý.");
        }
        
        seat.setType(newType);
        Seat savedSeat = seatRepository.save(seat);
        
        SeatResponseDTO responseDTO = SeatResponseDTO.builder()
            .seatId(savedSeat.getSeatId())
            .type(savedSeat.getType())
            .seatRow(savedSeat.getSeatRow())
            .seatColumn(savedSeat.getSeatColumn())
            .build();

        logSeatActivity(username, savedSeat, "Cập nhật loại ghế thành " + newType);
        return responseDTO;
    }

    @Transactional
    public void deleteSeat(Long seatId, String username) {
        Seat seat = seatRepository.findById(seatId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế với ID: " + seatId));
        CinemaRoom room = seat.getCinemaRoom();
        if (room == null) {
            throw new RuntimeException("Ghế không thuộc phòng chiếu hợp lệ.");
        }

        if (ticketRepository.existsPaidTicketsBySeatId(seatId)) {
            throw new RuntimeException("Không thể xóa ghế vì đã có vé thanh toán cho ghế này.");
        }
        if (ticketRepository.existsAnyTicketForSeatId(seatId)) {
            throw new RuntimeException("Không thể xóa ghế vì đã có vé liên kết (kể cả chưa thanh toán).");
        }

        long cnt = seatRepository.countByCinemaRoom_RoomId(room.getRoomId());
        if (cnt <= 1) {
            throw new RuntimeException("Phòng phải còn ít nhất một ghế.");
        }

        if (room.getSeatLayout() != null) {
            room.getSeatLayout().remove(seat);
        }
        seatRepository.delete(seat);
        cinemaRoomRepository.save(room);

        try {
            if (username != null && !username.isBlank()) {
                String seatLabel = seat.getSeatRow() + seat.getSeatColumn();
                activityLogService.logActivity(
                    username,
                    Action.DELETE,
                    ObjectType.SEAT,
                    seatId,
                    seatLabel,
                    "Xóa ghế (khoảng trống)"
                );
            }
        } catch (Exception e) {
            log.error("Failed to log seat delete: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public SeatResponseDTO addSeat(Long roomId, AddSeatRequestDTO req, String username) {
        CinemaRoom room = cinemaRoomRepository.findByIdWithSeats(roomId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu với ID: " + roomId));

        String rowS = req.getSeatRow().trim().toUpperCase();
        if (rowS.length() != 1) {
            throw new RuntimeException("Hàng ghế không hợp lệ.");
        }
        char rc = rowS.charAt(0);
        if (rc < 'A' || rc > 'Z') {
            throw new RuntimeException("Hàng ghế không hợp lệ.");
        }
        int rowIdx = rc - 'A';
        if (rowIdx >= req.getGridRows()) {
            throw new RuntimeException("Hàng ghế vượt quá số hàng của lưới.");
        }
        if (req.getSeatColumn() < 1 || req.getSeatColumn() > req.getGridCols()) {
            throw new RuntimeException("Cột ghế không nằm trong lưới.");
        }

        if (seatRepository.existsByCinemaRoom_RoomIdAndSeatRowAndSeatColumn(roomId, rowS, req.getSeatColumn())) {
            throw new RuntimeException("Ô này đã có ghế.");
        }

        SeatType type = req.getType() != null ? req.getType() : SeatType.NORMAL;

        Seat seat = Seat.builder()
            .cinemaRoom(room)
            .seatRow(rowS)
            .seatColumn(req.getSeatColumn())
            .type(type)
            .build();

        if (room.getSeatLayout() == null) {
            room.setSeatLayout(new ArrayList<>());
        }
        room.getSeatLayout().add(seat);
        Seat saved = seatRepository.save(seat);

        SeatResponseDTO dto = SeatResponseDTO.builder()
            .seatId(saved.getSeatId())
            .type(saved.getType())
            .seatRow(saved.getSeatRow())
            .seatColumn(saved.getSeatColumn())
            .build();

        try {
            if (username != null && !username.isBlank()) {
                String seatLabel = saved.getSeatRow() + saved.getSeatColumn();
                activityLogService.logActivity(
                    username,
                    Action.CREATE,
                    ObjectType.SEAT,
                    saved.getSeatId(),
                    seatLabel,
                    "Thêm ghế tại " + seatLabel
                );
            }
        } catch (Exception e) {
            log.error("Failed to log seat create: {}", e.getMessage(), e);
        }

        return dto;
    }
    
    private CinemaRoomResponseDTO mapToDTO(CinemaRoom room) {
        List<SeatResponseDTO> seatDTOs = room.getSeatLayout() != null && !room.getSeatLayout().isEmpty()
            ? room.getSeatLayout().stream()
                .map(seat -> SeatResponseDTO.builder()
                    .seatId(seat.getSeatId())
                    .type(seat.getType())
                    .seatRow(seat.getSeatRow())
                    .seatColumn(seat.getSeatColumn())
                    .build())
                .collect(Collectors.toList())
            : new ArrayList<>();
        
        // Tính số hàng và cột từ ghế
        int rows = 0;
        int cols = 0;
        
        if (!seatDTOs.isEmpty()) {
            // Tính số hàng: lấy ký tự lớn nhất (A, B, C...) và chuyển sang số
            rows = seatDTOs.stream()
                .map(SeatResponseDTO::getSeatRow)
                .filter(row -> row != null && !row.isEmpty())
                .mapToInt(row -> row.charAt(0) - 'A' + 1)
                .max()
                .orElse(0);
            
            // Tính số cột: lấy cột lớn nhất
            cols = seatDTOs.stream()
                .map(SeatResponseDTO::getSeatColumn)
                .filter(col -> col != null && col > 0)
                .mapToInt(Integer::intValue)
                .max()
                .orElse(0);
        }
        
        return CinemaRoomResponseDTO.builder()
            .roomId(room.getRoomId())
            .roomName(room.getRoomName())
            .roomType(room.getRoomType())
            .panoramaType(room.getPanoramaType() != null ? room.getPanoramaType() : PanoramaType.NONE)
            .cinemaComplexId(room.getCinemaComplex().getComplexId())
            .cinemaComplexName(room.getCinemaComplex().getName())
            .rows(rows)
            .cols(cols)
            .seats(seatDTOs)
            .build();
    }

    private void logRoomActivity(String username, Action action, CinemaRoom room, String description) {
        if (username == null || username.isBlank() || room == null || room.getRoomId() == null) {
            return;
        }

        try {
            activityLogService.logActivity(
                username,
                action,
                ObjectType.ROOM,
                room.getRoomId(),
                room.getRoomName(),
                description
            );
        } catch (Exception e) {
            log.error("Failed to log room activity: {}", e.getMessage(), e);
        }
    }

    private void logSeatActivity(String username, Seat seat, String description) {
        if (username == null || username.isBlank() || seat == null || seat.getSeatId() == null) {
            return;
        }

        try {
            String seatLabel = seat.getSeatRow() + seat.getSeatColumn();
            activityLogService.logActivity(
                username,
                Action.UPDATE,
                ObjectType.SEAT,
                seat.getSeatId(),
                seatLabel,
                description
            );
        } catch (Exception e) {
            log.error("Failed to log seat activity: {}", e.getMessage(), e);
        }
    }
}

