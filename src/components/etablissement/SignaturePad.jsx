import { useRef, useEffect } from 'react';

// Pavé de signature manuscrite (canvas) — capturé en PNG (quelques Ko pour
// un simple tracé noir sur blanc), stocké directement dans le document
// Firestore (pas de bucket Supabase dédié : proportionné à ce cas d'usage,
// jamais pensé pour une pièce jointe volumineuse).
export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };
  const start = (e) => {
    drawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };
  const effacer = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };
  useEffect(() => { effacer(); }, []);

  return (
    <div>
      <canvas
        ref={canvasRef} width={400} height={140}
        style={{ width: '100%', maxWidth: 400, height: 140, border: '1.5px dashed #CBD5E1', borderRadius: 10, touchAction: 'none', cursor: 'crosshair', background: 'white' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <button type="button" onClick={effacer} style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
        Effacer
      </button>
    </div>
  );
}
