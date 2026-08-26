import { useEffect } from 'react';
const DEFAULT_TITLE = 'MAKET — Achète. Vends. En confiance.';
const DEFAULT_DESCRIPTION = "MAKET - Le marketplace d'occasion de confiance au Cameroun. Achetez et vendez en toute sécurité, partout au Cameroun.";
export function useDocumentMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | MAKET` : DEFAULT_TITLE;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description || DEFAULT_DESCRIPTION);
    return () => {
      document.title = DEFAULT_TITLE;
      meta.setAttribute('content', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
