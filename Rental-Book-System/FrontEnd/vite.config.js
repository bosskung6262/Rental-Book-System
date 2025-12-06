import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8888',
          changeOrigin: true,
          // ถ้า backend ไม่อยากให้ prefix /api ก็ uncomment บรรทัดล่าง
          // rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
    // ถ้าต้องการ base path เวลา deploy ใต้ sub-folder ให้ตั้งตรงนี้
    // base: '/',
  }
})
