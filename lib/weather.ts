export async function getWeather(lat: number, lon: number) {
  const apiKey = process.env.OPENWEATHER_API_KEY; // Assuming API key is in environment variables
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not defined");
  }
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch weather data: ${res.statusText}`);
  }
  return res.json();
}
