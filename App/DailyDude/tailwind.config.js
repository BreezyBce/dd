module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        'primary': '#02afbd',
        'secondary': '#fa7c30',
        'background': '#f0f0f0',
        'card': '#ffffff',
        'text': '#333333',
        'customblue': {
          300: '#86d9df',
          400: '#35bfca',
          500: '#02afbd', 
          600: '#0abcc7',
        },
        'customorange': {
          400: '#f9a54f',
          500: '#fa7c30',
          600: '#f97b2c',
        },
        // Dark mode colors
        'dark-primary': '#01808a',
        'dark-secondary': '#c85f24',
        'dark-background': '#111827',
        'dark-background-2': '#1F2937',
        'dark-background-3': '#1F2937',
        'dark-card': '#2c2c2c',
        'dark-text': '#e0e0e0',
        
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['dark'],
      textColor: ['dark'],
      borderColor: ['dark'],
    },
  },
  plugins: [],
}