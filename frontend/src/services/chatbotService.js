import axios from 'axios';

const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/popcorn';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const CHAT_API_URL = `${API_BASE_URL}/public/chatbot/message`;
const CHAT_HISTORY_URL = `${API_BASE_URL}/public/chatbot/history`;
const CHAT_MERGE_URL = `${API_BASE_URL}/public/chatbot/merge-session`;
const CHAT_REQUEST_TIMEOUT_MS = 180_000;

const GUEST_USER_KEY = 'popcorn-bot-guest-user-id';

export const CHAT_FALLBACK_REPLY =
  'Vào mục Lịch chiếu để xem suất theo ngày và rạp. Mình cũng có thể gợi ý phim hot tuần này!';

const INVALID_REPLY_VALUES = new Set(['{}', '[]', '[object Object]', 'null', 'undefined']);

export function getChatUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.userId != null && user.userId !== '') {
      return String(user.userId);
    }
    if (user.id != null && user.id !== '') {
      return String(user.id);
    }
  } catch {
    // Bỏ qua JSON lỗi, dùng guest id
  }

  let guestId = localStorage.getItem(GUEST_USER_KEY);
  if (!guestId) {
    guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(GUEST_USER_KEY, guestId);
  }
  return guestId;
}

function normalizeReplyText(value) {
  if (value == null || typeof value === 'object') {
    return '';
  }
  return String(value).trim();
}

function isValidReply(text) {
  if (!text) {
    return false;
  }
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return false;
  }
  return !INVALID_REPLY_VALUES.has(trimmed);
}

function findLongestText(value, depth = 0) {
  if (depth > 6 || value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    let best = '';
    for (const item of value) {
      const text = findLongestText(item, depth + 1);
      if (text.length > best.length) {
        best = text;
      }
    }
    return best;
  }
  if (typeof value === 'object') {
    let best = '';
    for (const nested of Object.values(value)) {
      const text = findLongestText(nested, depth + 1);
      if (text.length > best.length) {
        best = text;
      }
    }
    return best;
  }
  return '';
}

/**
 * Bóc tách reply từ response n8n.
 * Khớp workflow: AI Agent → field "output", Respond to Webhook → field "reply".
 */
export function extractN8nReply(data) {
  if (data == null) {
    return '';
  }

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed || INVALID_REPLY_VALUES.has(trimmed)) {
      return '';
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return extractN8nReply(JSON.parse(trimmed));
      } catch {
        return isValidReply(trimmed) ? trimmed : '';
      }
    }
    return trimmed;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const extracted = extractN8nReply(item);
      if (isValidReply(extracted)) {
        return extracted;
      }
    }
    return '';
  }

  if (typeof data === 'object') {
    // Respond to Webhook của bạn cấu hình key "reply"
    for (const key of ['reply', 'output', 'text', 'message', 'response', 'response_ai_agent']) {
      const value = normalizeReplyText(data[key]);
      if (isValidReply(value)) {
        return value;
      }
    }

    if (data.json && typeof data.json === 'object') {
      const nestedJson = extractN8nReply(data.json);
      if (isValidReply(nestedJson)) {
        return nestedJson;
      }
    }

    if (data.data && typeof data.data === 'object') {
      const nestedData = extractN8nReply(data.data);
      if (isValidReply(nestedData)) {
        return nestedData;
      }
    }

    const deep = findLongestText(data);
    if (isValidReply(deep) && deep.length > 20) {
      return deep;
    }
  }

  return '';
}

/** @deprecated dùng extractN8nReply */
export const extractResponseAiAgent = extractN8nReply;

function extractN8nMeta(data, depth = 0) {
  if (data == null || depth > 6) {
    return { action: null, target_url: null };
  }
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return extractN8nMeta(JSON.parse(trimmed), depth + 1);
      } catch {
        return { action: null, target_url: null };
      }
    }
    return { action: null, target_url: null };
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const meta = extractN8nMeta(item, depth + 1);
      if (meta.action || meta.target_url) {
        return meta;
      }
    }
    return { action: null, target_url: null };
  }
  if (typeof data === 'object') {
    const actionRaw = data.action;
    const targetUrlRaw = data.target_url ?? data.targetUrl;
    if (actionRaw || targetUrlRaw) {
      return {
        action: typeof actionRaw === 'string' ? actionRaw.trim().toUpperCase() : actionRaw,
        target_url: targetUrlRaw != null ? String(targetUrlRaw).trim() : null,
      };
    }
    for (const key of ['json', 'data', 'body']) {
      if (data[key] && typeof data[key] === 'object') {
        const nested = extractN8nMeta(data[key], depth + 1);
        if (nested.action || nested.target_url) {
          return nested;
        }
      }
    }
  }
  return { action: null, target_url: null };
}

/** Chuyển target_url (path hoặc full URL) thành path cho react-router. */
export function normalizeRedirectPath(targetUrl) {
  if (targetUrl == null) {
    return '';
  }

  const trimmed = String(targetUrl).trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return '';
    }
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

const APP_ROUTE_PREFIXES = [
  '/movie/',
  '/schedule',
  '/cinemas',
  '/cinema/',
  '/booking-history',
  '/orders',
  '/transaction-history',
  '/book-ticket',
  '/booking',
  '/food-drinks',
  '/food-and-drinks',
  '/order-food',
  '/food-drinks-with-ticket',
  '/events',
  '/library',
  '/search',
  '/profile',
  '/wallet',
];

/** Alias path AI hay dùng sai → route thật trong App.jsx */
const PATH_ALIASES = {
  '/vouchers': '/events',
  '/voucher': '/events',
  '/promotions': '/events',
  '/khuyen-mai': '/events',
  '/food': '/food-drinks',
  '/foods': '/food-drinks',
  '/snacks': '/food-drinks',
};

const RELATIVE_ROUTE_SEGMENTS = [
  'movie',
  'cinemas',
  'cinema',
  'schedule',
  'booking-history',
  'orders',
  'transaction-history',
  'library',
  'food-drinks',
  'food-and-drinks',
  'order-food',
  'food-drinks-with-ticket',
  'events',
  'search',
  'profile',
  'book-ticket',
  'booking',
  'wallet',
];

const RELATIVE_PATH_REGEX = new RegExp(
  `(?:^|\\s)(/(?:${RELATIVE_ROUTE_SEGMENTS.join('|')})[^\\s<>"')\\]]*)`,
  'gi',
);

function getRoutePathname(path) {
  const queryIndex = path.indexOf('?');
  const hashIndex = path.indexOf('#');
  const end = Math.min(
    queryIndex === -1 ? path.length : queryIndex,
    hashIndex === -1 ? path.length : hashIndex,
  );
  return path.slice(0, end);
}

function resolveAppPath(rawPath) {
  const normalized = normalizeRedirectPath(trimTrailingPunctuation(rawPath));
  const pathname = getRoutePathname(normalized);
  const aliasedPath = PATH_ALIASES[pathname];
  if (!aliasedPath) {
    return normalized;
  }
  const suffix = normalized.slice(pathname.length);
  return `${aliasedPath}${suffix}`;
}

function trimTrailingPunctuation(value) {
  return String(value).replace(/[.,;:!?)}\]]+$/, '');
}

function isLocalAppOrigin(origin) {
  if (typeof window !== 'undefined' && origin === window.location.origin) {
    return true;
  }
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isKnownAppRoute(path) {
  if (!path || !path.startsWith('/')) {
    return false;
  }
  const pathname = getRoutePathname(path);
  return APP_ROUTE_PREFIXES.some((prefix) => {
    const base = prefix.replace(/\/$/, '');
    return pathname === base || pathname.startsWith(prefix);
  });
}

function toAppPath(rawUrl) {
  const path = resolveAppPath(rawUrl);
  return isKnownAppRoute(path) ? path : null;
}

/**
 * Trích các link nội bộ app từ câu trả lời AI (full URL hoặc path /movie/...).
 * Frontend tự redirect khi chỉ có đúng 1 link.
 */
export function extractAppLinksFromText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const found = new Set();

  for (const match of text.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
    const path = toAppPath(match[2]);
    if (path) {
      found.add(path);
    }
  }

  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
    try {
      const parsed = new URL(trimTrailingPunctuation(match[0]));
      if (isLocalAppOrigin(parsed.origin)) {
        const path = toAppPath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
        if (path) {
          found.add(path);
        }
      }
    } catch {
      // Bỏ qua URL không hợp lệ
    }
  }

  for (const match of text.matchAll(RELATIVE_PATH_REGEX)) {
    const path = toAppPath(match[1]);
    if (path) {
      found.add(path);
    }
  }

  return [...found];
}

/** Lấy link duy nhất để auto-redirect (null nếu 0 hoặc >1 link). */
export function extractSingleAppLinkFromText(text) {
  const links = extractAppLinksFromText(text);
  return links.length === 1 ? links[0] : null;
}

/** Bỏ dấu tiếng Việt — giọng nói thường trả text không dấu. */
export function normalizeViText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function cleanUserCommand(text) {
  return String(text || '')
    .trim()
    .replace(/\s+(nhé|nha|nhe|đi|di|ạ|a|please)\s*$/gi, '')
    .trim();
}

function matchesPattern(text, pattern) {
  const normalized = normalizeViText(text);
  return pattern.test(text) || pattern.test(normalized);
}

function matchesAnyPattern(text, patterns) {
  return patterns.some((pattern) => matchesPattern(text, pattern));
}

/** Từ khóa tiếng Việt → route (chỉ dùng khi user chủ động yêu cầu mở trang). */
const NAV_INTENT_RULES = [
  { path: '/profile?tab=vouchers', patterns: [/voucher của tôi/i, /voucher đã lưu/i] },
  { path: '/profile?tab=wallet', patterns: [/ví cinesmart/i, /ví của tôi/i] },
  { path: '/booking-history', patterns: [/lịch sử đặt vé/i, /lịch sử đặt hàng/i, /vé đã mua/i, /vé của tôi/i, /đơn đã đặt/i] },
  { path: '/transaction-history', patterns: [/lịch sử giao dịch/i] },
  { path: '/orders', patterns: [/đơn hàng/i] },
  { path: '/library', patterns: [/thư viện/i] },
  { path: '/food-drinks', patterns: [/đồ ăn nước uống/i, /bắp nước/i, /đồ ăn/i, /nước uống/i] },
  { path: '/schedule', patterns: [/lịch chiếu/i, /suất chiếu/i] },
  { path: '/book-ticket', patterns: [/đặt vé/i] },
  { path: '/cinemas', patterns: [/danh sách rạp/i, /các rạp/i] },
  { path: '/events', patterns: [/voucher/i, /khuyến mãi/i, /ưu đãi/i, /sự kiện/i] },
  { path: '/profile', patterns: [/tài khoản/i, /hồ sơ/i] },
];

const EXPLICIT_USER_NAV_PATTERNS = [
  /\bmở\s+(?:trang|link|giúp|cho)\b/i,
  /\bvào\s+(?:trang|link)\b/i,
  /\bchuyển\s+(?:tôi|mình|bạn)?\s*(?:tới|đến|sang|qua)\b/i,
  /\bđưa\s+(?:tôi|mình)\s*(?:tới|đến|sang)\b/i,
  /\bdẫn\s+(?:tôi|mình)\s*(?:tới|đến|sang)\b/i,
  /\bđi\s+tới\b/i,
  /\bxem\s+trang\b/i,
  /\bopen\b/i,
  // Không dấu / giọng nói
  /\bmo\s+(?:trang|link|giup|cho)\b/i,
  /\bvao\s+(?:trang|link)\b/i,
  /\bchuyen\s+(?:toi|minh|ban)?\s*(?:toi|den|sang|qua)\b/i,
  /\bdua\s+(?:toi|minh)\s*(?:toi|den|sang)\b/i,
  /\bdan\s+(?:toi|minh)\s*(?:toi|den|sang)\b/i,
];

const SHORT_CONFIRM_VALUES = new Set([
  'có', 'co', 'ok', 'oke', 'được', 'duoc', 'ừ', 'u', 'uh', 'yes', 'yep', 'mở đi', 'mo di', 'làm đi', 'lam di',
]);

/** User chủ động yêu cầu mở/chuyển trang (không tính câu hỏi thông tin). */
export function userExplicitlyRequestedNavigation(userMessage, { fromVoice = false } = {}) {
  if (!userMessage || typeof userMessage !== 'string') {
    return false;
  }

  const text = cleanUserCommand(userMessage);
  if (!text) {
    return false;
  }

  const normalized = normalizeViText(text.replace(/[!.?]+$/g, ''));
  if (SHORT_CONFIRM_VALUES.has(normalized)) {
    return true;
  }

  if (fromVoice) {
    if (/\b(mo|vao|open)\b/.test(normalized) && /\b(trang|link|page)\b/.test(normalized)) {
      return true;
    }
    if (/^(co|duoc|ok|oke|mo di|lam di|u|yes)$/.test(normalized)) {
      return true;
    }
  }

  const isInfoQuestion =
    /(?:không|khong|gì|gi|nào|nao|bao nhiêu|bao nhieu|khi nào|khi nao)\s*\??$/i.test(text)
    && !matchesAnyPattern(text, EXPLICIT_USER_NAV_PATTERNS);

  if (isInfoQuestion && !matchesPattern(text, /\bm[oở]\s+trang\b/i)) {
    return false;
  }

  return matchesAnyPattern(text, EXPLICIT_USER_NAV_PATTERNS);
}

export function inferNavPathFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const normalized = normalizeViText(text);

  for (const rule of NAV_INTENT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text) || pattern.test(normalized))) {
      return rule.path;
    }
  }

  const navAsciiKeywords = [
    { path: '/profile?tab=vouchers', keywords: ['voucher cua toi', 'voucher da luu'] },
    { path: '/profile?tab=wallet', keywords: ['vi cinesmart', 'vi cua toi'] },
    { path: '/booking-history', keywords: ['lich su dat ve', 'lich su dat hang', 've da mua', 've cua toi', 'don da dat'] },
    { path: '/transaction-history', keywords: ['lich su giao dich'] },
    { path: '/orders', keywords: ['don hang'] },
    { path: '/library', keywords: ['thu vien'] },
    { path: '/food-drinks', keywords: ['do an nuoc uong', 'bap nuoc', 'do an', 'nuoc uong'] },
    { path: '/schedule', keywords: ['lich chieu', 'suat chieu'] },
    { path: '/book-ticket', keywords: ['dat ve'] },
    { path: '/cinemas', keywords: ['danh sach rap', 'cac rap'] },
    { path: '/events', keywords: ['voucher', 'khuyen mai', 'uu dai', 'su kien'] },
    { path: '/profile', keywords: ['tai khoan', 'ho so'] },
  ];

  for (const item of navAsciiKeywords) {
    if (item.keywords.some((keyword) => normalized.includes(keyword))) {
      return item.path;
    }
  }

  return null;
}

function extractMovieTitleHint(text) {
  if (!text) {
    return null;
  }

  const quoted = text.match(/['"]([^'"]{2,120})['"]/);
  if (quoted) {
    return quoted[1].trim();
  }

  const opened = text.match(/trang phim\s+(.+?)(?:\s+cho bạn|\s+cho ban|\s+rồi|\s+roi|\s+nhé|\s+nhe|\.|$)/i);
  if (opened) {
    return opened[1].replace(/^['"]|['"]$/g, '').trim();
  }

  const named = text.match(/(?:mở|mo|vào|vao|xem)\s+(?:trang\s+)?phim\s+(.+?)(?:\s+cho|\s+nhé|\s+nhe|\.|$)/i);
  if (named) {
    return named[1].trim();
  }

  return null;
}

async function inferMoviePathFromTexts(texts) {
  const combined = texts.filter(Boolean).join(' ');
  const titleHint = extractMovieTitleHint(combined);
  if (!titleHint) {
    return null;
  }

  const normalizedHint = normalizeViText(titleHint);
  try {
    const [nowShowingRes, comingSoonRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/public/movies/now-showing`, { timeout: 10_000 }),
      axios.get(`${API_BASE_URL}/public/movies/coming-soon`, { timeout: 10_000 }),
    ]);

    const unwrap = (res) => res.data?.data ?? res.data ?? [];
    const movies = [...unwrap(nowShowingRes), ...unwrap(comingSoonRes)];

    const found = movies.find((movie) => {
      const title = normalizeViText(movie.title || movie.name || '');
      return (
        title.includes(normalizedHint)
        || normalizedHint.includes(title)
        || title.replace(/\s+/g, '').includes(normalizedHint.replace(/\s+/g, ''))
      );
    });

    const movieId = found?.movieId ?? found?.id;
    return movieId != null ? `/movie/${movieId}` : null;
  } catch (error) {
    console.warn('[Popcorn Bot] movie lookup failed:', error?.message);
    return null;
  }
}

function isSameAppPath(targetPath, currentPath) {
  if (!targetPath || !currentPath) {
    return false;
  }
  const normalizedTarget = normalizeRedirectPath(targetPath);
  const normalizedCurrent = normalizeRedirectPath(currentPath);
  return getRoutePathname(normalizedTarget) === getRoutePathname(normalizedCurrent);
}

/**
 * Chỉ redirect khi USER chủ động yêu cầu (mở trang / có / ok).
 * Bot gợi ý phim hoặc hỏi "bạn muốn mình mở không?" → KHÔNG tự chuyển trang.
 */
export async function resolveChatRedirect({
  reply,
  userMessage,
  action,
  target_url: targetUrl,
  currentPath,
  fromVoice = false,
}) {
  const userWantsNav = userExplicitlyRequestedNavigation(userMessage, { fromVoice });
  if (!userWantsNav) {
    return null;
  }

  if (action === 'REDIRECT' && targetUrl) {
    const path = normalizeRedirectPath(targetUrl);
    if (path && isKnownAppRoute(path) && !isSameAppPath(path, currentPath)) {
      return path;
    }
  }

  const fromLink = extractSingleAppLinkFromText(reply);
  if (fromLink && !isSameAppPath(fromLink, currentPath)) {
    return fromLink;
  }

  const fromUser = inferNavPathFromText(userMessage);
  if (fromUser && !isSameAppPath(fromUser, currentPath)) {
    return fromUser;
  }

  const moviePath = await inferMoviePathFromTexts([userMessage, reply]);
  if (moviePath && !isSameAppPath(moviePath, currentPath)) {
    return moviePath;
  }

  return null;
}

function parseResponseBody(raw) {
  if (raw == null || raw === '') {
    return null;
  }
  if (typeof raw === 'object') {
    return raw;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

async function callN8nDirect(chatMessage, sessionId) {
  const userId = /^\d+$/.test(sessionId) ? Number(sessionId) : sessionId;

  const response = await axios.post(
    N8N_WEBHOOK_URL,
    { userId, chat_message: chatMessage },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: CHAT_REQUEST_TIMEOUT_MS,
      responseType: 'text',
      transformResponse: [(data) => data],
    },
  );

  return parseResponseBody(response.data);
}

async function callBackendChat(chatMessage, sessionId) {
  const userId = /^\d+$/.test(sessionId) ? Number(sessionId) : undefined;

  const response = await axios.post(
    CHAT_API_URL,
    { message: chatMessage, chatMessage: chatMessage, sessionId, userId },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: CHAT_REQUEST_TIMEOUT_MS,
    },
  );

  return response.data?.data ?? response.data;
}

function mapHistoryMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages
    .filter((item) => item?.text && (item.role === 'user' || item.role === 'bot'))
    .map((item) => ({
      id: item.id != null ? String(item.id) : `msg-${item.createdAt}`,
      role: item.role,
      text: String(item.text).trim(),
    }));
}

/** Gộp lịch sử chat guest vào tài khoản sau khi đăng nhập. */
export async function mergeGuestChatSession() {
  const guestSessionId = localStorage.getItem(GUEST_USER_KEY);
  const sessionId = getChatUserId();
  if (!guestSessionId || guestSessionId === sessionId || !guestSessionId.startsWith('guest-')) {
    return;
  }
  if (!/^\d+$/.test(sessionId)) {
    return;
  }

  try {
    await axios.post(
      CHAT_MERGE_URL,
      {
        guestSessionId,
        sessionId,
        userId: Number(sessionId),
      },
      { timeout: 15_000 },
    );
  } catch (error) {
    console.warn('[Popcorn Bot] merge session failed:', error?.message);
  }
}

/** Tải lịch sử chat đã lưu trong DB (đồng bộ với backend). */
export async function fetchChatHistory() {
  const sessionId = getChatUserId();
  try {
    const response = await axios.get(CHAT_HISTORY_URL, {
      params: { sessionId },
      timeout: 15_000,
    });
    const payload = response.data?.data ?? response.data;
    return mapHistoryMessages(payload?.messages);
  } catch (error) {
    console.warn('[Popcorn Bot] load history failed:', error?.message);
    return [];
  }
}

/**
 * Gửi tin nhắn qua backend (lưu DB + gọi n8n). Luôn dùng backend để đồng bộ lịch sử.
 */
export async function sendChatMessage(chatMessage) {
  const trimmed = chatMessage?.trim();
  if (!trimmed) {
    throw new Error('Tin nhắn không được để trống');
  }

  const sessionId = getChatUserId();
  const rawPayload = await callBackendChat(trimmed, sessionId);

  if (import.meta.env.DEV) {
    console.debug('[Popcorn Bot] backend payload:', rawPayload);
  }

  const meta = extractN8nMeta(rawPayload);
  const reply = extractN8nReply(rawPayload) || normalizeReplyText(rawPayload?.reply);
  if (!isValidReply(reply)) {
    console.warn('[Popcorn Bot] reply/output rỗng. Raw:', rawPayload);
    return {
      reply: '',
      action: meta.action,
      target_url: meta.target_url,
      source: rawPayload?.source || 'empty',
    };
  }

  return {
    reply,
    action: meta.action ?? rawPayload?.action ?? null,
    target_url: meta.target_url ?? rawPayload?.target_url ?? null,
    source: rawPayload?.source || 'backend',
  };
}
