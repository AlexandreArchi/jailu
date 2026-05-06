import { useState } from 'react'
import { BOOK_STATUS_LABELS, type BookResult, type BookStatus, type UserBook } from '../types/book'

const STATUS_COLORS: Record<BookStatus, string> = {
  read: 'bg-emerald-700 text-emerald-100',
  reading: 'bg-indigo-700 text-indigo-100',
  to_read: 'bg-slate-600 text-slate-200',
}

interface BookCardResultProps {
  variant: 'result'
  book: BookResult
  onAdd: (book: BookResult) => void
}

interface BookCardLibraryProps {
  variant: 'library'
  book: UserBook
  onClick: (book: UserBook) => void
}

type BookCardProps = BookCardResultProps | BookCardLibraryProps

export default function BookCard(props: BookCardProps) {
  const toHttps = (url: string) => url.replace('http://', 'https://')
  const coverSrc = toHttps(props.variant === 'result' ? props.book.cover_url : props.book.coverUrl)
  const fallbackSrc = props.variant === 'result'
    ? toHttps(props.book.thumbnail_url ?? '')
    : toHttps(props.book.thumbnailUrl ?? '')
  const [imgSrc, setImgSrc] = useState(coverSrc)

  const title = props.book.title
  const authors = props.book.authors
  const year =
    props.variant === 'result'
      ? (props.book.published_date?.split('-')[0] ?? '')
      : (props.book.publishedDate?.split('-')[0] ?? '')

  const handleClick = () => {
    if (props.variant === 'library') props.onClick(props.book)
  }

  return (
    <div
      className={`flex gap-3 rounded-xl bg-slate-800 p-3 ${props.variant === 'library' ? 'cursor-pointer transition hover:bg-slate-750 active:bg-slate-700' : ''}`}
      onClick={handleClick}
    >
      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-slate-700">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={title}
            className="h-full w-full object-cover"
            onError={() => {
              if (imgSrc !== fallbackSrc && fallbackSrc) {
                setImgSrc(fallbackSrc)
              } else {
                setImgSrc('')
              }
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-1 text-center text-xs text-slate-500">
            Pas de couverture
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <p className="font-semibold text-white truncate">{title}</p>
          <p className="text-sm text-slate-400 truncate">
            {authors.join(', ')}
            {year ? ` · ${year}` : ''}
          </p>
          {props.variant === 'library' && props.book.rating !== null && (
            <p className="mt-0.5 text-xs text-amber-400">
              {'★'.repeat(props.book.rating)}{'☆'.repeat(5 - props.book.rating)}
            </p>
          )}
        </div>

        <div className="mt-2">
          {props.variant === 'library' ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[props.book.status]}`}>
              {BOOK_STATUS_LABELS[props.book.status]}
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); props.onAdd(props.book) }}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-500"
            >
              Ajouter
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
