import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("ew_push_dismissed")) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    const t = setTimeout(() => setShow(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }
      const { data } = await api.get("/push/vapid-public-key");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.public_key),
      });
      await api.post("/push/subscribe", JSON.parse(JSON.stringify(sub)));
      toast.success("Push notifications enabled");
    } catch (e) {
      toast.error("Could not enable notifications");
    } finally {
      setShow(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem("ew_push_dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      data-testid="push-prompt"
      className="fixed top-0 inset-x-0 z-[60] surface border-b-2 border-ink slide-down"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <Bell size={18} className="text-navy" />
        <p className="text-sm font-body flex-1">
          Get instant breaking-news alerts delivered to your browser.
        </p>
        <button
          data-testid="enable-push-btn"
          onClick={enable}
          className="bg-navy text-white text-xs font-bold uppercase tracking-wider px-4 py-2"
        >
          Allow
        </button>
        <button data-testid="dismiss-push-btn" onClick={dismiss} className="p-1">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
