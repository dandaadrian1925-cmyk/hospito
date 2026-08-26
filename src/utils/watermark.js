// #perf (audit PageSpeed mobile, corrigé) : le canvas gardait la résolution
// d'origine de la photo (souvent 3000-4000px côté appareil photo, plusieurs
// Mo) alors qu'elle n'est jamais affichée à plus de ~800px (page détail
// annonce) — la quasi-totalité du poids d'image du site vient d'ici, puisque
// TOUTE photo publiée passe par cette fonction. 1600px de long côté suffit
// même pour la vue détail zoomée.
const MAX_DIMENSION = 1600;
export const applyWatermark = file => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const label = 'maket';
    const fontSize = Math.max(18, Math.round(canvas.width / 22));
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = fontSize / 18;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-Math.PI / 8);
    const stepX = fontSize * 6;
    const stepY = fontSize * 4;
    const span = Math.max(canvas.width, canvas.height) * 1.5;
    for (let y = -span; y < span; y += stepY) {
      for (let x = -span; x < span; x += stepX) {
        ctx.strokeText(label, x, y);
        ctx.fillText(label, x, y);
      }
    }
    ctx.restore();
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Échec du filigrane'));
        return;
      }
      resolve(new File([blob], file.name, {
        type: file.type || 'image/jpeg'
      }));
    }, file.type || 'image/jpeg', 0.92);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Image illisible'));
  };
  img.src = url;
});
