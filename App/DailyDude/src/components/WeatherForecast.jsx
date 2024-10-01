import React, { useState, useEffect } from 'react';
import axios from 'axios';
import withSubscription from '../withSubscription';

const WeatherForecast = () => {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = '/api';

  const fetchWeather = async (lat, lon) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/weather`, {
        params: { lat, lon }
      });
      setWeather(response.data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeatherByCity = async (city) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/weather`, {
        params: { city }
      });
      setWeather(response.data);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data. Please try again.');
    } finally {
      setIsLoading(false);
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

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    if (location.trim()) {
      fetchWeatherByCity(location.trim());
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg max-w-md mx-auto text-gray-800 dark:text-gray-400 dark:bg-dark-background-2">
      <h2 className="text-2xl font-bold mb-4 text-center">Weather Forecast</h2>
      <form onSubmit={handleLocationSubmit} className="mb-4">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter city name"
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="mt-2 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
          Get Weather
        </button>
      </form>
      {isLoading && <p className="text-center">Loading...</p>}
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
