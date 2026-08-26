export default function ProductCardSkeleton() {
  return <div style={{
    borderRadius: 14,
    overflow: 'hidden',
    background: 'white'
  }}>
      <div className="animate-pulse" style={{
      aspectRatio: '1',
      background: 'var(--bg-3)'
    }} />
      <div style={{
      padding: '12px 12px 14px'
    }}>
        <div className="animate-pulse" style={{
        height: 11,
        width: '85%',
        background: 'var(--bg-3)',
        borderRadius: 4,
        marginBottom: 6
      }} />
        <div className="animate-pulse" style={{
        height: 13,
        width: '45%',
        background: 'var(--bg-3)',
        borderRadius: 4,
        marginBottom: 8
      }} />
        <div className="animate-pulse" style={{
        height: 9,
        width: '60%',
        background: 'var(--bg-3)',
        borderRadius: 4
      }} />
      </div>
    </div>;
}
