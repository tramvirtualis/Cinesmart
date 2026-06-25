import * as Marzipano from 'marzipano';
import {
  CENTER_PANORAMA_KEY,
  PANORAMA_BASE_URL_DEFAULT,
  PANORAMA_BASE_URL_DELUXE,
  SCENE_TRANSITION_MS,
} from '../constants/panoramaConstants';
import { panoramaCache } from './panoramaCache';

let sceneIndex = null;
let cachedManifest = { roomType: null, data: null, baseUrl: null };

export function getPanoramaBaseUrl(roomType = '2D') {
  const type = String(roomType || '2D').toUpperCase();
  if (type === 'DELUXE') {
    return PANORAMA_BASE_URL_DELUXE;
  }
  return PANORAMA_BASE_URL_DEFAULT;
}

async function fetchPanoramaData(baseUrl) {
  const response = await fetch(`${baseUrl}/data.js`);
  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu panorama (${response.status})`);
  }

  const text = await response.text();
  const jsonText = text
    .replace(/^\s*var\s+APP_DATA\s*=\s*/, '')
    .replace(/;\s*$/, '');

  return JSON.parse(jsonText);
}

export async function loadPanoramaManifest(roomType = '2D') {
  const normalizedType = String(roomType || '2D').toUpperCase();
  const baseUrl = getPanoramaBaseUrl(normalizedType);

  if (cachedManifest.roomType === normalizedType && cachedManifest.data) {
    sceneIndex = new Map(cachedManifest.data.scenes.map((s) => [s.name, s]));
    return { data: cachedManifest.data, baseUrl: cachedManifest.baseUrl };
  }

  const data = await fetchPanoramaData(baseUrl);
  cachedManifest = { roomType: normalizedType, data, baseUrl };
  sceneIndex = new Map(data.scenes.map((s) => [s.name, s]));
  return { data, baseUrl };
}

export function getSceneDataByKey(key) {
  if (!sceneIndex) return null;
  return sceneIndex.get(key) ?? null;
}

export function hasPanoramaForSeat(seatId) {
  if (!sceneIndex) return false;
  return sceneIndex.has(seatId);
}

export class PanoramaLoader {
  constructor() {
    this.viewer = null;
    this.currentKey = null;
    this.manifest = null;
    this.baseUrl = null;
    this.roomType = null;
  }

  async init(container, roomType) {
    const normalizedType = String(roomType || '2D').toUpperCase();
    const { data, baseUrl } = await loadPanoramaManifest(normalizedType);
    this.manifest = data;
    this.baseUrl = baseUrl;
    this.roomType = normalizedType;

    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
    panoramaCache.clear();
    this.currentKey = null;

    this.viewer = new Marzipano.Viewer(container, {
      controls: {
        mouseViewMode: this.manifest.settings.mouseViewMode,
      },
    });
  }

  async switchTo(key, options = {}) {
    const { resetView = false } = options;

    if (!this.viewer) {
      throw new Error('Panorama viewer chưa được khởi tạo');
    }

    const sceneData = getSceneDataByKey(key);
    if (!sceneData) {
      throw new Error(`Không tìm thấy panorama cho ghế "${key}"`);
    }

    let cached = panoramaCache.get(key);

    if (!cached) {
      const urlPrefix = `${this.baseUrl}/tiles/${sceneData.id}`;
      const source = Marzipano.ImageUrlSource.fromString(
        `${urlPrefix}/{z}/{f}/{y}/{x}.jpg`,
        { cubeMapPreviewUrl: `${urlPrefix}/preview.jpg` }
      );
      const geometry = new Marzipano.CubeGeometry(sceneData.levels);
      const limiter = Marzipano.RectilinearView.limit.traditional(
        sceneData.faceSize,
        (100 * Math.PI) / 180,
        (120 * Math.PI) / 180
      );
      const view = new Marzipano.RectilinearView(
        sceneData.initialViewParameters,
        limiter
      );
      const scene = this.viewer.createScene({
        source,
        geometry,
        view,
        pinFirstLevel: true,
      });

      cached = {
        sceneData,
        scene,
        view,
        lastAccessed: Date.now(),
      };
      panoramaCache.set(key, cached);
    } else {
      panoramaCache.touch(key);
    }

    const shouldAnimate = this.currentKey !== null && this.currentKey !== key;
    cached.scene.switchTo({
      transitionDuration: shouldAnimate ? SCENE_TRANSITION_MS : 0,
    });

    if (resetView) {
      cached.view.setParameters(sceneData.initialViewParameters, {
        transitionDuration: shouldAnimate ? SCENE_TRANSITION_MS : 0,
      });
    }

    this.currentKey = key;
    return sceneData;
  }

  async goToCenter() {
    await this.switchTo(CENTER_PANORAMA_KEY, { resetView: true });
  }

  destroy() {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
    panoramaCache.clear();
    this.currentKey = null;
  }
}

export const panoramaLoader = new PanoramaLoader();
