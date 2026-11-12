import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// El modo DEMO abre Vite a la red local con VITE_BIND_HOST=0.0.0.0; el resto de
// entornos siguen escuchando solo en loopback.
const host = process.env.VITE_BIND_HOST === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
export default defineConfig({ plugins: [react()], server: { host, port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001' } } });
