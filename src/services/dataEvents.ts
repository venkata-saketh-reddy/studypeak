const EVENT = 'app:data-changed';

export function notifyDataChanged(): void {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onDataChanged(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
