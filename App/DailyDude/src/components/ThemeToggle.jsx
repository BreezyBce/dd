import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-800 transition-colors duration-400">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 transition-colors duration-400"
      >
        {darkMode ? (
          <Sun className="h-6 w-6 text-yellow-400" />
        ) : (
          <Moon className="h-6 w-6 text-gray-800" />
        )}
      </button>
      <p className="ml-4 text-black dark:text-white">
        {darkMode ? 'Dark Mode' : 'Light Mode'}
      </p>
    </div>
  );
};

export default ThemeToggle;