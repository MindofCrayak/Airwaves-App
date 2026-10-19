import { ProjectState } from '../types';

const DB_NAME = 'AirwavesStudioDB';
const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const AUDIO_STORE = 'audioBlobs';
const CURRENT_PROJECT_KEY = 'active_project';

let dbPromise: Promise<IDBDatabase> | null = null;

// In-memory fallback if IndexedDB fails or is unavailable
const memoryFallback = {
  project: null as ProjectState | null,
  audio: new Map<string, string>(),
};

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(PROJECT_STORE)) {
          db.createObjectStore(PROJECT_STORE);
        }
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          db.createObjectStore(AUDIO_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    });
  }

  return dbPromise;
}

/**
 * Saves full project state into IndexedDB
 */
export async function saveProject(project: ProjectState): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROJECT_STORE, 'readwrite');
      const store = tx.objectStore(PROJECT_STORE);
      const req = store.put(project, CURRENT_PROJECT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Storage] IndexedDB unavailable, using memory fallback:', err);
    memoryFallback.project = project;
  }
}

/**
 * Loads project state from IndexedDB
 */
export async function loadProject(): Promise<ProjectState | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROJECT_STORE, 'readonly');
      const store = tx.objectStore(PROJECT_STORE);
      const req = store.get(CURRENT_PROJECT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Storage] IndexedDB unavailable, loading from memory/local fallback:', err);
    if (memoryFallback.project) return memoryFallback.project;
    try {
      const local = localStorage.getItem('airwaves_radio_project_v2');
      if (local) return JSON.parse(local);
    } catch {
      // ignore
    }
    return null;
  }
}

/**
 * Clears current project state
 */
export async function clearProject(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROJECT_STORE, 'readwrite');
      const store = tx.objectStore(PROJECT_STORE);
      const req = store.delete(CURRENT_PROJECT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Storage] Failed to delete from IndexedDB:', err);
  } finally {
    memoryFallback.project = null;
    try {
      localStorage.removeItem('airwaves_radio_project_v2');
    } catch {
      // ignore
    }
  }
}

/**
 * Saves rendered audio buffer (base64 string) to IndexedDB audio cache
 */
export async function saveAudioBlob(key: string, audioBase64: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, 'readwrite');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.put(audioBase64, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    memoryFallback.audio.set(key, audioBase64);
  }
}

/**
 * Retrieves cached audio base64 from IndexedDB
 */
export async function getAudioBlob(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return memoryFallback.audio.get(key) || null;
  }
}
