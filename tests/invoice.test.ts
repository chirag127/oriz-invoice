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
