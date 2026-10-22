// Process health only; readiness also requires protected-route and state checks.
try {
  const response = await fetch('http://127.0.0.1:3001/api/health', {signal:AbortSignal.timeout(2000)});
  if (response.status !== 200 || JSON.stringify(await response.json()) !== '{"ok":true}') process.exit(1);
} catch { process.exit(1); }
