export default function MiniRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span className="flex items-center gap-px">
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="text-xs leading-none text-amber-400">★</span>
      ))}
      {half && (
        <span className="relative inline-block text-xs leading-none">
          <span className="text-slate-600">★</span>
          <span className="absolute inset-0 text-amber-400" style={{ clipPath: 'inset(0 50% 0 0)' }}>★</span>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="text-xs leading-none text-slate-700">★</span>
      ))}
    </span>
  )
}
