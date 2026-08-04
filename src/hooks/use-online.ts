import { useEffect, useState } from "react";

type NativeBridge = {
  isOnline?: () => boolean;
  isNativeApp?: () => boolean;
  sync?: () => void;
};

function bridge(): NativeBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { DCApp?: NativeBridge }).DCApp;
}

function readOnline(): boolean {
  const dc = bridge();
  try {
    if (dc?.isOnline) return dc.isOnline();
  } catch {
    /* fall through to the browser signal */
  }
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/**
 * True when the server is reachable. Inside the Android shell this reads the
 * native connectivity bridge, in a browser it falls back to navigator.onLine.
 * Server render always assumes online so nothing is gated during SSR.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(readOnline());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const id = window.setInterval(update, 4000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.clearInterval(id);
    };
  }, []);

  return online;
}

/** Ask the native shell to re-sync the store now (no-op in the browser). */
export function requestSync() {
  const dc = bridge();
  try {
    if (dc?.sync) dc.sync();
    else if (typeof window !== "undefined") window.location.reload();
  } catch {
    /* ignore */
  }
}
