import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cities = require('cities.json');

// ... rest of your server code
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;


//OPEN WEATHER API
app.get('/api/weather', async (req, res) => {
  try {
    const { location } = req.query;
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`);
    res.json(response.data);
  } catch (error) {
    console.error('Weather API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while fetching weather data' });
  }
});


// Weather header endpoint (update to handle lat/lon)
app.get('/api/weather', async (req, res) => {
  try {
    const { location, lat, lon } = req.query;
    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Weather API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while fetching weather data' });
  }
});

// City suggestions endpoint
app.get('/api/city-suggestions', (req, res) => {
  const { query } = req.query;
  const suggestions = cities
    .filter(city => city.name.toLowerCase().startsWith(query.toLowerCase()))
    .map(city => `${city.name}, ${city.country}`)
    .slice(0, 5);
  res.json(suggestions);
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// API routes
app.post('/api/translate', async (req, res) => {
  try {
    const { text, from, to } = req.body;
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
      {
        q: text,
        source: from,
        target: to,
        format: 'text'
      }
    );
    res.json({ translatedText: response.data.data.translations[0].translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'An error occurred during translation' });
  }
});

app.get('/api/exchange-rate', async (req, res) => {
  try {
    const { from, to } = req.query;
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`);
    res.json({ conversionRate: response.data.conversion_rate });
  } catch (error) {
    console.error('Exchange rate error:', error);
    res.status(500).json({ error: 'An error occurred while fetching the exchange rate' });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));