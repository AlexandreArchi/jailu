import { useEffect, useState } from 'react'
import { deleteMyStory } from '../lib/firestore'
import { coverPalette } from '../lib/coverColor'
import type { Story } from '../types/book'

interface Props {
  stories: Story[]
  isMe: boolean
  onClose: () => void
  onDeleted?: (storyId: string) => void
}

export default function StoryModal({ stories, isMe, onClose, onDeleted }: Props) {
  const [index, setIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const story = stories[index]
  if (!story) return null

  const toHttps = (url: string) => url.replace('http://', 'https://')
  const coverSrc = toHttps(story.bookThumbnailUrl ?? story.bookCoverUrl)
  const palette = coverPalette(story.bookTitle)

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => {
    if (index < stories.length - 1) setIndex((i) => i + 1)
    else onClose()
  }

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await deleteMyStory(story.id)
      onDeleted?.(story.id)
      if (stories.length <= 1) onClose()
      else setIndex((i) => Math.max(0, i - 1))
    } finally {
      setIsDeleting(false)
    }
  }

  const renderStars = (rating: number) => {
    const full = Math.floor(rating)
    const half = rating % 1 >= 0.5
    const empty = 5 - full - (half ? 1 : 0)
    return (
      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: full }).map((_, i) => (
          <span key={`f${i}`} className="text-2xl text-amber-400">★</span>
        ))}
        {half && (
          <span className="relative inline-block text-2xl leading-none">
            <span className="text-white/20">★</span>
            <span className="absolute inset-0 text-amber-400" style={{ clipPath: 'inset(0 50% 0 0)' }}>★</span>
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`e${i}`} className="text-2xl text-white/20">★</span>
        ))}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-black">
      {/* Full-screen blurred background */}
      {coverSrc ? (
        <img
          src={coverSrc}
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover"
          style={{ filter: 'blur(40px) brightness(0.35) saturate(1.6)' }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 40%, ${palette.bg}90 0%, #000 70%)`,
          }}
        />
      )}
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Progress bars — z-20 */}
      <div className="relative z-20 flex gap-1.5 px-4 pt-12 sm:pt-5">
        {stories.map((_, i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-all ${i <= index ? 'bg-white' : 'bg-white/20'}`}
          />
        ))}
      </div>

      {/* Header — z-20 */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <span className="text-sm font-bold text-white">
              {story.fromUsername[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {isMe ? 'Ta story' : `@${story.fromUsername}`}
            </p>
            <p className="text-xs text-white/45">
              {story.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMe && (
            <button
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition hover:bg-white/20 hover:text-white disabled:opacity-50"
              aria-label="Supprimer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content + tap zones */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-8 pb-10">
        {/* Tap zones */}
        <div className="absolute inset-0 z-10 flex">
          <div className="flex-1" onClick={() => { if (index > 0) prev() }} />
          <div className="flex-1" onClick={next} />
        </div>

        {/* Book cover */}
        <div className="pointer-events-none relative">
          <div
            className="overflow-hidden rounded-2xl ring-1 ring-white/10"
            style={{
              width: '176px',
              height: '264px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            {coverSrc ? (
              <img src={coverSrc} alt={story.bookTitle} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: palette.bg }}
              >
                <span className="text-6xl font-bold opacity-50" style={{ color: palette.fg }}>
                  {story.bookTitle[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Book info */}
        <div className="pointer-events-none w-full max-w-xs text-center">
          {!isMe && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              a terminé ce livre
            </p>
          )}
          <p className="text-xl font-bold leading-snug text-white">{story.bookTitle}</p>
          <p className="mt-1.5 text-sm text-white/55">{story.bookAuthors.join(', ')}</p>
          {story.rating !== null && (
            <div className="mt-4">
              {renderStars(story.rating)}
            </div>
          )}
        </div>
      </div>

      {/* Counter */}
      {stories.length > 1 && (
        <p className="relative z-20 pb-6 text-center text-xs text-white/20">
          {index + 1} / {stories.length}
        </p>
      )}
    </div>
  )
}
