import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
const APK_DOWNLOAD_URL = 'https://cekiqtkdgjgawxxerjdf.supabase.co/storage/v1/object/public/apks/MAKET.apk';
export default function TelechargerApkBouton({
  children,
  className,
  style,
  onDownloaded
}) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const lancerTelechargement = () => {
    const a = document.createElement('a');
    a.href = APK_DOWNLOAD_URL;
    a.download = 'MAKET.apk';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return <>
      <button type="button" onClick={() => setConfirmVisible(true)} className={className} style={style}>
        {children}
      </button>
      {confirmVisible && <ConfirmDialog title="Télécharger l'app MAKET ?" description="Fichier APK Android (~4,7 Mo) depuis nos serveurs. Android peut demander d'autoriser l'installation depuis une source inconnue au premier lancement — normal pour une app distribuée hors Play Store." confirmLabel="Télécharger" onConfirm={async () => {
      lancerTelechargement();
      setConfirmVisible(false);
      onDownloaded?.();
    }} onCancel={() => setConfirmVisible(false)} />}
    </>;
}
