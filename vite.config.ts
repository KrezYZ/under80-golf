import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  // Keep the existing project site working while also supporting the
  // organization site at https://under80golf.github.io/.
  base: process.env.GITHUB_REPOSITORY?.endsWith('/under80golf.github.io') ? '/' : '/under80-golf/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
