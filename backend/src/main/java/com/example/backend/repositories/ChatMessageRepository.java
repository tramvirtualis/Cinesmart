package com.example.backend.repositories;

import com.example.backend.entities.ChatConversation;
import com.example.backend.entities.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationOrderByCreatedAtAscMessageIdAsc(ChatConversation conversation);
}
