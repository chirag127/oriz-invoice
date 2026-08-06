import { useState } from 'react'

interface Props {
  /** short context: what the invoice is for */
  context: string
  /** called with generated text when the user accepts it */
  onAccept: (text: string) => void
}

type Kind = 'terms' | 'item'

/**
 * Optional AI polish. Lazy-imports @chirag127/oz-ai only when triggered, so the
 * heavy g4f bundle never touches first paint. If every provider is down it
 * shows an error and the core tool keeps working.
 */
export default function AiDraft({ context, onAccept }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [draft, setDraft] = useState('')

  async function run(kind: Kind) {
    setBusy(true)
    setErr('')
    setDraft('')
    try {
      const { complete } = await import('@chirag127/oz-ai')
      const desc = context.trim() || 'a general professional service'
      const prompt =
        kind === 'terms'
          ? `Write concise, professional invoice payment-terms and scope-of-work notes for: ${desc}. 2-4 short sentences. Include payment window and late-fee note. Plain text, no markdown, no preamble.`
          : `Suggest one clear, professional invoice line-item description for: ${desc}. Under 12 words. Plain text only, no quotes, no preamble.`
      const text = await complete(prompt, {
        system: 'You are a precise invoicing assistant. Output only the requested text. Never add commentary.',
      })
      setDraft(text.trim())
    } catch {
      setErr('AI unavailable right now — all providers busy. Type it manually; the invoice works without AI.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-box no-print">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <strong style={{ fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--lg-green)' }}>
          AI draft
        </strong>
        <button type="button" className="btn btn--ghost" onClick={() => run('terms')} disabled={busy}>
          Draft terms / scope
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => run('item')} disabled={busy}>
          Suggest line wording
        </button>
        {busy && (
          <span className="ai-status">
            <span className="ai-dot" /> thinking…
          </span>
        )}
      </div>
      {err && <p className="ai-err">{err}</p>}
      {draft && (
        <div style={{ marginTop: '0.6rem' }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onAccept(draft)
                setDraft('')
              }}
            >
              Use this
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setDraft('')}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
