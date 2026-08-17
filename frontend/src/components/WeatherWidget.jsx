import React, { useEffect, useState } from "react";
import { Search, MapPin, Wind, Droplets, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import { WeatherIcon, AQI_COLORS } from "./WeatherIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export default function WeatherWidget() {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (params) => {
    setLoading(true);
    try {
      const res = await api.get("/weather" + (params || "/ip"));
      setData(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await load("/ip");
      if (!active) return;
    })();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => active && load(`?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
        () => {},
        { timeout: 4000 }
      );
    }
    return () => { active = false; };
    // eslint-disable-next-line
  }, []);

  const search = (e) => {
    e.preventDefault();
    if (query.trim()) load(`?city=${encodeURIComponent(query.trim())}`);
  };

  const aqi = data?.aqi;
  const aqiColor = aqi ? AQI_COLORS[aqi.color] || AQI_COLORS.gray : AQI_COLORS.gray;

  return (
    <div data-testid="weather-widget" className="widget">
      <div className="widget-title flex items-center justify-between">
        <span>Weather &amp; Air Quality</span><MapPin size={13} />
      </div>
      <div className="p-4">
        <form onSubmit={search} className="flex mb-4 card-2 pill overflow-hidden">
          <input data-testid="weather-city-input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Change city…" className="flex-1 px-3 py-1.5 text-sm bg-transparent outline-none text-ink" />
          <button data-testid="weather-search-btn" type="submit" className="bg-green text-white px-3 rounded-full m-0.5"><Search size={14} /></button>
        </form>

        {!data ? (
          <p className="text-sm text-ink-soft">{loading ? "Loading local conditions…" : "Weather unavailable."}</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-serif-display text-xl leading-none" data-testid="weather-city">{data.city}</p>
                <p className="text-xs text-ink-soft mt-1">{data.condition}</p>
              </div>
              <div className="flex items-center gap-2">
                <WeatherIcon code={data.code} size={34} />
                <span className="font-serif-display text-3xl" data-testid="weather-temp">{data.temp}°</span>
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-ink-soft">
              <span className="flex items-center gap-1"><Wind size={12} /> {data.wind} km/h</span>
              <span className="flex items-center gap-1"><Droplets size={12} /> {data.humidity}%</span>
              <span>Feels {data.feels_like}°</span>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div data-testid="aqi-indicator" className="mt-4 flex items-center gap-3 border-t border-[var(--line)] pt-3 cursor-help">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: aqiColor }}>
                      {aqi?.value ?? "—"}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-ink-soft">Air Quality Index</p>
                      <p className="font-semibold text-sm" style={{ color: aqiColor }}>{aqi?.category}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent data-testid="aqi-tooltip">
                  <p className="text-xs">PM2.5: {aqi?.pm2_5 ?? "—"} µg/m³</p>
                  <p className="text-xs">PM10: {aqi?.pm10 ?? "—"} µg/m³</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button data-testid="forecast-toggle" onClick={() => setExpanded((e) => !e)}
              className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider text-green border-t border-[var(--line)] pt-3">
              5-Day Forecast
              <ChevronDown size={14} className={expanded ? "rotate-180" : ""} style={{ transition: "transform 0.2s" }} />
            </button>
            {expanded && (
              <div data-testid="forecast-matrix" className="mt-3 space-y-2 fade-up">
                {data.forecast.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft w-14">{new Date(d.date).toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <WeatherIcon code={d.code} size={18} />
                    <span className="flex-1 text-right text-xs text-ink-soft truncate mx-2">{d.condition}</span>
                    <span className="w-16 text-right font-semibold">{d.max}° <span className="text-ink-soft">{d.min}°</span></span>
                  </div>
                ))}
              </div>
            )}
            {data.fallback && <p className="text-[10px] text-ink-soft mt-2 italic">Live feed rate-limited; showing estimated data.</p>}
          </>
        )}
      </div>
    </div>
  );
}
