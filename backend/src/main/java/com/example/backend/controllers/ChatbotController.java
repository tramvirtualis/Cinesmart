package com.example.backend.controllers;

import com.example.backend.dtos.ChatMessageResponseDTO;
import com.example.backend.dtos.ChatbotMergeSessionRequestDTO;
import com.example.backend.dtos.ChatbotMessageRequestDTO;
import com.example.backend.services.ChatbotService;
import com.example.backend.services.ChatbotService.ChatbotReplyResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin
public class ChatbotController {

    private final ChatbotService chatbotService;

    @GetMapping("/api/public/chatbot/history")
    public ResponseEntity<Map<String, Object>> getHistory(@RequestParam String sessionId) {
        try {
            List<ChatMessageResponseDTO> messages = chatbotService.getHistory(sessionId);
            Map<String, Object> data = new HashMap<>();
            data.put("messages", messages);
            data.put("sessionId", sessionId.trim());
            return ResponseEntity.ok(createSuccessResponse("OK", data));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/api/public/chatbot/message")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody ChatbotMessageRequestDTO request) {
        try {
            String chatMessage = resolveChatMessage(request);
            String sessionId = resolveSessionId(request);
            Long userId = resolveUserId(request, sessionId);

            ChatbotReplyResult result = chatbotService.sendMessage(sessionId, userId, chatMessage);

            Map<String, Object> data = new HashMap<>();
            data.put("reply", result.reply());
            data.put("response_ai_agent", result.reply());
            data.put("source", result.source());
            data.put("userMessageId", result.userMessageId());
            data.put("botMessageId", result.botMessageId());

            Map<String, Object> meta = result.meta();
            if (meta != null) {
                Object responseAiAgent = meta.get("response_ai_agent");
                if (responseAiAgent != null && !String.valueOf(responseAiAgent).isBlank()) {
                    data.put("response_ai_agent", responseAiAgent);
                }
                if (meta.get("action") != null) {
                    data.put("action", meta.get("action"));
                }
                if (meta.get("target_url") != null) {
                    data.put("target_url", meta.get("target_url"));
                }
            }

            return ResponseEntity.ok(createSuccessResponse("OK", data));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/api/public/chatbot/merge-session")
    public ResponseEntity<Map<String, Object>> mergeSession(@RequestBody ChatbotMergeSessionRequestDTO request) {
        try {
            String guestSessionId = request.getGuestSessionId();
            String sessionId = request.getSessionId();
            if ((sessionId == null || sessionId.isBlank()) && request.getUserId() != null) {
                sessionId = String.valueOf(request.getUserId());
            }
            chatbotService.mergeGuestSession(guestSessionId, sessionId, request.getUserId());
            return ResponseEntity.ok(createSuccessResponse("OK", Map.of("merged", true)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(createErrorResponse(e.getMessage()));
        }
    }

    private String resolveChatMessage(ChatbotMessageRequestDTO request) {
        if (request.getChatMessage() != null && !request.getChatMessage().isBlank()) {
            return request.getChatMessage().trim();
        }
        if (request.getMessage() != null && !request.getMessage().isBlank()) {
            return request.getMessage().trim();
        }
        throw new IllegalArgumentException("message là bắt buộc");
    }

    private String resolveSessionId(ChatbotMessageRequestDTO request) {
        if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
            return request.getSessionId().trim();
        }
        if (request.getUserId() != null) {
            return String.valueOf(request.getUserId());
        }
        throw new IllegalArgumentException("sessionId là bắt buộc");
    }

    private Long resolveUserId(ChatbotMessageRequestDTO request, String sessionId) {
        if (request.getUserId() != null) {
            return request.getUserId();
        }
        if (sessionId.matches("\\d+")) {
            return Long.parseLong(sessionId);
        }
        return null;
    }

    private Map<String, Object> createSuccessResponse(String message, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("data", data);
        return response;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        response.put("data", null);
        return response;
    }
}
