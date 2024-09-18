import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApi } from '../api';
import withSubscription from '../withSubscription';


const WeatherForecast = () => {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { makeApiCall } = useApi();

  const fetchWeather = async (lat, lon) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await makeApiCall(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY}&units=metric`);
      setWeather(data);
    } catch (error) {
      if (error.message === 'This feature requires a premium subscription') {
        setError('This feature is only available to premium users. Please upgrade your account.');
      } else {
        setError('Failed to fetch weather data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeatherByCity = async (city) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: city,
          appid: import.meta.env.VITE_OPENWEATHERMAP_API_KEY,
          units: 'metric'
        }
      });
      setWeather(response.data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCitySuggestions = async (input) => {
    if (input.length < 3) return;
    try {
      const response = await axios.get('https://wft-geo-db.p.rapidapi.com/v1/geo/cities', {
        params: { namePrefix: input, limit: '5' },
        headers: {
          'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
        }
      });
      setSuggestions(response.data.data);
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          fetchWeatherByCity('London'); // Default to London if geolocation fails
        }
      );
    } else {
      fetchWeatherByCity('London'); // Default to London if geolocation is not available
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (location) fetchCitySuggestions(location);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [location]);

  const handleLocationChange = (e) => {
    setLocation(e.target.value);
    setSuggestions([]);
  };

  const handleSuggestionClick = (city) => {
    setLocation(city.name);
    setSuggestions([]);
    fetchWeatherByCity(city.name);
  };

  return (
    <div className="bg-white p-6 rounded-lg max-w-md mx-auto text-gray-800 dark:text-gray-400 dark:bg-dark-background-2">
      <h2 className="text-2xl font-bold mb-4 text-center">Weather Forecast</h2>
      <div className="mb-4 relative">
        <input
          type="text"
          value={location}
          onChange={handleLocationChange}
          placeholder="Enter city name"
          className="w-full p-2 border rounded"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 bg-white border rounded mt-1 w-full">
            {suggestions.map((city) => (
              <li
                key={city.id}
                onClick={() => handleSuggestionClick(city)}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {city.name}, {city.countryCode}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-red-500 text-center">{error}</p>}
      {weather && !error && (
        <div className="text-center">
          <h3 className="text-xl font-semibold">{weather.name}, {weather.sys.country}</h3>
          <p className="text-4xl font-bold my-2">{Math.round(weather.main.temp)}°C</p>
          <p className="capitalize">{weather.weather[0].description}</p>
          <div className="mt-4">
            <p>Humidity: {weather.main.humidity}%</p>
            <p>Wind: {weather.wind.speed} m/s</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default withSubscription(WeatherForecast, 'premium');


