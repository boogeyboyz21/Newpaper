import React from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, CloudDrizzle } from "lucide-react";

export function WeatherIcon({ code, size = 28 }) {
  const cls = "text-navy";
  if (code === 0 || code === 1)
    return <Sun size={size} className={`${cls} animate-pulse-sun`} style={{ color: "#E8A33D" }} />;
  if (code === 2 || code === 3) return <Cloud size={size} className={cls} />;
  if ([45, 48].includes(code)) return <CloudFog size={size} className={cls} />;
  if ([51, 53, 55].includes(code)) return <CloudDrizzle size={size} className={cls} />;
  if ([61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain size={size} className={cls} />;
  if ([71, 73, 75].includes(code)) return <CloudSnow size={size} className={cls} />;
  if ([95, 96, 99].includes(code)) return <CloudLightning size={size} style={{ color: "var(--crimson)" }} />;
  return <Cloud size={size} className={cls} />;
}

export const AQI_COLORS = {
  green: "#2E7D32",
  yellow: "#F9A825",
  orange: "#EF6C00",
  red: "#C62828",
  gray: "#757575",
};
