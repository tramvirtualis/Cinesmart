import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  sendChatMessage,
  fetchChatHistory,
  mergeGuestChatSession,
  getChatUserId,
  CHAT_FALLBACK_REPLY,
  normalizeRedirectPath,
  resolveChatRedirect,
} from '../services/chatbotService.js';

const REDIRECT_DELAY_MS = 1750;

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'bot',
  text: 'Chào bạn! Mình là Popcorn Bot — trợ lý rạp Cinesmart. Bạn cần hỗ trợ đặt vé, lịch chiếu hay khuyến mãi không?',
};

const QUICK_REPLIES = [
  { label: 'Đặt vé', value: 'dat-ve' },
  { label: 'Lịch chiếu', value: 'lich-chieu' },
  { label: 'Khuyến mãi', value: 'khuyen-mai' },
  { label: 'Hỗ trợ', value: 'ho-tro' },
];

const FALLBACK_REPLY = CHAT_FALLBACK_REPLY;

function PopcornMascot({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="32" cy="54" rx="18" ry="4" fill="rgba(0,0,0,0.18)" />
      <path
        d="M18 28c0-8 6.5-14 14-14s14 6 14 14v18c0 3.3-2.7 6-6 6H24c-3.3 0-6-2.7-6-6V28z"
        fill="#E11B22"
      />
      <path
        d="M22 24c2-6 6-10 10-10s8 4 10 10"
        stroke="#FFD54F"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="26" cy="36" r="3.5" fill="#fff" />
      <circle cx="38" cy="36" r="3.5" fill="#fff" />
      <circle cx="27" cy="37" r="1.6" fill="#2d1b1b" />
      <circle cx="39" cy="37" r="1.6" fill="#2d1b1b" />
      <path
        d="M27 44c2.5 2.5 7.5 2.5 10 0"
        stroke="#2d1b1b"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="14" y="18" width="10" height="7" rx="2" fill="#1a1a1a" transform="rotate(-18 19 21.5)" />
      <rect x="40" y="18" width="10" height="7" rx="2" fill="#1a1a1a" transform="rotate(18 45 21.5)" />
      <path d="M16 20h6M42 20h6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="48" cy="14" r="2" fill="#FFD54F" className="cinema-chatbot__spark" />
      <circle cx="16" cy="12" r="1.5" fill="#FFD54F" className="cinema-chatbot__spark cinema-chatbot__spark--delay" />
    </svg>
  );
}

export default function CinemaChatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(() => getChatUserId());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  const isHiddenRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/manager') ||
    location.pathname.startsWith('/admindashboard') ||
    location.pathname.startsWith('/admin-dashboard') ||
    location.pathname.startsWith('/managerdashboard') ||
    location.pathname.startsWith('/manager-dashboard');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 280);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current != null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const syncSessionId = () => setChatSessionId(getChatUserId());
    window.addEventListener('storage', syncSessionId);
    window.addEventListener('popcorn-bot-session-change', syncSessionId);
    return () => {
      window.removeEventListener('storage', syncSessionId);
      window.removeEventListener('popcorn-bot-session-change', syncSessionId);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        await mergeGuestChatSession();
        const history = await fetchChatHistory();
        if (cancelled) {
          return;
        }
        setMessages(history.length > 0 ? history : [WELCOME_MESSAGE]);
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [isOpen, chatSessionId]);

  const addBotReply = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: `bot-${Date.now()}`, role: 'bot', text },
    ]);
    setIsTyping(false);
  };

  const scheduleRedirect = (targetUrl) => {
    const path = normalizeRedirectPath(targetUrl);
    if (!path) {
      return;
    }

    if (redirectTimeoutRef.current != null) {
      window.clearTimeout(redirectTimeoutRef.current);
    }

    redirectTimeoutRef.current = window.setTimeout(() => {
      navigate(path);
      redirectTimeoutRef.current = null;
    }, REDIRECT_DELAY_MS);
  };

  const requestBotReply = async (userText, options = {}) => {
    setIsTyping(true);
    try {
      const { reply, action, target_url: targetUrl } = await sendChatMessage(userText);
      const text = typeof reply === 'string' ? reply.trim() : '';

      addBotReply(text || FALLBACK_REPLY);

      const redirectPath = await resolveChatRedirect({
        reply: text,
        userMessage: userText,
        action,
        target_url: targetUrl,
        currentPath: `${location.pathname}${location.search}`,
      });

      if (redirectPath) {
        scheduleRedirect(redirectPath);
      } else if (options.navigateToSchedule) {
        scheduleRedirect('/schedule');
      } else if (import.meta.env.DEV) {
        console.debug('[Popcorn Bot] no redirect resolved for:', { userText, reply: text });
      }
    } catch (error) {
      console.error('[Popcorn Bot] request failed:', error);
      addBotReply(FALLBACK_REPLY);
      if (options.navigateToSchedule) {
        scheduleRedirect('/schedule');
      }
    }
  };

  const handleQuickReply = (value) => {
    const label = QUICK_REPLIES.find((item) => item.value === value)?.label ?? value;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: label },
    ]);
    requestBotReply(label, { navigateToSchedule: value === 'lich-chieu' });
  };

  const handleSend = (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', text: trimmed },
    ]);
    setInput('');
    requestBotReply(trimmed);
  };

  if (isHiddenRoute) {
    return null;
  }

  return (
    <div className={`cinema-chatbot ${isOpen ? 'cinema-chatbot--open' : ''}`}>
      {isOpen && (
        <div className="cinema-chatbot__panel" role="dialog" aria-label="Trợ lý Cinesmart">
          <header className="cinema-chatbot__header">
            <div className="cinema-chatbot__header-info">
              <div className="cinema-chatbot__avatar">
                <PopcornMascot />
              </div>
              <div>
                <p className="cinema-chatbot__title">Popcorn Bot</p>
                <p className="cinema-chatbot__status">
                  <span className="cinema-chatbot__status-dot" />
                  Sẵn sàng hỗ trợ
                </p>
              </div>
            </div>
            <button
              type="button"
              className="cinema-chatbot__close"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng chat"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="cinema-chatbot__messages">
            {isLoadingHistory && messages.length <= 1 && (
              <div className="cinema-chatbot__message cinema-chatbot__message--bot">
                <div className="cinema-chatbot__message-avatar">
                  <PopcornMascot />
                </div>
                <div className="cinema-chatbot__bubble cinema-chatbot__typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`cinema-chatbot__message cinema-chatbot__message--${message.role}`}
              >
                {message.role === 'bot' && (
                  <div className="cinema-chatbot__message-avatar">
                    <PopcornMascot />
                  </div>
                )}
                <div className="cinema-chatbot__bubble">{message.text}</div>
              </div>
            ))}

            {isTyping && (
              <div className="cinema-chatbot__message cinema-chatbot__message--bot">
                <div className="cinema-chatbot__message-avatar">
                  <PopcornMascot />
                </div>
                <div className="cinema-chatbot__bubble cinema-chatbot__typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="cinema-chatbot__quick-replies">
            {QUICK_REPLIES.map((item) => (
              <button
                key={item.value}
                type="button"
                className="cinema-chatbot__chip"
                onClick={() => handleQuickReply(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="cinema-chatbot__input-row" onSubmit={handleSend}>
            <input
              ref={inputRef}
              type="text"
              className="cinema-chatbot__input"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={500}
            />
            <button
              type="submit"
              className="cinema-chatbot__send"
              disabled={!input.trim()}
              aria-label="Gửi tin nhắn"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3.4 20.4l17.45-7.2c.8-.33.8-1.46 0-1.8L3.4 4.2c-.77-.32-1.58.4-1.4 1.22l1.52 6.1a1 1 0 00.95.76H12v2H4.47a1 1 0 00-.95.76l-1.52 6.1c-.18.82.63 1.54 1.4 1.22z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="cinema-chatbot__fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Thu gọn chat' : 'Mở trợ lý Cinesmart'}
        aria-expanded={isOpen}
      >
        <span className="cinema-chatbot__fab-ring" />
        <span className="cinema-chatbot__fab-ring cinema-chatbot__fab-ring--delay" />
        <span className="cinema-chatbot__fab-icon">
          {isOpen ? (
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <PopcornMascot />
          )}
        </span>
        {!isOpen && <span className="cinema-chatbot__fab-badge">Hỏi mình!</span>}
      </button>
    </div>
  );
}
