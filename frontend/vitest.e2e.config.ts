import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Pruebas de extremo a extremo: requieren el backend corriendo en http://127.0.0.1:8000
// (cd backend && python tests/servidor_e2e.py)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/e2e/**/*.e2e.ts'],
    testTimeout: 60000,
    fileParallelism: false,
  },
})
