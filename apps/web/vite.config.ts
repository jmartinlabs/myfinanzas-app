import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// El modo DEMO abre Vite a la red local con VITE_BIND_HOST=0.0.0.0; el resto de
// entornos siguen escuchando solo en loopback.
const host = process.env.VITE_BIND_HOST === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
// El desarrollo normal sigue en 5173 -> 3001. Una ejecución E2E pasa sus
// propios puertos (issue #508); `strictPort` sigue activo para que Vite nunca
// se desplace a otro puerto y desalinee a sus consumidores.
const port = Number(process.env.E2E_WEB_PORT ?? 5173);
const apiPort = Number(process.env.E2E_API_PORT ?? 3001);
export default defineConfig({ plugins: [react()], server: { host, port, strictPort: true, proxy: { '/api': `http://127.0.0.1:${apiPort}` } } });
