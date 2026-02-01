export function getErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  const msg = err?.message;
  if (typeof msg === 'string' && msg && msg !== '[object Object]') return msg;
  try {
    return JSON.stringify(err);
  } catch (_) {
    return String(err);
  }
}