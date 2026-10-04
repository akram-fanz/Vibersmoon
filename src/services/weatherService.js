import axios from 'axios';
import { config } from '../core/config.js';

export async function getWeather(city) {
  if (!config.weatherApiKey) {
    throw Object.assign(new Error('Fitur cuaca belum aktif. Isi WEATHER_API_KEY di .env.'), { code: 'USER_ERROR' });
  }
  let res;
  try {
    res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { q: city, appid: config.weatherApiKey, units: 'metric', lang: 'id' },
      timeout: 9000,
    });
  } catch (e) {
    if (e.response?.status === 404) {
      throw Object.assign(new Error(`Kota "${city}" tidak ditemukan. Tulis nama kota dengan benar.`), { code: 'USER_ERROR' });
    }
    throw Object.assign(new Error('Gagal mengambil data cuaca. Coba beberapa saat lagi.'), { code: 'WEATHER_ERROR' });
  }
  const d = res.data;
  return (
    `🌤 Cuaca ${d.name}\n` +
    `${d.weather?.[0]?.description || '-'}\n` +
    `🌡 Suhu: ${d.main?.temp}°C (terasa ${d.main?.feels_like}°C)\n` +
    `💧 Kelembapan: ${d.main?.humidity}%\n` +
    `🌬 Angin: ${d.wind?.speed} m/s`
  );
}

export default { getWeather };
