import { describe, expect, it } from 'vitest'
import {
  amountToWords,
  computeTotals,
  formatMoney,
  intToIndianWords,
  lineAmount,
  nextInvoiceNumber,
  round2,
  type InvoiceMeta,
  type LineItem,
} from '../src/lib/invoice'

const meta = (over: Partial<InvoiceMeta> = {}): InvoiceMeta => ({
  number: 'INV-1',
  date: '2026-08-06',
  dueDate: '',
  currency: 'INR',
  notes: '',
  terms: '',
  logo: '',
  discountPct: 0,
  shipping: 0,
  gstMode: 'intra',
  ...over,
})

const item = (over: Partial<LineItem> = {}): LineItem => ({
  id: 'x',
  description: 'thing',
  qty: 1,
  rate: 100,
  taxPct: 18,
  ...over,
})

describe('round2', () => {
  it('rounds to 2 dp', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(2.675)).toBe(2.68)
  })
})

describe('lineAmount', () => {
  it('multiplies qty*rate', () => {
    expect(lineAmount(item({ qty: 3, rate: 50 }))).toBe(150)
  })
  it('clamps negatives to 0', () => {
    expect(lineAmount(item({ qty: -3, rate: 50 }))).toBe(0)
  })
})

describe('computeTotals', () => {
  it('sums subtotal + tax, splits CGST/SGST intra', () => {
    const t = computeTotals([item({ qty: 2, rate: 100, taxPct: 18 })], meta())
    expect(t.subtotal).toBe(200)
    expect(t.taxTotal).toBe(36)
    expect(t.cgst).toBe(18)
    expect(t.sgst).toBe(18)
    expect(t.igst).toBe(0)
    expect(t.grandTotal).toBe(236)
  })

  it('IGST inter-state puts full tax in igst', () => {
    const t = computeTotals([item({ rate: 1000, taxPct: 12 })], meta({ gstMode: 'inter' }))
    expect(t.igst).toBe(120)
    expect(t.cgst).toBe(0)
    expect(t.grandTotal).toBe(1120)
  })

  it('gstMode none = no tax', () => {
    const t = computeTotals([item({ rate: 500, taxPct: 18 })], meta({ gstMode: 'none' }))
    expect(t.taxTotal).toBe(0)
    expect(t.grandTotal).toBe(500)
  })

  it('applies pre-tax discount pro-rated', () => {
    const t = computeTotals([item({ rate: 1000, taxPct: 10 })], meta({ discountPct: 10 }))
    expect(t.discount).toBe(100)
    expect(t.taxable).toBe(900)
    expect(t.taxTotal).toBe(90)
    expect(t.grandTotal).toBe(990)
  })

  it('adds shipping to grand total', () => {
    const t = computeTotals([item({ rate: 100, taxPct: 0 })], meta({ gstMode: 'none', shipping: 50 }))
    expect(t.grandTotal).toBe(150)
  })

  it('groups tax breakup by rate', () => {
    const t = computeTotals(
      [item({ rate: 100, taxPct: 18 }), item({ rate: 100, taxPct: 5 }), item({ rate: 200, taxPct: 18 })],
      meta(),
    )
    expect(t.taxBreakup).toHaveLength(2)
    expect(t.taxBreakup.find((b) => b.pct === 18)?.taxable).toBe(300)
    expect(t.taxBreakup.find((b) => b.pct === 5)?.tax).toBe(5)
  })
})

describe('intToIndianWords', () => {
  it('handles lakh/crore', () => {
    expect(intToIndianWords(0)).toBe('Zero')
    expect(intToIndianWords(100)).toBe('One Hundred')
    expect(intToIndianWords(1234)).toBe('One Thousand Two Hundred Thirty Four')
    expect(intToIndianWords(100000)).toBe('One Lakh')
    expect(intToIndianWords(12345678)).toBe(
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight',
    )
  })
})

describe('amountToWords', () => {
  it('INR rupees + paise', () => {
    expect(amountToWords(236.5, 'INR')).toBe('Rupees Two Hundred Thirty Six and Paise Fifty only')
  })
  it('USD western scale', () => {
    expect(amountToWords(1000000, 'USD')).toBe('USD One Million only')
  })
})

describe('formatMoney', () => {
  it('INR symbol', () => {
    expect(formatMoney(1000, 'INR')).toContain('1,000')
  })
})

describe('nextInvoiceNumber', () => {
  it('increments sequence', () => {
    expect(nextInvoiceNumber('INV-202608-004')).toMatch(/-005$/)
  })
  it('defaults to 001', () => {
    expect(nextInvoiceNumber()).toMatch(/-001$/)
  })
})

// ---- money invariants & edge cases ----

describe('computeTotals invariants', () => {
  const items: LineItem[] = [
    item({ qty: 3, rate: 100.01, taxPct: 5 }),
    item({ qty: 1, rate: 249.99, taxPct: 18 }),
    item({ qty: 2, rate: 33.33, taxPct: 12 }),
  ]

  it('CGST + SGST always reconstruct taxTotal exactly (intra)', () => {
    const t = computeTotals(items, meta({ gstMode: 'intra' }))
    expect(round2(t.cgst + t.sgst)).toBe(t.taxTotal)
    // split never rounds the halves apart by more than a cent
    expect(Math.abs(t.cgst - t.sgst)).toBeLessThanOrEqual(0.01)
    expect(t.igst).toBe(0)
  })

  it('grandTotal == taxable + taxTotal + shipping (no drift)', () => {
    const t = computeTotals(items, meta({ gstMode: 'inter', shipping: 40.5 }))
    expect(t.grandTotal).toBe(round2(t.taxable + t.taxTotal + t.shipping))
    expect(t.igst).toBe(t.taxTotal)
  })

  it('per-rate breakup tax sums to taxTotal', () => {
    const t = computeTotals(items, meta())
    const summed = round2(t.taxBreakup.reduce((s, b) => s + b.tax, 0))
    expect(summed).toBe(t.taxTotal)
  })

  it('empty invoice is all zeros', () => {
    const t = computeTotals([], meta())
    expect(t).toMatchObject({ subtotal: 0, taxable: 0, taxTotal: 0, grandTotal: 0 })
    expect(t.taxBreakup).toEqual([])
  })

  it('100% discount zeroes taxable and tax', () => {
    const t = computeTotals([item({ rate: 1000, taxPct: 18 })], meta({ discountPct: 100 }))
    expect(t.discount).toBe(1000)
    expect(t.taxable).toBe(0)
    expect(t.taxTotal).toBe(0)
    expect(t.grandTotal).toBe(0)
  })

  it('clamps out-of-range discount to 100%', () => {
    const t = computeTotals([item({ rate: 500, taxPct: 0 })], meta({ gstMode: 'none', discountPct: 999 }))
    expect(t.taxable).toBe(0)
  })

  it('ignores negative shipping (clamped to 0)', () => {
    const t = computeTotals([item({ rate: 100, taxPct: 0 })], meta({ gstMode: 'none', shipping: -50 }))
    expect(t.grandTotal).toBe(100)
  })

  it('non-finite / negative tax rate treated as 0%', () => {
    const t = computeTotals([item({ rate: 100, taxPct: -5 }), item({ rate: 100, taxPct: NaN })], meta())
    expect(t.taxTotal).toBe(0)
    expect(t.grandTotal).toBe(200)
  })
})

describe('round2 edge cases', () => {
  it('is idempotent', () => {
    expect(round2(round2(2.675))).toBe(round2(2.675))
  })
  it('handles negatives and zero', () => {
    expect(round2(-1.005)).toBe(-1) // -1.005 -> -1.00 under EPSILON-nudged half-up
    expect(round2(0)).toBe(0)
  })
})

describe('formatMoney currency handling', () => {
  it('falls back to INR for unknown currency code', () => {
    expect(formatMoney(1000, 'ZZZ')).toBe(formatMoney(1000, 'INR'))
  })
  it('JPY has no fraction digits', () => {
    expect(formatMoney(1000, 'JPY')).not.toContain('.')
  })
  it('USD formats with cents', () => {
    expect(formatMoney(1234.5, 'USD')).toContain('1,234.50')
  })
})

describe('amountToWords edge cases', () => {
  it('prefixes Minus for negative amounts', () => {
    expect(amountToWords(-5, 'INR')).toBe('Minus Rupees Five only')
  })
  it('omits paise/cents when zero', () => {
    expect(amountToWords(100, 'INR')).toBe('Rupees One Hundred only')
    expect(amountToWords(100, 'USD')).toBe('USD One Hundred only')
  })
  it('USD cents use western words', () => {
    expect(amountToWords(1.25, 'USD')).toBe('USD One and Cents Twenty Five only')
  })
})
