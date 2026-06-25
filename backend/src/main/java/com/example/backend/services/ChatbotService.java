package com.example.backend.services;

import com.example.backend.dtos.ChatMessageResponseDTO;
import com.example.backend.entities.ChatConversation;
import com.example.backend.entities.ChatMessage;
import com.example.backend.entities.User;
import com.example.backend.entities.enums.ChatMessageRole;
import com.example.backend.repositories.ChatConversationRepository;
import com.example.backend.repositories.ChatMessageRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private static final int MAX_HISTORY_MESSAGES = 200;
    private static final String ERROR_REPLY =
            "Mình chưa nhận được phản hồi từ hệ thống AI. Bạn thử lại sau nhé!";

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final N8nService n8nService;

    public record ChatbotReplyResult(
            String reply,
            String source,
            Map<String, Object> meta,
            Long userMessageId,
            Long botMessageId) {
    }

    @Transactional
    public ChatbotReplyResult sendMessage(String sessionId, Long userId, String message) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId là bắt buộc");
        }
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("message là bắt buộc");
        }

        ChatConversation conversation = getOrCreateConversation(sessionId.trim(), userId);
        ChatMessage userMessage = saveMessage(conversation, ChatMessageRole.USER, message.trim(), null);

        String reply;
        String source;
        try {
            reply = n8nService.sendChatMessage(message.trim(), sessionId.trim(), userId);
            source = n8nService.getLastChatSource();
        } catch (Exception e) {
            log.warn("n8n chat failed for session {}: {}", sessionId, e.getMessage());
            reply = ERROR_REPLY;
            source = "error";
        }

        if (reply == null || reply.isBlank()) {
            reply = ERROR_REPLY;
            source = "empty";
        }

        ChatMessage botMessage = saveMessage(conversation, ChatMessageRole.BOT, reply.trim(), source);
        touchConversation(conversation);

        return new ChatbotReplyResult(
                reply.trim(),
                source,
                n8nService.getLastChatMeta(),
                userMessage.getMessageId(),
                botMessage.getMessageId());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponseDTO> getHistory(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return List.of();
        }

        return conversationRepository.findBySessionId(sessionId.trim())
                .map(this::toHistoryDtoList)
                .orElse(List.of());
    }

    @Transactional
    public void mergeGuestSession(String guestSessionId, String userSessionId, Long userId) {
        if (guestSessionId == null || guestSessionId.isBlank()
                || userSessionId == null || userSessionId.isBlank()
                || guestSessionId.equals(userSessionId)
                || !guestSessionId.startsWith("guest-")) {
            return;
        }

        Optional<ChatConversation> guestOpt = conversationRepository.findBySessionId(guestSessionId.trim());
        if (guestOpt.isEmpty()) {
            return;
        }

        ChatConversation guestConversation = guestOpt.get();
        ChatConversation userConversation = getOrCreateConversation(userSessionId.trim(), userId);

        if (userConversation.getConversationId().equals(guestConversation.getConversationId())) {
            return;
        }

        List<ChatMessage> guestMessages = messageRepository
                .findByConversationOrderByCreatedAtAscMessageIdAsc(guestConversation);
        for (ChatMessage message : guestMessages) {
            message.setConversation(userConversation);
        }
        messageRepository.saveAll(guestMessages);

        conversationRepository.delete(guestConversation);
        userConversation.setUser(resolveUser(userId));
        userConversation.setSessionId(userSessionId.trim());
        touchConversation(userConversation);
        log.info("Merged guest chat {} into session {}", guestSessionId, userSessionId);
    }

    private List<ChatMessageResponseDTO> toHistoryDtoList(ChatConversation conversation) {
        List<ChatMessage> messages = messageRepository
                .findByConversationOrderByCreatedAtAscMessageIdAsc(conversation);
        if (messages.size() > MAX_HISTORY_MESSAGES) {
            messages = messages.subList(messages.size() - MAX_HISTORY_MESSAGES, messages.size());
        }

        List<ChatMessageResponseDTO> result = new ArrayList<>(messages.size());
        for (ChatMessage message : messages) {
            result.add(toDto(message));
        }
        return result;
    }

    private ChatMessageResponseDTO toDto(ChatMessage message) {
        String role = message.getRole() == ChatMessageRole.USER ? "user" : "bot";
        return ChatMessageResponseDTO.builder()
                .id(message.getMessageId())
                .role(role)
                .text(message.getContent())
                .source(message.getSource())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private ChatConversation getOrCreateConversation(String sessionId, Long userId) {
        return conversationRepository.findBySessionId(sessionId)
                .map(existing -> attachUserIfNeeded(existing, userId))
                .orElseGet(() -> conversationRepository.save(ChatConversation.builder()
                        .sessionId(sessionId)
                        .user(resolveUser(userId))
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build()));
    }

    private ChatConversation attachUserIfNeeded(ChatConversation conversation, Long userId) {
        if (conversation.getUser() == null && userId != null) {
            conversation.setUser(resolveUser(userId));
            return conversationRepository.save(conversation);
        }
        return conversation;
    }

    private User resolveUser(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).orElse(null);
    }

    private ChatMessage saveMessage(
            ChatConversation conversation,
            ChatMessageRole role,
            String content,
            String source) {
        return messageRepository.save(ChatMessage.builder()
                .conversation(conversation)
                .role(role)
                .content(content)
                .source(source)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void touchConversation(ChatConversation conversation) {
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);
    }
}
