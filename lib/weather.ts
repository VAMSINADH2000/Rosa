// Server-side weather fetcher.
// NOAA CDO API is historical/observations only — for actual forecasts we use
// the free api.weather.gov (no token required, just a User-Agent header).
// Default station: KABQ (Albuquerque Sunport), 35.0411 N, 106.6092 W.

const ABQ_LAT = 35.0411;
const ABQ_LON = -106.6092;
const UA = "Rosa/1.0 (Desert Dev Lab hackathon, vamsinadh2000@gmail.com)";

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  shortForecast?: string;
  isDaytime?: boolean;
  probabilityOfPrecipitation?: { value: number | null };
}

export async function fetchAlbuquerqueForecastSummary(
  lang: "es" | "en" = "es",
): Promise<string | null> {
  try {
    const pointRes = await fetch(
      `https://api.weather.gov/points/${ABQ_LAT},${ABQ_LON}`,
      {
        headers: { "User-Agent": UA, Accept: "application/geo+json" },
        next: { revalidate: 3600 },
      },
    );
    if (!pointRes.ok) return null;
    const point = (await pointRes.json()) as {
      properties?: { forecast?: string };
    };
    const forecastUrl = point.properties?.forecast;
    if (!forecastUrl) return null;

    const fcRes = await fetch(forecastUrl, {
      headers: { "User-Agent": UA, Accept: "application/geo+json" },
      next: { revalidate: 3600 },
    });
    if (!fcRes.ok) return null;
    const fc = (await fcRes.json()) as {
      properties?: { periods?: ForecastPeriod[] };
    };
    const periods = fc.properties?.periods?.slice(0, 6) ?? [];
    if (periods.length === 0) return null;

    const lines = periods
      .filter((p) => p.name && p.shortForecast)
      .map((p) => {
        const temp =
          typeof p.temperature === "number"
            ? `${p.temperature}°${p.temperatureUnit ?? "F"}`
            : "";
        const pop = p.probabilityOfPrecipitation?.value;
        const popText =
          typeof pop === "number" && pop >= 20
            ? lang === "en"
              ? `, ${pop}% rain`
              : `, ${pop}% lluvia`
            : "";
        return `${p.name}: ${temp} — ${p.shortForecast}${popText}.`;
      });

    const header =
      lang === "en"
        ? "Forecast for the Albuquerque area (NOAA api.weather.gov)"
        : "Pronóstico para la zona de Albuquerque (NOAA api.weather.gov)";
    return `${header}: ${lines.join(" ")}`;
  } catch {
    return null;
  }
}
