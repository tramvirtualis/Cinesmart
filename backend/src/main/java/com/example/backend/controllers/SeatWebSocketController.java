package com.example.backend.controllers;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.backend.dtos.SeatSelectionMessage;
import com.example.backend.dtos.SeatStatusUpdate;

import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
public class SeatWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // Store temporarily selected seats per showtime with timestamp and sessionId
    // Key: showtimeId, Value: Map of seatId -> SeatInfo (timestamp, sessionId)
    private final ConcurrentMap<Long, ConcurrentMap<String, SeatInfo>> selectedSeatsByShowtime = new ConcurrentHashMap<>();
    
    // Track sessionId -> seats mapping for cleanup on disconnect
    // Key: sessionId, Value: Set of (showtimeId, seatId) pairs
    private final ConcurrentMap<String, Set<SeatKey>> sessionSeats = new ConcurrentHashMap<>();

    // Timeout in milliseconds (2 minutes)
    private static final long SEAT_SELECTION_TIMEOUT = 2 * 60 * 1000;
    
    // Inner class to store seat selection info
    private static class SeatInfo {
        long timestamp;
        String sessionId;
        
        SeatInfo(long timestamp, String sessionId) {
            this.timestamp = timestamp;
            this.sessionId = sessionId;
        }
    }
    
    // Inner class for seat key
    private static class SeatKey {
        Long showtimeId;
        String seatId;
        
        SeatKey(Long showtimeId, String seatId) {
            this.showtimeId = showtimeId;
            this.seatId = seatId;
        }
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            SeatKey seatKey = (SeatKey) o;
            return showtimeId.equals(seatKey.showtimeId) && seatId.equals(seatKey.seatId);
        }
        
        @Override
        public int hashCode() {
            return showtimeId.hashCode() * 31 + seatId.hashCode();
        }
    }

    @GetMapping("/api/public/seats/status")
    @ResponseBody
    public ResponseEntity<?> getSeatStatus(@RequestParam Long showtimeId) {
        ConcurrentMap<String, SeatInfo> seatMap = selectedSeatsByShowtime.getOrDefault(showtimeId,
                new ConcurrentHashMap<>());
        Set<String> selectedSeats = seatMap.keySet();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("selectedSeats", selectedSeats);
        return ResponseEntity.ok(response);
    }

    @MessageMapping("/seat/select")
    @SendTo("/topic/seats")
    public SeatStatusUpdate handleSeatSelection(SeatSelectionMessage message) {
        String sessionId = message.getSessionId();
        Long showtimeId = message.getShowtimeId();
        String seatId = message.getSeatId();
        String action = message.getAction();
        
        log.info("Received seat selection: showtimeId={}, seatId={}, action={}, sessionId={}",
                showtimeId, seatId, action, sessionId);

        // Get or create the map of selected seats for this showtime
        ConcurrentMap<String, SeatInfo> selectedSeats = selectedSeatsByShowtime.computeIfAbsent(
                showtimeId,
                k -> new ConcurrentHashMap<>());

        if ("SELECT".equals(action)) {
            // Check if seat is already selected by another session
            SeatInfo existingInfo = selectedSeats.get(seatId);
            if (existingInfo != null && !existingInfo.sessionId.equals(sessionId)) {
                // Seat is already selected by another user
                log.warn("Seat {} already selected by session {} for showtime {}", 
                        seatId, existingInfo.sessionId, showtimeId);
                // Still return current state
            return new SeatStatusUpdate(
                    showtimeId,
                    seatId,
                    "ALREADY_SELECTED",
                    new HashSet<>(selectedSeats.keySet()),
                    sessionId);
            }
            
            // Add seat to selected map with current timestamp and sessionId
            selectedSeats.put(seatId, new SeatInfo(System.currentTimeMillis(), sessionId));
            
            // Track this seat for this session
            sessionSeats.computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet())
                    .add(new SeatKey(showtimeId, seatId));
            
            log.info("Seat {} selected for showtime {} by session {}. Total selected: {}",
                    seatId, showtimeId, sessionId, selectedSeats.size());

            return new SeatStatusUpdate(
                    showtimeId,
                    seatId,
                    "SELECTED",
                    new HashSet<>(selectedSeats.keySet()),
                    sessionId);
        } else if ("DESELECT".equals(action)) {
            // Only allow deselect if it's the same session that selected it
            SeatInfo existingInfo = selectedSeats.get(seatId);
            if (existingInfo != null && existingInfo.sessionId.equals(sessionId)) {
                // Remove seat from selected map
                selectedSeats.remove(seatId);
                
                // Remove from session tracking
                Set<SeatKey> sessionSeatSet = sessionSeats.get(sessionId);
                if (sessionSeatSet != null) {
                    sessionSeatSet.remove(new SeatKey(showtimeId, seatId));
                    if (sessionSeatSet.isEmpty()) {
                        sessionSeats.remove(sessionId);
                    }
                }
                
                log.info("Seat {} deselected for showtime {} by session {}. Total selected: {}",
                        seatId, showtimeId, sessionId, selectedSeats.size());

                return new SeatStatusUpdate(
                        showtimeId,
                        seatId,
                        "DESELECTED",
                        new HashSet<>(selectedSeats.keySet()),
                        sessionId);
            } else {
                log.warn("Attempt to deselect seat {} by different session. Owner: {}, Requester: {}",
                        seatId, existingInfo != null ? existingInfo.sessionId : "none", sessionId);
            }
        }

        return new SeatStatusUpdate(showtimeId, seatId, "UNKNOWN", new HashSet<>(selectedSeats.keySet()), sessionId);
    }

    // Method to clear selected seats when booking is confirmed
    public void clearSelectedSeats(Long showtimeId, Set<String> bookedSeatIds) {
        ConcurrentMap<String, SeatInfo> selectedSeats = selectedSeatsByShowtime.get(showtimeId);
        if (selectedSeats != null) {
            bookedSeatIds.forEach(seatId -> {
                SeatInfo info = selectedSeats.remove(seatId);
                if (info != null) {
                    // Remove from session tracking
                    Set<SeatKey> sessionSeatSet = sessionSeats.get(info.sessionId);
                    if (sessionSeatSet != null) {
                        sessionSeatSet.remove(new SeatKey(showtimeId, seatId));
                        if (sessionSeatSet.isEmpty()) {
                            sessionSeats.remove(info.sessionId);
                        }
                    }
                }
            });
            log.info("Cleared booked seats {} for showtime {}", bookedSeatIds, showtimeId);
        }
    }
    
    // Method to clear all seats for a session (when user disconnects)
    public void clearSessionSeats(String sessionId) {
        Set<SeatKey> seatKeys = sessionSeats.remove(sessionId);
        if (seatKeys != null && !seatKeys.isEmpty()) {
            log.info("Clearing {} seats for disconnected session {}", seatKeys.size(), sessionId);
            
            // Group by showtimeId for efficient updates
            Map<Long, Set<String>> seatsByShowtime = new HashMap<>();
            seatKeys.forEach(key -> {
                seatsByShowtime.computeIfAbsent(key.showtimeId, k -> new HashSet<>())
                        .add(key.seatId);
            });
            
            // Remove seats and broadcast updates
            seatsByShowtime.forEach((showtimeId, seatIds) -> {
                ConcurrentMap<String, SeatInfo> selectedSeats = selectedSeatsByShowtime.get(showtimeId);
                if (selectedSeats != null) {
                    seatIds.forEach(selectedSeats::remove);
                    
                    // Broadcast update
                    SeatStatusUpdate update = new SeatStatusUpdate(
                            showtimeId,
                            null, // No specific seat, this is a batch update
                            "BATCH_DESELECTED",
                            new HashSet<>(selectedSeats.keySet()),
                            null // No specific session for batch updates
                    );
                    messagingTemplate.convertAndSend("/topic/seats", update);
                }
            });
        }
    }

    // Scheduled task to check for expired seat selections
    // Runs every 30 seconds
    @Scheduled(fixedRate = 30000)
    public void checkSeatTimeout() {
        long currentTime = System.currentTimeMillis();
        
        selectedSeatsByShowtime.forEach((showtimeId, seatsMap) -> {
            Set<String> expiredSeats = new HashSet<>();
            
            seatsMap.forEach((seatId, seatInfo) -> {
                if (currentTime - seatInfo.timestamp > SEAT_SELECTION_TIMEOUT) {
                    expiredSeats.add(seatId);
                }
            });
            
            if (!expiredSeats.isEmpty()) {
                log.info("Found {} expired seats for showtime {}", expiredSeats.size(), showtimeId);
                
                // Remove expired seats and clean up session tracking
                expiredSeats.forEach(seatId -> {
                    SeatInfo info = seatsMap.remove(seatId);
                    if (info != null) {
                        Set<SeatKey> sessionSeatSet = sessionSeats.get(info.sessionId);
                        if (sessionSeatSet != null) {
                            sessionSeatSet.remove(new SeatKey(showtimeId, seatId));
                            if (sessionSeatSet.isEmpty()) {
                                sessionSeats.remove(info.sessionId);
                            }
                        }
                    }
                });
                
                // Send single batch update instead of individual updates
                SeatStatusUpdate update = new SeatStatusUpdate(
                    showtimeId,
                    null, // No specific seat, this is a batch update
                    "BATCH_DESELECTED",
                    new HashSet<>(seatsMap.keySet()),
                    null // No specific session for batch updates
                );
                messagingTemplate.convertAndSend("/topic/seats", update);
            }
        });
    }
}
