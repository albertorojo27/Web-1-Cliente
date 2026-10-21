import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Cada ejercicio es una página independiente con su propio index.html
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        menu: 'index.html',
        boton: 'Boton/index.html',
        saludo: 'Saludo/index.html',
        aplausometro: 'Aplausometro/index.html',
        trivial: 'TrivialAcademia/index.html',
      },
    },
  },
})
