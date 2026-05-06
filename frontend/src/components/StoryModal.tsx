import { useState } from 'react'
import { deleteMyStory } from '../lib/firestore'
import type { Story } from '../types/book'

interface Props {
  stories: Story[]
  isMe: boolean
  onClose: () => void
  onDeleted?: (storyId: string) => void
}

export default function StoryModal({ stories, isMe, onClose, onDeleted }: Props) {
  const [index, setIndex] = useState(0)
  const story = stories[index]
  if (!story) return null

  const toHttps = (url: string) => url.replace('http://', 'https://')
  const coverSrc = toHttps(story.bookThumbnailUrl ?? story.bookCoverUrl)

  const prev = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => setIndex((i) => Math.min(stories.length - 1, i + 1))

  const handleDelete = async () => {
    await deleteMyStory(story.id)
    onDeleted?.(story.id)
    if (stories.length <= 1) onClose()
    else setIndex((i) => Math.max(0, i - 1))
  }

  const renderStars = (rating: number) => {
    const full = Math.floor(rating)
    const half = rating % 1 >= 0.5
    return (
      <span className="text-amber-400 text-lg tracking-tight">
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950" onClick={onClose}>
      {/* Progress indicators */}
      {stories.length > 1 && (
        <div className="absolute top-0 inset-x-0 flex gap-1 px-4 pt-3 z-10">
          {stories.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-0.5 rounded-full transition-all ${i <= index ? 'bg-white' : 'bg-white/25'}`}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div
        className="relative flex items-center justify-between px-4 pt-8 pb-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/30 ring-2 ring-indigo-500/50">
            <span className="text-sm font-bold text-indigo-300">
              {story.fromUsername[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {isMe ? 'Ta story' : `@${story.fromUsername}`}
            </p>
            <p className="text-xs text-slate-400">
              {story.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMe && (
            <button
              onClick={() => void handleDelete()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-red-400 transition"
              aria-label="Supprimer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex flex-1 flex-col items-center justify-center gap-6 px-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Book cover */}
        <div className="h-72 w-48 overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10">
          {coverSrc ? (
            <img src={coverSrc} alt={story.bookTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-800 px-3 text-center text-xs text-slate-500">
              {story.bookTitle}
            </div>
          )}
        </div>

        {/* Book info */}
        <div className="w-full max-w-xs text-center">
          {!isMe && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-400">
              a terminé ce livre
            </p>
          )}
          <p className="text-xl font-bold text-white leading-tight">{story.bookTitle}</p>
          <p className="mt-1.5 text-sm text-slate-400">{story.bookAuthors.join(', ')}</p>
          {story.rating !== null && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {renderStars(story.rating)}
              <span className="text-sm font-semibold text-amber-400">{story.rating}/5</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation prev/next */}
      {stories.length > 1 && (
        <div
          className="flex justify-between px-4 pb-12"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={prev}
            disabled={index === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 transition disabled:opacity-30 hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="self-center text-xs text-slate-500">{index + 1} / {stories.length}</span>
          <button
            onClick={next}
            disabled={index === stories.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 transition disabled:opacity-30 hover:bg-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
