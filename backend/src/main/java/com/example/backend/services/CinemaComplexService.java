package com.example.backend.services;

import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.CreateCinemaComplexDTO;
import com.example.backend.entities.Address;
import com.example.backend.entities.CinemaComplex;
import com.example.backend.entities.Movie;
import com.example.backend.repositories.AddressRepository;
import com.example.backend.repositories.CinemaComplexRepository;
import com.example.backend.repositories.MovieRepository;
import com.example.backend.repositories.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.utils.SecurityUtils;

@Service
@RequiredArgsConstructor
public class CinemaComplexService {
    
    private final CinemaComplexRepository cinemaComplexRepository;
    private final AddressRepository addressRepository;
    private final MovieRepository movieRepository;
    private final ActivityLogService activityLogService;
    private final TicketRepository ticketRepository;
    
    public List<CinemaComplexResponseDTO> getAllCinemaComplexes() {
        return cinemaComplexRepository.findAll().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public CinemaComplexResponseDTO getCinemaComplexById(Long complexId) {
        CinemaComplex complex = cinemaComplexRepository.findById(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp với ID: " + complexId));
        return mapToDTO(complex);
    }
    
    public List<CinemaComplexResponseDTO> getCinemaComplexesByManager(Long complexId) {
        // Manager chỉ có thể xem cụm rạp của mình
        if (complexId == null) {
            return List.of();
        }
        return cinemaComplexRepository.findById(complexId)
            .map(complex -> List.of(mapToDTO(complex)))
            .orElse(List.of());
    }
    
    @Transactional
    public CinemaComplexResponseDTO createCinemaComplex(CreateCinemaComplexDTO createDTO, String username) {
        // Tạo Address
        Address address = Address.builder()
            .description(createDTO.getAddressDescription())
            .province(createDTO.getAddressProvince())
            .build();
        Address savedAddress = addressRepository.save(address);
        
        // Tạo CinemaComplex
        CinemaComplex complex = CinemaComplex.builder()
            .name(createDTO.getName())
            .address(savedAddress)
            .build();
        
        CinemaComplex savedComplex = cinemaComplexRepository.save(complex);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.CREATE,
                    ObjectType.CINEMA,
                    savedComplex.getComplexId(),
                    savedComplex.getName(),
                    "Thêm cụm rạp mới: " + savedComplex.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log cinema complex activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return mapToDTO(savedComplex);
    }
    
    @Transactional
    public CinemaComplexResponseDTO updateCinemaComplex(Long complexId, CreateCinemaComplexDTO updateDTO, String username) {
        CinemaComplex complex = cinemaComplexRepository.findById(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp với ID: " + complexId));
        
        // Cập nhật tên
        complex.setName(updateDTO.getName());
        
        // Cập nhật Address
        Address address = complex.getAddress();
        if (address == null) {
            // Tạo Address mới nếu chưa có
            address = Address.builder()
                .description(updateDTO.getAddressDescription())
                .province(updateDTO.getAddressProvince())
                .build();
            address = addressRepository.save(address);
            complex.setAddress(address);
        } else {
            // Cập nhật Address hiện có
            address.setDescription(updateDTO.getAddressDescription());
            address.setProvince(updateDTO.getAddressProvince());
            addressRepository.save(address);
        }
        
        CinemaComplex updatedComplex = cinemaComplexRepository.save(complex);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.UPDATE,
                    ObjectType.CINEMA,
                    updatedComplex.getComplexId(),
                    updatedComplex.getName(),
                    "Cập nhật cụm rạp: " + updatedComplex.getName()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log cinema complex activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        return mapToDTO(updatedComplex);
    }
    
    @Transactional
    public void deleteCinemaComplex(Long complexId, String username) {
        CinemaComplex complex = cinemaComplexRepository.findById(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp với ID: " + complexId));
        
        String complexName = complex.getName();
        
        // Ràng buộc: Không cho xóa cụm rạp nếu đã có đơn hàng thanh toán thành công
        boolean hasPaidTickets = ticketRepository.existsPaidTicketsByComplexId(complexId);
        if (hasPaidTickets) {
            throw new RuntimeException("Không thể xóa cụm rạp vì đã có vé được đặt và thanh toán. Vui lòng liên hệ quản trị viên để xử lý.");
        }
        
        // Xóa Address (cascade sẽ xử lý các quan hệ khác)
        if (complex.getAddress() != null) {
            addressRepository.delete(complex.getAddress());
        }
        
        cinemaComplexRepository.delete(complex);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.DELETE,
                    ObjectType.CINEMA,
                    complexId,
                    complexName,
                    "Xóa cụm rạp: " + complexName
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log cinema complex activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    // ============ MOVIE MANAGEMENT METHODS ============

    /**
     * Lấy danh sách phim của cụm rạp
     */
    @Transactional(readOnly = true)
    public List<Movie> getMoviesByComplexId(Long complexId) {
        CinemaComplex complex = cinemaComplexRepository.findByIdWithMovies(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp với ID: " + complexId));
        
        if (complex.getMovies() == null) {
            return new ArrayList<>();
        }
        return complex.getMovies();
    }

    /**
     * Thêm phim vào cụm rạp
     */
    @Transactional
    public void addMovieToComplex(Long complexId, Long movieId, String username) {
        CinemaComplex complex = cinemaComplexRepository.findByIdWithMovies(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp với ID: " + complexId));
        
        Movie movie = movieRepository.findById(movieId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + movieId));
        
        // Initialize movies list if null
        if (complex.getMovies() == null) {
            complex.setMovies(new ArrayList<>());
        }
        
        // Check if movie already exists
        boolean alreadyExists = complex.getMovies().stream()
            .anyMatch(m -> m.getMovieId().equals(movieId));
        
        if (alreadyExists) {
            throw new RuntimeException("Phim này đã có trong danh sách cụm rạp");
        }
        
        // Add movie to complex
        complex.getMovies().add(movie);
        cinemaComplexRepository.save(complex);

        logMovieAssignmentActivity(
            username,
            Action.CREATE,
            complex,
            movie,
            "Thêm phim " + movie.getTitle() + " vào cụm rạp " + complex.getName()
        );
    }

    /**
     * Xóa phim khỏi cụm rạp
     */
    @Transactional
    public void removeMovieFromComplex(Long complexId, Long movieId, String username) {
        CinemaComplex complex = cinemaComplexRepository.findByIdWithMovies(complexId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cụm rạp với ID: " + complexId));
        
        // Initialize movies list if null
        if (complex.getMovies() == null) {
            complex.setMovies(new ArrayList<>());
        }
        
        // Check if movie exists
        boolean exists = complex.getMovies().stream()
            .anyMatch(m -> m.getMovieId().equals(movieId));
        
        if (!exists) {
            throw new RuntimeException("Phim này không có trong danh sách cụm rạp");
        }
        
        // Remove movie from complex
        complex.setMovies(
            complex.getMovies().stream()
                .filter(m -> !m.getMovieId().equals(movieId))
                .collect(Collectors.toList())
        );
        cinemaComplexRepository.save(complex);

        Movie movie = movieRepository.findById(movieId)
            .orElse(null);

        logMovieAssignmentActivity(
            username,
            Action.DELETE,
            complex,
            movie,
            "Xóa phim " + (movie != null ? movie.getTitle() : ("ID " + movieId)) + " khỏi cụm rạp " + complex.getName()
        );
    }

    private void logMovieAssignmentActivity(String username,
                                            Action action,
                                            CinemaComplex complex,
                                            Movie movie,
                                            String description) {
        if (username == null || username.isBlank()) {
            return;
        }
        if (complex == null) {
            return;
        }

        try {
            Long objectId = complex.getComplexId();
            String movieTitle = movie != null ? movie.getTitle() : "Phim chưa xác định";
            String objectName = String.format("%s - %s", movieTitle, complex.getName());

            activityLogService.logActivity(
                username,
                action,
                ObjectType.CINEMA,
                objectId,
                objectName,
                description
            );
        } catch (Exception e) {
            System.err.println("ERROR logging movie assignment activity: " + e.getMessage());
        }
    }
    
    private CinemaComplexResponseDTO mapToDTO(CinemaComplex complex) {
        String addressDescription = complex.getAddress() != null ? complex.getAddress().getDescription() : "";
        String addressProvince = complex.getAddress() != null ? complex.getAddress().getProvince() : "";
        String fullAddress = addressDescription + (addressProvince.isEmpty() ? "" : ", " + addressProvince);
        
        return CinemaComplexResponseDTO.builder()
            .complexId(complex.getComplexId())
            .name(complex.getName())
            .addressDescription(addressDescription)
            .addressProvince(addressProvince)
            .fullAddress(fullAddress)
            .build();
    }
}

