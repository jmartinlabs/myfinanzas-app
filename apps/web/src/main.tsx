import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type Saldo = { id: string; nombre: string };
function App() {
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    fetch('/api/saldos', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('HTTP error');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('saldos' in data) || !Array.isArray(data.saldos) ||
          !data.saldos.every((s) => s && typeof s.id === 'string' && typeof s.nombre === 'string')) throw new Error('Invalid catalog');
        setSaldos(data.saldos); setState('ready');
      }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [attempt]);
  return <div className="shell">
    <header><a className="brand" href="/">MyFinanzas<span>APP</span></a><span className="badge">Entorno local</span></header>
    <main><p className="eyebrow">PRIMER PASO · BOOTSTRAP</p><h1>Tu catálogo de Saldos</h1>
      <p className="intro">Una base sencilla para comenzar. Este catálogo demuestra la conexión entre la interfaz, la API y SQLite.</p>
      <aside><strong>Solo datos ficticios</strong><p>Sin importes, cálculos ni información financiera personal.</p></aside>
      <section aria-labelledby="catalog-title"><div className="section-heading"><h2 id="catalog-title">Saldos de demostración</h2>{state === 'ready' && <span>{saldos.length} registros</span>}</div>
        {state === 'loading' && <p role="status">Cargando catálogo…</p>}
        {state === 'error' && <div role="alert"><p>No se pudo cargar el catálogo. Comprueba que la API está en marcha.</p><button onClick={() => setAttempt(attempt + 1)}>Reintentar</button></div>}
        {state === 'ready' && (saldos.length === 0 ? <p role="status">Todavía no hay Saldos de demostración.</p> : <ul>{saldos.map((s, i) => <li key={s.id}><span className="number" aria-hidden="true">0{i + 1}</span><div><h3>{s.nombre}</h3><p>Identificador de prueba · {s.id}</p></div><span className="fiction">Ficticio</span></li>)}</ul>)}
      </section>
      <footer>React <span>→</span> Effect HTTP <span>→</span> SQLite<p>Walking skeleton · Lectura de catálogo</p></footer>
    </main></div>;
}
createRoot(document.getElementById('root')!).render(<App />);
