import { useCallback, useEffect, useRef, useState } from 'react';
import { CENTER_PANORAMA_KEY } from '../constants/panoramaConstants';
import { panoramaLoader } from '../services/panoramaLoader';

export function usePanorama({ previewSeatId, enabled }) {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [currentLabel, setCurrentLabel] = useState(CENTER_PANORAMA_KEY);
  const initializedRef = useRef(false);
  const lastLoadedKeyRef = useRef(null);

  const loadScene = useCallback(async (key, resetView = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const sceneData = await panoramaLoader.switchTo(key, { resetView });
      setCurrentLabel(sceneData.name);
      lastLoadedKeyRef.current = key;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải panorama');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initViewer = useCallback(async () => {
    if (!containerRef.current || initializedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      await panoramaLoader.init(containerRef.current);
      initializedRef.current = true;
      setIsReady(true);
      const initialKey = previewSeatId || CENTER_PANORAMA_KEY;
      await loadScene(initialKey, initialKey === CENTER_PANORAMA_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể khởi tạo viewer');
      initializedRef.current = false;
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  }, [loadScene, previewSeatId]);

  const goToCenter = useCallback(async () => {
    await loadScene(CENTER_PANORAMA_KEY, true);
  }, [loadScene]);

  const retry = useCallback(() => {
    panoramaLoader.destroy();
    initializedRef.current = false;
    setIsReady(false);
    lastLoadedKeyRef.current = null;
    setError(null);
    initViewer();
  }, [initViewer]);

  useEffect(() => {
    if (!enabled) return;
    initViewer();
  }, [enabled, initViewer]);

  useEffect(() => {
    if (!enabled || !isReady) return;
    if (lastLoadedKeyRef.current === previewSeatId) return;

    const resetView = previewSeatId === CENTER_PANORAMA_KEY;
    loadScene(previewSeatId, resetView);
  }, [previewSeatId, enabled, isReady, loadScene]);

  // Cleanup when modal closes or component unmounts
  useEffect(() => {
    if (!enabled) {
      panoramaLoader.destroy();
      initializedRef.current = false;
      setIsReady(false);
      lastLoadedKeyRef.current = null;
      setCurrentLabel(CENTER_PANORAMA_KEY);
      setError(null);
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      panoramaLoader.destroy();
      initializedRef.current = false;
    };
  }, []);

  return {
    containerRef,
    isLoading,
    isReady,
    error,
    currentLabel,
    goToCenter,
    retry,
  };
}
