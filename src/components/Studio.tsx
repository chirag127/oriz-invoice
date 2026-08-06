import { useCallback, useMemo, useRef, useState } from 'react'
import { downloadBlob, onDropZone, printToPdf, readAsDataURL } from '@chirag127/oz-file'
import {
  blankItem,
  CURRENCIES,
  computeTotals,
  formatMoney,
  lineAmount,
  nextInvoiceNumber,
  type InvoiceMeta,
  type LineItem,
  type Party,
} from '../lib/invoice'
import AiDraft from './AiDraft'
import Receipt from './Receipt'
import { usePersistentState } from './usePersistentState'

const KEY = 'oriz-invoice/v1'

const emptyParty = (): Party => ({ name: '', gstin: '', address: '', email: '', phone: '' })

const today = () => new Date().toISOString().slice(0, 10)

interface Doc {
  from: Party
  to: Party
  items: LineItem[]
  meta: InvoiceMeta
}

const seed = (): Doc => ({
  from: { name: '', gstin: '', address: '', email: '', phone: '' },
  to: emptyParty(),
  items: [blankItem()],
  meta: {
    number: nextInvoiceNumber(),
    date: today(),
    dueDate: '',
    currency: 'INR',
    notes: '',
    terms: 'Payment due within 15 days. 1.5% monthly late fee on overdue balances.',
    logo: '',
    discountPct: 0,
    shipping: 0,
    gstMode: 'intra',
  },
})

export default function Studio() {
  const [doc, setDoc, loaded] = usePersistentState<Doc>(KEY, seed())
  const [saved, setSaved] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  const { from, to, items, meta } = doc
  const totals = useMemo(() => computeTotals(items, meta), [items, meta])

  const patch = useCallback(
    (fn: (d: Doc) => Doc) => {
      setDoc((d) => fn(structuredClone(d)))
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1200)
    },
    [setDoc],
  )

  const setMeta = (k: keyof InvoiceMeta, v: string | number) => patch((d) => ({ ...d, meta: { ...d.meta, [k]: v } }))
  const setFrom = (k: keyof Party, v: string) => patch((d) => ({ ...d, from: { ...d.from, [k]: v } }))
  const setTo = (k: keyof Party, v: string) => patch((d) => ({ ...d, to: { ...d.to, [k]: v } }))

  const updateItem = (id: string, k: keyof LineItem, v: string | number) =>
    patch((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, [k]: v } : it)) }))
  const addItem = () => patch((d) => ({ ...d, items: [...d.items, blankItem()] }))
  const removeItem = (id: string) => patch((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }))

  const dropRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    onDropZone(
      node,
      async (files) => {
        const f = files[0]
        if (f && f.type.startsWith('image/')) {
          const url = await readAsDataURL(f)
          patch((d) => ({ ...d, meta: { ...d.meta, logo: url } }))
        }
      },
      { dragClass: 'drag' },
    )
  }, [patch])

  async function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      const url = await readAsDataURL(f)
      patch((d) => ({ ...d, meta: { ...d.meta, logo: url } }))
    }
  }

  const exportJson = () => {
    downloadBlob(
      new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
      `${meta.number || 'invoice'}.json`,
    )
  }

  const importJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const parsed = JSON.parse(await f.text()) as Doc
      if (parsed && parsed.items && parsed.meta) patch(() => parsed)
    } catch {
      alert('Not a valid invoice JSON file.')
    }
    e.target.value = ''
  }

  const reset = () => {
    if (confirm('Clear this invoice and start fresh?')) patch(() => seed())
  }

  const cur = meta.currency
  const isGst = meta.gstMode !== 'none'

  return (
    <div className="studio">
      {/* ---------------- EDITOR ---------------- */}
      <section className="panel panel--editor no-print" aria-label="Invoice editor">
        <div className="panel__head">
          <h2>Editor</h2>
          <span className="saved-flag">{saved ? '● saved' : loaded ? 'autosaved' : ''}</span>
        </div>
        <div className="panel__body">
          <div className="subhead">Invoice</div>
          <div className="grid3">
            <div className="field">
              <label htmlFor="inv-no">Number</label>
              <input id="inv-no" value={meta.number} onChange={(e) => setMeta('number', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="inv-date">Date</label>
              <input id="inv-date" type="date" value={meta.date} onChange={(e) => setMeta('date', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="inv-due">Due date</label>
              <input id="inv-due" type="date" value={meta.dueDate} onChange={(e) => setMeta('dueDate', e.target.value)} />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="inv-cur">Currency</label>
              <select id="inv-cur" value={cur} onChange={(e) => setMeta('currency', e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tax mode</label>
              <div className="mode-toggle" role="group" aria-label="GST mode">
                <button type="button" aria-pressed={meta.gstMode === 'none'} onClick={() => setMeta('gstMode', 'none')}>
                  No tax
                </button>
                <button type="button" aria-pressed={meta.gstMode === 'intra'} onClick={() => setMeta('gstMode', 'intra')}>
                  CGST+SGST
                </button>
                <button type="button" aria-pressed={meta.gstMode === 'inter'} onClick={() => setMeta('gstMode', 'inter')}>
                  IGST
                </button>
              </div>
              <p className="hint">Intra-state = CGST+SGST · Inter-state = IGST</p>
            </div>
          </div>

          <div className="subhead">Logo</div>
          <div ref={dropRef} className="logo-drop" onClick={() => document.getElementById('logo-input')?.click()}>
            {meta.logo ? <img src={meta.logo} alt="logo preview" /> : null}
            {meta.logo ? 'Click or drop to replace logo' : 'Click or drop an image for your logo'}
            <input id="logo-input" type="file" accept="image/*" hidden onChange={pickLogo} />
          </div>
          {meta.logo && (
            <button type="button" className="btn btn--ghost" style={{ marginTop: '0.5rem' }} onClick={() => setMeta('logo', '')}>
              Remove logo
            </button>
          )}

          <div className="subhead">From (your business)</div>
          <div className="field">
            <label htmlFor="f-name">Name</label>
            <input id="f-name" value={from.name} onChange={(e) => setFrom('name', e.target.value)} placeholder="Acme Consulting" />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="f-gstin">GSTIN</label>
              <input id="f-gstin" value={from.gstin} onChange={(e) => setFrom('gstin', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f-email">Email</label>
              <input id="f-email" type="email" value={from.email} onChange={(e) => setFrom('email', e.target.value)} />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="f-phone">Phone</label>
              <input id="f-phone" value={from.phone} onChange={(e) => setFrom('phone', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f-addr">Address</label>
              <textarea id="f-addr" value={from.address} onChange={(e) => setFrom('address', e.target.value)} />
            </div>
          </div>

          <div className="subhead">Bill to (client)</div>
          <div className="field">
            <label htmlFor="t-name">Name</label>
            <input id="t-name" value={to.name} onChange={(e) => setTo('name', e.target.value)} placeholder="Client Pvt Ltd" />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="t-gstin">GSTIN</label>
              <input id="t-gstin" value={to.gstin} onChange={(e) => setTo('gstin', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="t-email">Email</label>
              <input id="t-email" type="email" value={to.email} onChange={(e) => setTo('email', e.target.value)} />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="t-phone">Phone</label>
              <input id="t-phone" value={to.phone} onChange={(e) => setTo('phone', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="t-addr">Address</label>
              <textarea id="t-addr" value={to.address} onChange={(e) => setTo('address', e.target.value)} />
            </div>
          </div>

          <div className="subhead">Line items</div>
          <div className="items">
            <div className="items__head">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>{isGst ? 'Tax %' : '—'}</span>
              <span>Amount</span>
              <span aria-hidden="true" />
            </div>
            {items.map((it) => (
              <div className="item-row" key={it.id}>
                <input
                  aria-label="Description"
                  value={it.description}
                  onChange={(e) => updateItem(it.id, 'description', e.target.value)}
                  placeholder="Service or product"
                />
                <input
                  aria-label="Quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={it.qty}
                  onChange={(e) => updateItem(it.id, 'qty', Number(e.target.value))}
                />
                <input
                  aria-label="Rate"
                  type="number"
                  min="0"
                  step="any"
                  value={it.rate}
                  onChange={(e) => updateItem(it.id, 'rate', Number(e.target.value))}
                />
                <input
                  aria-label="Tax percent"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  disabled={!isGst}
                  value={it.taxPct}
                  onChange={(e) => updateItem(it.id, 'taxPct', Number(e.target.value))}
                />
                <span className="item-amt">{formatMoney(lineAmount(it), cur)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove line"
                  onClick={() => removeItem(it.id)}
                  disabled={items.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={addItem}>
              + Add line
            </button>
          </div>

          <div className="subhead">Adjustments</div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="disc">Discount %</label>
              <input id="disc" type="number" min="0" max="100" step="any" value={meta.discountPct} onChange={(e) => setMeta('discountPct', Number(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="ship">Shipping / other</label>
              <input id="ship" type="number" min="0" step="any" value={meta.shipping} onChange={(e) => setMeta('shipping', Number(e.target.value))} />
            </div>
          </div>

          <div className="subhead">Notes &amp; terms</div>
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" value={meta.notes} onChange={(e) => setMeta('notes', e.target.value)} placeholder="Bank details, PO reference…" />
          </div>
          <div className="field">
            <label htmlFor="terms">Payment terms / scope</label>
            <textarea id="terms" value={meta.terms} onChange={(e) => setMeta('terms', e.target.value)} />
          </div>
          <AiDraft
            context={`${items.map((i) => i.description).filter(Boolean).join(', ')} for ${to.name || 'a client'}`}
            onAccept={(text) => setMeta('terms', text)}
          />
        </div>
      </section>

      {/* ---------------- PREVIEW ---------------- */}
      <section className="preview-wrap" aria-label="Preview and export">
        <div className="preview-actions btn-row no-print" style={{ marginTop: 0, marginBottom: '0.9rem' }}>
          <button type="button" className="btn btn--primary" onClick={() => printToPdf(receiptRef.current ?? undefined)}>
            Print / Save PDF
          </button>
          <button type="button" className="btn btn--gold" onClick={exportJson}>
            Export JSON
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => document.getElementById('import-json')?.click()}>
            Import
          </button>
          <input id="import-json" type="file" accept="application/json" hidden onChange={importJson} />
          <button type="button" className="btn btn--ghost" onClick={reset}>
            Reset
          </button>
        </div>
        <Receipt ref={receiptRef} from={from} to={to} items={items} meta={meta} />
        <p className="hint no-print">
          Grand total: <strong>{formatMoney(totals.grandTotal, cur)}</strong> · autosaved to this browser only.
        </p>
      </section>
    </div>
  )
}
