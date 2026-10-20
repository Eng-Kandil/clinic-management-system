"use client";

import { useEffect, useState } from "react";

// Shared current-user avatar. The session JWT doesn't carry the avatar, so we
// fetch it once (module-level cache) and share it across the topbar, sidebar,
// and mobile nav. An "avatar:updated" window event (dispatched by the profile
// form) updates every consumer instantly without a reload.

type AvatarValue = string | null;

let cached: AvatarValue | undefined; // undefined = never loaded
let fetching = false;
const listeners = new Set<(v: AvatarValue) => void>();

function broadcast(v: AvatarValue) {
  cached = v;
  listeners.forEach((l) => l(v));
}

async function loadOnce() {
  if (fetching || cached !== undefined) return;
  fetching = true;
  try {
    const res = await fetch("/api/users/me", { cache: "no-store" });
    const json = await res.json();
    broadcast(json?.success ? json.data?.avatar || null : null);
  } catch {
    broadcast(null);
  } finally {
    fetching = false;
  }
}

export function useAvatar(): AvatarValue {
  const [avatar, setAvatar] = useState<AvatarValue>(cached ?? null);

  useEffect(() => {
    listeners.add(setAvatar);
    // First mount triggers the single shared fetch; later consumers initialise
    // from the cache via useState above and stay in sync through broadcasts.
    if (cached === undefined) {
      void loadOnce();
    }
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ avatar?: string }>).detail;
      broadcast(detail?.avatar || null);
    };
    window.addEventListener("avatar:updated", onUpdated);
    return () => {
      listeners.delete(setAvatar);
      window.removeEventListener("avatar:updated", onUpdated);
    };
  }, []);

  return avatar;
}
