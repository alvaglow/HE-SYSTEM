// services/offline.js — Offline attendance queue with jitter retry (up to 24 hours)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import api from './api';

const QUEUE_KEY = 'hp_offline_queue';

// Add an item to the offline queue
export const enqueueAttendance = async (item) => {
  const queue = await getQueue();
  const entry = {
    ...item,
    offlineQueueId: uuidv4(),
    capturedAt: Date.now(),
    retryCount: 0,
    nextRetryAt: Date.now(), // Retry immediately when online
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry.offlineQueueId;
};

const getQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

// Flush queue to server when connectivity restored
export const flushQueue = async () => {
  const queue = await getQueue();
  if (queue.length === 0) return;

  // Filter: only items < 24 hours old and due for retry
  const now = Date.now();
  const ready = queue.filter(
    item => item.capturedAt > now - 86400000 && item.nextRetryAt <= now
  );
  if (ready.length === 0) return;

  try {
    const res = await api.post('/attendance/flush-offline', { queue: ready });
    const results = res.data.results;

    // Update queue: remove successes, update retry times for failures
    const updated = queue.map(item => {
      const result = results.find(r => r.queueId === item.offlineQueueId);
      if (!result) return item;
      if (['success', 'duplicate', 'expired'].includes(result.status)) return null; // remove
      // Exponential backoff with jitter: 1m * 2^retries + random 0-30s
      const baseDelay = 60000 * Math.pow(2, item.retryCount);
      const jitter    = Math.random() * 30000;
      return {
        ...item,
        retryCount: item.retryCount + 1,
        nextRetryAt: now + Math.min(baseDelay + jitter, 3600000), // Max 1 hour between retries
        lastError: result.message,
      };
    }).filter(Boolean);

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
    return results;
  } catch (err) {
    // Network still offline — leave queue unchanged
    console.warn('[Offline] Flush failed:', err.message);
  }
};

// Get queue size for UI badge
export const getQueueSize = async () => {
  const queue = await getQueue();
  return queue.filter(item => item.capturedAt > Date.now() - 86400000).length;
};

export default { enqueueAttendance, flushQueue, getQueueSize };
