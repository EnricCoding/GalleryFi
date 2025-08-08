// packages/frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Inspirado en la paleta elegante de Apple
        primary: {
          light: '#F5F5F7', // casi blanco con un toque de gris
          DEFAULT: '#E5E5EA', // gris muy suave
          dark: '#A0A0A5', // gris medio clásico
        },
        accent: {
          light: '#D1D7E0', // azul muy pálido
          DEFAULT: '#007AFF', // azul icónico de iOS
          dark: '#0051A8', // azul profundo para estados hover/active
        },
        // Neutros profundos para texto y fondos oscuros
        neutral: {
          50: '#FFFFFF',
          100: '#F2F2F5',
          200: '#E5E5EA',
          300: '#D1D1D6',
          400: '#B1B1B6',
          500: '#8E8E93',
          600: '#6E6E73',
          700: '#4A4A4E',
          800: '#2C2C2E',
          900: '#1C1C1E',
        },
        // Estados de feedback, sutiles y armoniosos
        success: '#34C759', // verde Apple
        warning: '#FFCC00', // amarillo suave
        error: '#FF3B30', // rojo Apple
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
