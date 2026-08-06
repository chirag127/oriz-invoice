import { forwardRef } from 'react'
import {
  amountToWords,
  computeTotals,
  formatMoney,
  lineAmount,
  type InvoiceMeta,
  type LineItem,
  type Party,
} from '../lib/invoice'

interface Props {
  from: Party
  to: Party
  items: LineItem[]
  meta: InvoiceMeta
}

const Receipt = forwardRef<HTMLDivElement, Props>(({ from, to, items, meta }, ref) => {
  const t = computeTotals(items, meta)
  const cur = meta.currency
  const money = (n: number) => formatMoney(n, cur)
  const isGst = meta.gstMode !== 'none'

  return (
    <div className="receipt" ref={ref} aria-label="Invoice preview">
      <div className="rc-top">
        <div>
          {meta.logo && <img className="rc-logo" src={meta.logo} alt="" />}
          <div className="rc-from-name">{from.name || 'Your business'}</div>
          {from.address && <div className="rc-parties pline" style={{ whiteSpace: 'pre-line', color: 'var(--lg-label)', fontSize: '0.82rem' }}>{from.address}</div>}
          {from.gstin && <div className="gstin">GSTIN: {from.gstin}</div>}
          {(from.email || from.phone) && (
            <div style={{ fontSize: '0.8rem', color: 'var(--lg-label)' }}>
              {[from.email, from.phone].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="rc-meta">
          <h3>Invoice</h3>
          <dl>
            <dt>No.</dt>
            <dd>{meta.number || '—'}</dd>
            <dt>Date</dt>
            <dd>{meta.date || '—'}</dd>
            {meta.dueDate && (
              <>
                <dt>Due</dt>
                <dd>{meta.dueDate}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <div className="rc-parties">
        <div>
          <div className="label">Bill to</div>
          <div className="pname">{to.name || '—'}</div>
          {to.address && <div className="pline">{to.address}</div>}
          {to.gstin && <div className="gstin">GSTIN: {to.gstin}</div>}
          {(to.email || to.phone) && (
            <div style={{ fontSize: '0.8rem', color: 'var(--lg-label)' }}>
              {[to.email, to.phone].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      <table className="rc-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            {isGst && <th>Tax %</th>}
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={isGst ? 5 : 4} className="rc-desc-empty">
                Add a line item to begin.
              </td>
            </tr>
          )}
          {items.map((it) => (
            <tr key={it.id}>
              <td className={it.description ? '' : 'rc-desc-empty'}>{it.description || 'Item'}</td>
              <td>{it.qty}</td>
              <td>{money(it.rate)}</td>
              {isGst && <td>{it.taxPct}%</td>}
              <td>{money(lineAmount(it))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rc-foot">
        <div className="rc-notes">
          {meta.notes && (
            <>
              <div className="label">Notes</div>
              <p>{meta.notes}</p>
            </>
          )}
          {meta.terms && (
            <>
              <div className="label">Terms &amp; scope</div>
              <p>{meta.terms}</p>
            </>
          )}
        </div>
        <div className="rc-totals">
          <dl>
            <dt>Subtotal</dt>
            <dd>{money(t.subtotal)}</dd>
            {t.discount > 0 && (
              <>
                <dt>Discount ({meta.discountPct}%)</dt>
                <dd>−{money(t.discount)}</dd>
              </>
            )}
            {meta.gstMode === 'intra' && (
              <>
                <dt>CGST</dt>
                <dd>{money(t.cgst)}</dd>
                <dt>SGST</dt>
                <dd>{money(t.sgst)}</dd>
              </>
            )}
            {meta.gstMode === 'inter' && (
              <>
                <dt>IGST</dt>
                <dd>{money(t.igst)}</dd>
              </>
            )}
            {t.shipping > 0 && (
              <>
                <dt>Shipping</dt>
                <dd>{money(t.shipping)}</dd>
              </>
            )}
          </dl>
          <div className="rc-grand">
            <span className="g-label">Total {cur}</span>
            <span className="g-amt">{money(t.grandTotal)}</span>
          </div>
          <div className="rc-words">{amountToWords(t.grandTotal, cur)}</div>
        </div>
      </div>

      <div className="rc-stamp">Thank you for your business</div>
    </div>
  )
})

Receipt.displayName = 'Receipt'
export default Receipt
