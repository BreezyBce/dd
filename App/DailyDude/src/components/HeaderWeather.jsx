import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { WiDaySunny, WiNightClear, WiDayCloudy, WiNightAltCloudy, WiCloud, WiCloudy, WiRain, WiNightRain, WiThunderstorm, WiSnow, WiFog } from 'react-icons/wi';

const HeaderWeather = () => {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);

 useEffect(() => {
    const fetchWeather = async () => {
      try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;
        const response = await axios.get('/api/weather', {
          params: { lat: latitude, lon: longitude }
        });
        setWeather(response.data);
      } catch (error) {
        console.error('Error fetching weather data:', error);
        setError('Failed to fetch weather');
      }
    };

    fetchWeather();
  }, []);

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const getWeatherIcon = (weatherCode, icon) => {
    const isNight = icon.includes('n');
    if (weatherCode >= 200 && weatherCode < 300) return <WiThunderstorm size={24} />;
    if (weatherCode >= 300 && weatherCode < 500) return isNight ? <WiNightRain size={24} /> : <WiRain size={24} />;
    if (weatherCode >= 500 && weatherCode < 600) return <WiRain size={24} />;
    if (weatherCode >= 600 && weatherCode < 700) return <WiSnow size={24} />;
    if (weatherCode >= 700 && weatherCode < 800) return <WiFog size={24} />;
    if (weatherCode === 800) return isNight ? <WiNightClear size={24} /> : <WiDaySunny size={24} />;
    if (weatherCode > 800 && weatherCode < 803) return isNight ? <WiNightAltCloudy size={24} /> : <WiDayCloudy size={24} />;
    return <WiCloudy size={24} />;
  };

  if (error) return null;

  if (!weather) return <div>Loading...</div>;

  return (
    <div className="flex items-center text-gray-800 dark:text-gray-400">
      {getWeatherIcon(weather.weather[0].id, weather.weather[0].icon)}
      <span className="ml-2">{Math.round(weather.main.temp)}°C</span>
      <span className="ml-2">{weather.name}</span>
    </div>
  );
};

export default HeaderWeather;
