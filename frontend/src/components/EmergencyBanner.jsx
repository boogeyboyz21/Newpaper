import React, { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { api } from "../lib/api";

export default function EmergencyBanner() {
  const [alert, setAlert] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("ew_alert_dismissed") === "1"
  );

  useEffect(() => {
    let cancelled = false;
    api
      .get("/weather/ip")
      .then(({ data }) => {
        if (cancelled) return;
        const aqi = data?.aqi?.value;
        if (data?.severe || (aqi && aqi > 150)) {
          setAlert(
            data.alert ||
              `${data.aqi.category} air quality (AQI ${aqi}) in ${data.city}`
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!alert || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem("ew_alert_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div
      data-testid="emergency-banner"
      className="w-full text-white font-body slide-down"
      style={{ backgroundColor: "var(--alert)" }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <AlertTriangle size={18} className="shrink-0" />
        <p className="text-sm font-semibold flex-1">
          CRITICAL ALERT: {alert}. Click for emergency guidelines.
        </p>
        <button
          data-testid="dismiss-emergency-banner"
          onClick={dismiss}
          className="p-1 hover:bg-white/20 rounded-sm"
          aria-label="Dismiss alert"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
