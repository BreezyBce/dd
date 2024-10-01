import axios from 'axios';

export default async function handler(req, res) {
  const { city, lat, lon } = req.query;

  if (!city && (!lat || !lon)) {
    return res.status(400).json({ error: 'City name or coordinates are required' });
  }

  try {
    let url = 'https://api.openweathermap.org/data/2.5/weather';
    let params = {
      appid: process.env.OPENWEATHERMAP_API_KEY,
      units: 'metric'
    };

    if (city) {
      params.q = city;
    } else {
      params.lat = lat;
      params.lon = lon;
    }

    const response = await axios.get(url, { params });
    res.json(response.data);
  } catch (error) {
    console.error('Weather API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while fetching weather data' });
  }
}
