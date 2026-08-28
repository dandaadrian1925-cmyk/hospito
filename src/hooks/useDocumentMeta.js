import { useEffect } from 'react';
const DEFAULT_TITLE = 'Hospito — Votre santé, simplifiée.';
const DEFAULT_DESCRIPTION = "Hospito - Prenez rendez-vous, consultez votre dossier médical et échangez avec vos soignants, partout au Cameroun.";
export function useDocumentMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | Hospito` : DEFAULT_TITLE;
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
