const axios = require('axios');
const { WEATHER_API_KEY, WEATHER_ENABLED } = require('../config');

async function getWeather(city) {
  if (!WEATHER_ENABLED) {
    const err = new Error('Fitur cuaca belum aktif. Isi WEATHER_API_KEY di .env.');
    err.code = 'WEATHER_DISABLED';
    throw err;
  }

  let res;
  try {
    res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { q: city, appid: WEATHER_API_KEY, units: 'metric', lang: 'id' },
      timeout: 9000,
    });
  } catch (e) {
    if (e.response && e.response.status === 404) {
      const err = new Error(`Kota "${city}" tidak ditemukan. Tulis nama kota dengan benar.`);
      err.code = 'WEATHER_NOTFOUND';
      throw err;
    }
    const err = new Error('Gagal mengambil data cuaca. Coba beberapa saat lagi.');
    err.code = 'WEATHER_ERROR';
    throw err;
  }

  const d = res.data;
  const desc = d.weather?.[0]?.description || '-';
  const temp = d.main?.temp;
  const feels = d.main?.feels_like;
  const hum = d.main?.humidity;
  const wind = d.wind?.speed;
  return (
    `🌤 *Cuaca ${d.name}*\n` +
    `${desc}\n` +
    `🌡 Suhu: ${temp}°C (terasa ${feels}°C)\n` +
    `💧 Kelembapan: ${hum}%\n` +
    `🌬 Angin: ${wind} m/s`
  );
}

module.exports = { getWeather };
