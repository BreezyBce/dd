  import React, { useState, useEffect, useCallback } from 'react';
  import { FaExchangeAlt } from 'react-icons/fa';
  import axios from 'axios';
  import debounce from 'lodash/debounce';

  const Translator = ({ minimized = false }) => {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [fromLanguage, setFromLanguage] = useState('en');
    const [toLanguage, setToLanguage] = useState('es');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = '/api';

    const languages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'bn', name: 'Bengali' },
      { code: 'nl', name: 'Dutch' },
      { code: 'sv', name: 'Swedish' },
      { code: 'fi', name: 'Finnish' },
      { code: 'pl', name: 'Polish' },
      { code: 'tr', name: 'Turkish' },
      { code: 'he', name: 'Hebrew' },
      { code: 'th', name: 'Thai' },
    ];

   const translateText = async (text, from, to) => {
  if (!text.trim()) {
    setOutputText('');
    return;
  }

  setIsLoading(true);
  setError('');
  try {
    console.log('Sending translation request:', { text, from, to });
    const response = await axios.post(`${API_BASE_URL}/translate`, {
      text: text,
      from: from,
      to: to,
    });
    console.log('Translation response:', response.data);
    if (response.data && response.data.translatedText) {
      setOutputText(response.data.translatedText);
    } else {
      throw new Error('Unexpected response structure');
    }
  } catch (error) {
    console.error('Translation error:', error);
    setError(error.response?.data?.error || error.message || 'An unknown error occurred');
    setOutputText('');
  }
  setIsLoading(false);
};

    const debouncedTranslate = useCallback(
      debounce(translateText, 300),
      []
    );

    useEffect(() => {
      debouncedTranslate(inputText, fromLanguage, toLanguage);
    }, [inputText, fromLanguage, toLanguage, debouncedTranslate]);

    const handleInputChange = (e) => {
      setInputText(e.target.value);
    };

    const swapLanguages = () => {
      setFromLanguage(toLanguage);
      setToLanguage(fromLanguage);
      setInputText(outputText);
      setOutputText(inputText);
    };

    if (minimized) {
      return (
        <div>
          <div className="flex mb-2">
            <select
              value={fromLanguage}
              onChange={(e) => setFromLanguage(e.target.value)}
              className="w-1/3 p-2 border rounded-l"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
            <button
              onClick={swapLanguages}
              className="bg-customorange text-white px-2 py-1"
            >
              <FaExchangeAlt />
            </button>
            <select
              value={toLanguage}
              onChange={(e) => setToLanguage(e.target.value)}
              className="w-1/3 p-2 border rounded-r"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          <textarea
            value={inputText}
            onChange={handleInputChange}
            className="w-full p-2 border rounded mb-2"
            placeholder="Enter text to translate"
            rows="3"
          ></textarea>
          {isLoading ? (
            <p>Translating...</p>
          ) : (
            <div className="bg-gray-100 p-2 rounded">
              <p>{outputText}</p>
            </div>
          )}
          {error && (
            <p className="text-red-500 mt-2">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg text-gray-800 dark:text-gray-400 dark:bg-dark-background-2">
        <h2 className="text-2xl font-bold mb-6">Translator</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <select
              value={fromLanguage}
              onChange={(e) => setFromLanguage(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <select
              value={toLanguage}
              onChange={(e) => setToLanguage(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={swapLanguages}
          className="w-full bg-customorange-500 text-white p-2 rounded hover:bg-customorange-400 transition duration-200 flex items-center justify-center mb-4"
        >
          <FaExchangeAlt className="mr-2" /> Swap Languages
        </button>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Enter text</label>
          <textarea
            value={inputText}
            onChange={handleInputChange}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
            placeholder="Type or paste your text here"
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Translation</label>
          <textarea
            value={isLoading ? 'Translating...' : outputText}
            readOnly
            className="w-full p-2 border rounded bg-gray-50 h-32"
            placeholder="Translation will appear here"
          ></textarea>
        </div>
        {error && (
          <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}
      </div>
    );
  };

  export default Translator;
