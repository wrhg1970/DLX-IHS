import { safeLocalStorageSet } from "./storage";

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: 'finance' | 'sales' | 'task' | 'system';
  team?: string;
  leadId?: string | number;
  leadName?: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

const STORAGE_KEY = 'ihs_realtime_notifications_v1';
const EVENT_NAME = 'ihs-realtime-notification';

export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Pleasant two-tone chime (E5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.14, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {
    // AudioContext blocked or not supported - silently ignore
  }
}

export function getStoredNotifications(): RealtimeNotification[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading stored notifications:", e);
  }
  return [];
}

export function dispatchRealtimeNotification(
  notif: Omit<RealtimeNotification, 'id' | 'createdAt' | 'read'>
): RealtimeNotification {
  const newNotif: RealtimeNotification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };

  try {
    const current = getStoredNotifications();
    const updated = [newNotif, ...current].slice(0, 50); // keep last 50
    safeLocalStorageSet(STORAGE_KEY, updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newNotif }));
    }

    playNotificationSound();
  } catch (e) {
    console.error("Error saving/dispatching notification:", e);
  }

  return newNotif;
}

export function markNotificationAsRead(id: string): void {
  try {
    const current = getStoredNotifications();
    const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
    safeLocalStorageSet(STORAGE_KEY, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action: 'update' } }));
    }
  } catch (e) {
    console.error("Error updating notification status:", e);
  }
}

export function markAllNotificationsAsRead(): void {
  try {
    const current = getStoredNotifications();
    const updated = current.map(n => ({ ...n, read: true }));
    safeLocalStorageSet(STORAGE_KEY, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action: 'update' } }));
    }
  } catch (e) {
    console.error("Error clearing notifications:", e);
  }
}

export function clearAllNotifications(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action: 'update' } }));
    }
  } catch (e) {
    console.error("Error clearing notifications:", e);
  }
}
