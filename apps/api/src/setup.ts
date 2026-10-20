import { openDatabase } from './database';
import { provision, loadKey } from './auth';
import { resolve } from 'node:path';
const path=process.env.DATABASE_PATH??resolve(import.meta.dir,'../../../.local/demo.sqlite');
const db=openDatabase(path);
try {
  loadKey(db,process.env.AUTH_KEY_PATH??resolve(import.meta.dir,'../../../.local/auth.key'));
  const value=provision(db);
  process.stdout.write(`Token local de configuración (uso único, 10 minutos). No compartir ni registrar:\n${value}\nAbre la aplicación local y configura contraseña y autenticador.\n`);
} finally { db.close(); }
