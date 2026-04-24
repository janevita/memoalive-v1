'use client'

/**
 * NewScrapbookPage — 2-step wizard.
 *
 * Step 1: Choose a visual template (TemplatePicker full-width grid)
 * Step 2: Title + description form; hidden <input> carries the chosen template
 */

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createScrapbook } from '@/lib/actions/scrapbooks'
import { ROUTES, DEFAULT_TEMPLATE_ID, type ScrapbookTemplateId } from '@/lib/constants'
import { TemplatePicker } from '@/components/scrapbook/TemplatePicker'

// ── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary btn-pill w-full"
    >
      {pending ? 'Creating…' : 'Create scrapbook'}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewScrapbookPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [template, setTemplate] = useState<ScrapbookTemplateId>(DEFAULT_TEMPLATE_ID)
  const [state, action] = useFormState(createScrapbook, undefined)

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      {/* Back link */}
      <Link
        href={ROUTES.scrapbooks}
        className="text-xs text-ink-soft hover:text-flame transition-colors mb-6 inline-block"
      >
        ← Back to scrapbooks
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        <StepDot n={1} active={step === 1} done={step === 2} />
        <div className="h-px flex-1 bg-ink/10" />
        <StepDot n={2} active={step === 2} done={false} />
      </div>

      {/* ── Step 1: Pick a template ── */}
      {step === 1 && (
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink mb-1">
            Pick a style
          </h1>
          <p className="text-ink-soft text-sm mb-8">
            Choose the look and feel for your scrapbook. You can change it later.
          </p>

          <TemplatePicker
            value={template}
            onChange={setTemplate}
            name=""   /* no hidden input here — we carry state into step 2 */
          />

          <button
            type="button"
            onClick={() => setStep(2)}
            className="btn btn-primary btn-pill w-full mt-8"
          >
            Next — add a title →
          </button>
        </div>
      )}

      {/* ── Step 2: Title + description ── */}
      {step === 2 && (
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink mb-1">
            Name your scrapbook
          </h1>
          <p className="text-ink-soft text-sm mb-8">
            Give it a title so you can find it later.
          </p>

          <form action={action} className="space-y-5">
            {/* Carry the chosen template as a hidden field */}
            <input type="hidden" name="template" value={template} />

            {state?.error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium text-ink">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="e.g. Summer 2024, Grandma's garden…"
                className="input w-full"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-ink">
                Description{' '}
                <span className="text-ink-faint text-xs font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="A short note about this collection…"
                className="input w-full resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-ghost btn-pill flex-1"
              >
                ← Back
              </button>
              <div className="flex-1">
                <SubmitButton />
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ── Step dot ──────────────────────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={[
      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
      active ? 'bg-flame text-white shadow-[0_0_0_3px_rgba(249,118,28,0.2)]' :
      done   ? 'bg-flame/20 text-flame' :
               'bg-ink/8 text-ink-faint',
    ].join(' ')}>
      {done ? '✓' : n}
    </div>
  )
}
