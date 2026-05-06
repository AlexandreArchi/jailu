import { useState } from 'react'
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
  const [targetInput, setTargetInput] = useState<number>(activeGoal?.target ?? 20)
  const [saving, setSaving] = useState(false)

  function openEdit() {
    setTargetInput(activeGoal?.target ?? 20)
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
              className="flex items-center justify-center h-7 w-7 rounded-xl bg-slate-700/60 text-slate-400 transition hover:bg-slate-700 hover:text-white"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div
            className="w-full max-w-sm rounded-t-2xl bg-slate-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-base font-bold text-white">Objectif {currentYear}</h2>

            <label className="mb-1 block text-xs font-medium text-slate-400">
              Nombre de livres à lire
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={targetInput}
              onChange={(e) => setTargetInput(Number(e.target.value))}
              className="mb-5 w-full rounded-xl bg-slate-700 px-4 py-3 text-2xl font-bold text-white outline-none ring-1 ring-slate-600 focus:ring-indigo-500 text-center transition"
            />

            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="mb-2 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Enregistrer
            </button>

            {activeGoal && (
              <button
                onClick={() => void handleDelete()}
                disabled={saving}
                className="mb-2 w-full rounded-xl py-2 text-sm font-medium text-rose-400 transition hover:text-rose-300 disabled:opacity-50"
              >
                Supprimer l'objectif
              </button>
            )}

            <button
              onClick={() => setShowEdit(false)}
              className="w-full rounded-xl py-2 text-sm text-slate-400 transition hover:text-slate-200"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  )
}
