// src/sessions.ts
import { User } from "./types";

const SESSION_KEY = "iange:session";

export function saveSession(user: User) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("Error saving session", e);
  }
}

export function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch (e) {
    console.error("Error loading session", e);
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error("Error clearing session", e);
  }
}