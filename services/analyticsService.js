/**
 * RIFT — Analytics Service
 * Queue locale + envoi best-effort vers Supabase.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = 'rift-analytics-queue-v1';
const MAX_QUEUE = 500;
const FLUSH_BATCH = 30;

let queue = [];
let loaded = false;
let flushing = false;

function nowIso() {
  return new Date().toISOString();
}

function genEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    queue = raw ? JSON.parse(raw) : [];
  } catch {
    queue = [];
  }
}

async function persistQueue() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // no-op: analytics must never break gameplay
  }
}

export function trackAnalyticsEvent(eventName, payload = {}) {
  // fire-and-forget by design
  void (async () => {
    await ensureLoaded();
    const evt = {
      id: genEventId(),
      event_name: eventName,
      payload,
      created_at: nowIso(),
    };
    queue.push(evt);
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    await persistQueue();
    // opportunistic flush
    if (queue.length >= 10) {
      void flushAnalyticsQueue();
    }
  })();
}

export async function flushAnalyticsQueue() {
  await ensureLoaded();
  if (flushing || queue.length === 0 || !supabase) return;
  flushing = true;

  try {
    const batch = queue.slice(0, FLUSH_BATCH);
    const { error } = await supabase.from('analytics_events').insert(batch);
    if (!error) {
      queue = queue.slice(batch.length);
      await persistQueue();
    }
  } catch {
    // Keep queue for next attempt
  } finally {
    flushing = false;
  }
}
