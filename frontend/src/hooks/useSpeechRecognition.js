import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export function useSpeechRecognition({ lang = 'vi-VN' } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => Boolean(SpeechRecognitionCtor));
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognitionCtor) {
      return undefined;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        setError('Không nghe thấy giọng nói, thử lại nhé.');
      } else if (event.error === 'not-allowed') {
        setError('Vui lòng cho phép truy cập micro trong trình duyệt.');
      } else if (event.error !== 'aborted') {
        setError('Không thể dùng nhận diện giọng nói.');
      }
    };

    recognition.onresult = (event) => {
      let transcript = '';
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }

      onResultRef.current?.(transcript.trim(), isFinal);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  const setOnResult = useCallback((handler) => {
    onResultRef.current = handler;
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    setError(null);
    try {
      recognitionRef.current.start();
    } catch {
      recognitionRef.current.stop();
      window.setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch {
          setError('Micro đang bận, thử lại sau giây lát.');
        }
      }, 200);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isListening,
    isSupported,
    error,
    start,
    stop,
    toggle,
    clearError,
    setOnResult,
  };
}
