import { useEffect, useState } from 'react'
import { setReadingGoal } from '../lib/firestore'

interface GoalBannerProps {
  readCount: number
  goal: { year: number; target: number } | null | undefined
  onGoalChange: (goal: { year: number; target: number } | null) => void
}

export default function GoalBanner({ readCount, goal, onGoalChange }: GoalBannerProps) {
  const currentYear = new Date().getFullYear()
  const activeGoal = goal && goal.year === currentYear ? goal : null

  const [showEdit, setShowEdit] = useState(false)
  const [targetInput, setTargetInput] = useState<number>(activeGoal?.target ?? 0)
  const [saving, setSaving] = useState(false)

  function openEdit() {
    setTargetInput(activeGoal?.target ?? 0)
    setShowEdit(true)
  }

  async function handleSave() {
    if (targetInput < 1 || targetInput > 500) return
    setSaving(true)
    try {
      await setReadingGoal(currentYear, targetInput)
      onGoalChange({ year: currentYear, target: targetInput })
      setShowEdit(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await setReadingGoal(currentYear, null)
      onGoalChange(null)
      setShowEdit(false)
    } finally {
      setSaving(false)
    }
  }

  const pct = activeGoal ? Math.min(readCount / activeGoal.target, 1) * 100 : 0
  const achieved = activeGoal ? readCount >= activeGoal.target : false

  return (
    <>
      {activeGoal ? (
        <div className="rounded-2xl bg-slate-800/60 ring-1 ring-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Objectif {activeGoal.year}
            </p>
            <button
              onClick={openEdit}
              className="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-700/60 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              aria-label="Modifier l'objectif"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-2xl font-bold text-white">{readCount}</span>
            <span className="text-sm text-slate-400">/ {activeGoal.target} livres</span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: achieved
                  ? 'linear-gradient(to right, #10b981, #34d399)'
                  : 'linear-gradient(to right, #6366f1, #10b981)',
              }}
            />
          </div>

          {achieved && (
            <p className="mt-2 text-xs font-semibold text-emerald-400">
              Objectif atteint !
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={openEdit}
          className="flex w-full items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300 py-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Définir un objectif {currentYear} →</span>
        </button>
      )}

      {showEdit && (
        <GoalEditModal
          currentYear={currentYear}
          targetInput={targetInput}
          setTargetInput={setTargetInput}
          saving={saving}
          hasActiveGoal={activeGoal !== null}
          onSave={() => void handleSave()}
          onDelete={() => void handleDelete()}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}

function GoalEditModal({
  currentYear,
  targetInput,
  setTargetInput,
  saving,
  hasActiveGoal,
  onSave,
  onDelete,
  onClose,
}: {
  currentYear: number
  targetInput: number
  setTargetInput: (v: number) => void
  saving: boolean
  hasActiveGoal: boolean
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}) {
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isValid = targetInput >= 1 && targetInput <= 500

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-slate-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Objectif {currentYear}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-slate-400">
          Nombre de livres à lire
        </label>
        <input
          type="number"
          min={1}
          max={500}
          value={targetInput === 0 ? '' : targetInput}
          onChange={(e) => setTargetInput(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
          placeholder="Ex : 20"
          className="mb-5 w-full rounded-xl bg-slate-700 px-4 py-3 text-2xl font-bold text-white outline-none ring-1 ring-slate-600 focus:ring-indigo-500 text-center transition"
        />

        <button
          onClick={onSave}
          disabled={saving || !isValid}
          className="mb-2 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          Enregistrer
        </button>

        {hasActiveGoal && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-rose-400 transition hover:text-rose-300 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Supprimer l'objectif
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-xl py-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
