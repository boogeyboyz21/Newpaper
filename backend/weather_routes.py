import asyncio
import requests
from fastapi import APIRouter, Request
from typing import Optional
from database import get_settings

router = APIRouter(prefix="/api/weather", tags=["weather"])


def _ow_code(owid):
    if owid == 800:
        return 0
    if owid in (801, 802):
        return 2
    if owid in (803, 804):
        return 3
    if 700 <= owid < 800:
        return 45
    if 300 <= owid < 400:
        return 51
    if 500 <= owid < 600:
        return 61
    if 600 <= owid < 700:
        return 71
    if 200 <= owid < 300:
        return 95
    return 2

WMO = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
    75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm",
}
SEVERE_CODES = {65, 75, 82, 95, 96, 99}


def _get(url, params, timeout=6):
    return requests.get(url, params=params, timeout=timeout).json()


def aqi_category(aqi):
    if aqi is None:
        return "Unknown", "gray"
    if aqi <= 50:
        return "Good", "green"
    if aqi <= 100:
        return "Moderate", "yellow"
    if aqi <= 150:
        return "Unhealthy (Sensitive)", "orange"
    return "Unhealthy", "red"


def _fallback(lat, lon):
    """Deterministic synthetic weather when the free API is rate-limited."""
    import datetime as _dt
    base_temp = round(30 - abs(lat) * 0.35)
    codes = [2, 1, 61, 3, 0]
    today = _dt.date.today()
    days = []
    for i in range(5):
        code = codes[i % len(codes)]
        days.append({
            "date": (today + _dt.timedelta(days=i)).isoformat(),
            "code": code, "condition": WMO.get(code, "Unknown"),
            "max": base_temp + 3 - i % 3, "min": base_temp - 4 - i % 2,
        })
    return {"current": {"temperature_2m": base_temp, "apparent_temperature": base_temp + 1,
                        "relative_humidity_2m": 68, "wind_speed_10m": 12, "weather_code": 2},
            "daily": days, "fallback": True}


async def fetch_weather(lat, lon, city):
    settings = await get_settings()
    ow_key = settings.get("openweather_key", "").strip()
    fallback = False
    cur, days = None, None

    if ow_key:
        try:
            c = await asyncio.to_thread(_get, "https://api.openweathermap.org/data/2.5/weather",
                                        {"lat": lat, "lon": lon, "appid": ow_key, "units": "metric"})
            fc = await asyncio.to_thread(_get, "https://api.openweathermap.org/data/2.5/forecast",
                                         {"lat": lat, "lon": lon, "appid": ow_key, "units": "metric"})
            if str(c.get("cod")) == "200":
                w0 = (c.get("weather") or [{}])[0]
                cur = {"temperature_2m": c["main"]["temp"], "apparent_temperature": c["main"].get("feels_like", c["main"]["temp"]),
                       "relative_humidity_2m": c["main"].get("humidity"), "wind_speed_10m": round((c.get("wind", {}).get("speed", 0)) * 3.6),
                       "weather_code": _ow_code(w0.get("id", 800))}
                by_day = {}
                for item in fc.get("list", []):
                    d = item["dt_txt"][:10]
                    by_day.setdefault(d, []).append(item)
                days = []
                for d, items in list(by_day.items())[:5]:
                    temps = [i["main"]["temp"] for i in items]
                    mid = items[len(items) // 2]
                    code = _ow_code((mid.get("weather") or [{}])[0].get("id", 800))
                    days.append({"date": d, "code": code, "condition": WMO.get(code, "Unknown"),
                                 "max": round(max(temps)), "min": round(min(temps))})
        except Exception:
            cur, days = None, None

    if cur is None:
        forecast = await asyncio.to_thread(_get, "https://api.open-meteo.com/v1/forecast", {
            "latitude": lat, "longitude": lon,
            "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min",
            "timezone": "auto", "forecast_days": 5,
        })
        if forecast.get("error") or not forecast.get("current"):
            fb = _fallback(lat, lon)
            cur, days, fallback = fb["current"], fb["daily"], True
        else:
            cur = forecast.get("current", {})
            daily = forecast.get("daily", {})
            days = []
            for i in range(len(daily.get("time", []))):
                code = daily["weather_code"][i]
                days.append({"date": daily["time"][i], "code": code, "condition": WMO.get(code, "Unknown"),
                             "max": round(daily["temperature_2m_max"][i]), "min": round(daily["temperature_2m_min"][i])})

    air = await asyncio.to_thread(_get, "https://air-quality-api.open-meteo.com/v1/air-quality", {
        "latitude": lat, "longitude": lon, "current": "us_aqi,pm2_5,pm10",
    })
    acur = air.get("current", {}) if not air.get("error") else {}
    aqi = acur.get("us_aqi")
    label, color = aqi_category(aqi)
    code = cur.get("weather_code", 0)
    severe = code in SEVERE_CODES
    return {
        "city": city,
        "lat": lat, "lon": lon,
        "temp": round(cur.get("temperature_2m", 0)),
        "feels_like": round(cur.get("apparent_temperature", 0)),
        "humidity": cur.get("relative_humidity_2m"),
        "wind": cur.get("wind_speed_10m"),
        "code": code,
        "condition": WMO.get(code, "Unknown"),
        "severe": severe,
        "forecast": days,
        "fallback": fallback,
        "aqi": {"value": aqi, "category": label, "color": color,
                "pm2_5": acur.get("pm2_5"), "pm10": acur.get("pm10")},
        "alert": ("Severe weather: " + WMO.get(code, "Warning")) if severe else (
            f"Hazardous air quality (AQI {aqi})" if (aqi and aqi > 150) else None),
    }


@router.get("")
async def weather(city: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None):
    if lat is not None and lon is not None:
        return await fetch_weather(lat, lon, city or "Your Location")
    if city:
        geo = await asyncio.to_thread(_get, "https://geocoding-api.open-meteo.com/v1/search",
                                      {"name": city, "count": 1})
        results = geo.get("results")
        if results:
            r = results[0]
            return await fetch_weather(r["latitude"], r["longitude"], r["name"])
    return await fetch_weather(22.5726, 88.3639, "Kolkata")


@router.get("/ip")
async def weather_by_ip(request: Request):
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
        request.client.host if request.client else "")
    try:
        if ip and not ip.startswith(("127.", "10.", "192.168.", "172.")):
            loc = await asyncio.to_thread(_get, f"http://ip-api.com/json/{ip}",
                                          {"fields": "status,city,lat,lon"}, 3)
            if loc.get("status") == "success":
                return await fetch_weather(loc["lat"], loc["lon"], loc["city"])
    except Exception:
        pass
    return await fetch_weather(22.5726, 88.3639, "Kolkata")
