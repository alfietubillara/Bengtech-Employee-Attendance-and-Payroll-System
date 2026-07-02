"use client";

const DEVICE_KEY = "bengtech_device_id";

export function getOrCreateDeviceId() {
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getDeviceLabel() {
  const platform = navigator.platform || "Unknown platform";
  const touch = navigator.maxTouchPoints ? "Touch device" : "No touch";
  return `${platform} - ${touch}`;
}
