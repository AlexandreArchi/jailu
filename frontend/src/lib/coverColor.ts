const PALETTES = [
  { bg: '#3730a3', fg: '#c7d2fe' }, // indigo
  { bg: '#6d28d9', fg: '#ddd6fe' }, // violet
  { bg: '#065f46', fg: '#a7f3d0' }, // emerald
  { bg: '#92400e', fg: '#fde68a' }, // amber
  { bg: '#881337', fg: '#fecdd3' }, // rose
  { bg: '#164e63', fg: '#a5f3fc' }, // cyan
  { bg: '#9a3412', fg: '#fed7aa' }, // orange
  { bg: '#831843', fg: '#fbcfe8' }, // pink
  { bg: '#1e3a5f', fg: '#bfdbfe' }, // blue
  { bg: '#14532d', fg: '#bbf7d0' }, // green
]

export function coverPalette(title: string): { bg: string; fg: string } {
  const idx = (title.codePointAt(0) ?? 65) % PALETTES.length
  return PALETTES[idx]
}
