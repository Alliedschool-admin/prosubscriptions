const ASKED_KEY = "dc_notif_asked_v1";
const ENABLED_KEY = "dc_notif_enabled_v1";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export function hasAskedNotifications() {
  try {
    return localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markAskedNotifications() {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function notificationsEnabled() {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setNotificationsEnabled(on: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  markAskedNotifications();
  try {
    const res = await Notification.requestPermission();
    if (res === "granted") setNotificationsEnabled(true);
    return res;
  } catch {
    return Notification.permission;
  }
}

export function showNotification(title: string, body: string, tag?: string) {
  if (!notificationsEnabled()) return false;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: "/favicon.png?v=4",
      badge: "/favicon.png?v=4",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
