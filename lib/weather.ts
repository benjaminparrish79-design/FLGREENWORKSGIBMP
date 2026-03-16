/**
 * Fetch a 5-day weather forecast from OpenWeatherMap.
 * Returns null gracefully if the API key is not yet configured.
 */
export async function getWeather(lat: number, lon: number): Promise<any | null> {
  const apiKey =
    process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? 'b7fc928ca92a0a919a1180f5171f9cea' ??
    process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'PASTE_YOUR_OPENWEATHER_KEY_HERE') {
    console.warn(
      '[Weather] EXPO_PUBLIC_OPENWEATHER_API_KEY is not set — weather data unavailable.\n' +
      'Get a free key at https://openweathermap.org/api'
    );
    return null;
  }

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch weather data: ${res.statusText}`);
  }

  return res.json();
}

