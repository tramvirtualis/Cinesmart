import { MAX_CACHED_SCENES } from '../constants/panoramaConstants';

export class PanoramaCache {
  constructor(maxSize = MAX_CACHED_SCENES) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  has(key) {
    return this.cache.has(key);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
    return entry;
  }

  set(key, entry) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);
  }

  touch(key) {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
  }

  clear() {
    this.cache.forEach((entry) => {
      try {
        entry.scene.destroy();
      } catch {
        // Scene may already be destroyed with viewer
      }
    });
    this.cache.clear();
  }

  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        try {
          entry.scene.destroy();
        } catch {
          // ignore
        }
      }
      this.cache.delete(oldestKey);
    }
  }
}

export const panoramaCache = new PanoramaCache();
