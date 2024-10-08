import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSubscription } from '../SubscriptionContext';
import withSubscription from '../withSubscription';
import UpgradeButton from './UpgradeButton'; // Import the UpgradeButton component


const CurrencyConverter = () => {
  const [amount, setAmount] = useState(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [convertedAmount, setConvertedAmount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscriptionStatus } = useSubscription();
  

  const API_BASE_URL = '/api';

  useEffect(() => {
    fetchExchangeRate();
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    if (exchangeRate !== null) {
      setConvertedAmount((amount * exchangeRate).toFixed(2));
    }
  }, [amount, exchangeRate]);

const fetchExchangeRate = async () => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await axios.get(`/api/exchange-rate`, {
      params: { from: fromCurrency, to: toCurrency }
    });
    if (response.data && response.data.conversionRate) {
      setExchangeRate(response.data.conversionRate);
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error.response ? error.response.data : error.message);
    setError('Failed to fetch exchange rate. Please try again later.');
  }
  setIsLoading(false);
};

  const currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD',
    'SEK', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL'
  ];

  const handleAmountChange = (e) => setAmount(e.target.value);
  const handleFromCurrencyChange = (e) => setFromCurrency(e.target.value);
  const handleToCurrencyChange = (e) => setToCurrency(e.target.value);
  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg dark:bg-dark-background-2 text-gray-800 dark:text-gray-400">
        <h2 className="text-2xl font-bold mb-6">Currency Converter</h2>
        <p className="text-center mb-4">This feature is only available for premium users.</p>
        <div className="flex justify-center">
          <UpgradeButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg dark:bg-dark-background-2 text-gray-800 dark:text-gray-400">
      <h2 className="text-2xl font-bold mb-6">Currency Converter</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Amount</label>
        <input
          type="number"
          value={amount}
          onChange={handleAmountChange}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <select
            value={fromCurrency}
            onChange={handleFromCurrencyChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <select
            value={toCurrency}
            onChange={handleToCurrencyChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={swapCurrencies}
        className="w-full bg-customorange-500 text-white p-2 rounded hover:bg-customorange-400 transition duration-200 mb-4"
      >
        Swap Currencies
      </button>
      {isLoading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}
      {!isLoading && !error && exchangeRate && (
        <div className="bg-gray-100 p-4 rounded dark:bg-gray-700">
          <p className="text-lg font-semibold">
            {amount} {fromCurrency} =
          </p>
          <p className="text-2xl font-bold text-customblue-500">
            {convertedAmount} {toCurrency}
          </p>
          <p className="text-sm mt-2">
            1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
          </p>
        </div>
      )}
    </div>
  );
};

export default withSubscription(CurrencyConverter, 'premium');
