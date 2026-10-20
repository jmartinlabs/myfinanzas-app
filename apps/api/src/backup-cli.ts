import { openDatabase } from './database';
import { loadKey } from './auth';
import { backup, restore } from './backup';
const [action,...args]=process.argv.slice(2);
try {
  if(action==='create'&&args.length===2) {
    const db=openDatabase(process.env.DATABASE_PATH??'.local/demo.sqlite');
    try {backup(db,loadKey(db,process.env.AUTH_KEY_PATH??'.local/auth.key'),args[0],args[1]);console.log('Copia cifrada completada.');}finally{db.close();}
  }else if(action==='restore'&&(args.length===3||(args.length===4&&args[3]==='--allow-older'))) {
    restore(args[0],args[1],args[2],{allowOlder:args[3]==='--allow-older'});console.log('Restauración aislada completada. Inicia sesión con contraseña y TOTP; guarda los nuevos códigos.');
  }else throw new Error('Uso: bun run backup create DIRECTORIO_NUEVO DESTINATARIO_AGE | restore COPIA DIRECTORIO_NUEVO IDENTIDAD_AGE [--allow-older]');
}catch(e){console.error((e as Error).message);process.exitCode=1;}
