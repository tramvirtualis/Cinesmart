import * as Marzipano from 'marzipano';
import {
  CENTER_PANORAMA_KEY,
  MANIFEST_URL,
  SCENE_TRANSITION_MS,
  TILES_BASE_URL,
} from '../constants/panoramaConstants';
import { panoramaCache } from './panoramaCache';

let manifestPromise = null;
let sceneIndex = null;

export async function loadPanoramaManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Không thể tải dữ liệu panorama (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        sceneIndex = new Map(data.scenes.map((s) => [s.name, s]));
        return data;
      });
  }
  return manifestPromise;
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
  }

  async init(container) {
    this.manifest = await loadPanoramaManifest();

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

    if (!this.manifest) {
      this.manifest = await loadPanoramaManifest();
    }

    const sceneData = getSceneDataByKey(key);
    if (!sceneData) {
      throw new Error(`Không tìm thấy panorama cho ghế "${key}"`);
    }

    let cached = panoramaCache.get(key);

    if (!cached) {
      const urlPrefix = `${TILES_BASE_URL}/${sceneData.id}`;
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
    // Scene cache is tied to a specific viewer instance — must reset on close
    panoramaCache.clear();
    this.currentKey = null;
  }
}

export const panoramaLoader = new PanoramaLoader();
