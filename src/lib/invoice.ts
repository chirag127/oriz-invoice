// Pure invoice logic — currency, tax, totals, number-to-words. Framework-free, unit-tested.

export interface LineItem {
  id: string
  description: string
  qty: number
  rate: number
  taxPct: number // per-line GST/tax rate %
}

export interface Party {
  name: string
  gstin: string
  address: string
  email: string
  phone: string
}

export interface InvoiceMeta {
  number: string
  date: string // ISO yyyy-mm-dd
  dueDate: string
  currency: string // ISO 4217
  notes: string
  terms: string
  logo: string // data URL
  discountPct: number
  shipping: number
  gstMode: 'none' | 'intra' | 'inter' // none | CGST+SGST | IGST
}

export interface Totals {
  subtotal: number
  discount: number
  taxable: number
  taxTotal: number
  cgst: number
  sgst: number
  igst: number
  shipping: number
  grandTotal: number
  taxBreakup: { pct: number; taxable: number; tax: number }[]
}

export const CURRENCIES: { code: string; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
  { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', locale: 'en-CA' },
  { code: 'SGD', symbol: 'S$', locale: 'en-SG' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
]

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function lineAmount(item: LineItem): number {
  return round2(Math.max(0, item.qty) * Math.max(0, item.rate))
}

/** Compute all invoice totals. Discount applied pre-tax on subtotal, pro-rated per line. */
export function computeTotals(items: LineItem[], meta: InvoiceMeta): Totals {
  const subtotal = round2(items.reduce((s, it) => s + lineAmount(it), 0))
  const discountPct = clampPct(meta.discountPct)
  const discount = round2((subtotal * discountPct) / 100)
  const discountFactor = subtotal > 0 ? (subtotal - discount) / subtotal : 1

  const breakupMap = new Map<number, { taxable: number; tax: number }>()
  let taxTotal = 0
  let taxable = 0
  for (const it of items) {
    const gross = lineAmount(it)
    const net = round2(gross * discountFactor)
    taxable += net
    const pct = meta.gstMode === 'none' ? 0 : clampPct(it.taxPct)
    const tax = round2((net * pct) / 100)
    taxTotal += tax
    const prev = breakupMap.get(pct) ?? { taxable: 0, tax: 0 }
    breakupMap.set(pct, { taxable: round2(prev.taxable + net), tax: round2(prev.tax + tax) })
  }
  taxable = round2(taxable)
  taxTotal = round2(taxTotal)

  const taxBreakup = [...breakupMap.entries()]
    .filter(([pct]) => pct > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([pct, v]) => ({ pct, taxable: v.taxable, tax: v.tax }))

  let cgst = 0
  let sgst = 0
  let igst = 0
  if (meta.gstMode === 'intra') {
    cgst = round2(taxTotal / 2)
    sgst = round2(taxTotal - cgst)
  } else if (meta.gstMode === 'inter') {
    igst = taxTotal
  }

  const shipping = round2(Math.max(0, meta.shipping || 0))
  const grandTotal = round2(taxable + taxTotal + shipping)

  return { subtotal, discount, taxable, taxTotal, cgst, sgst, igst, shipping, grandTotal, taxBreakup }
}

function clampPct(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  return n > 100 ? 100 : n
}

export function currencyOf(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

export function formatMoney(n: number, code: string): string {
  const c = currencyOf(code)
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.code,
      minimumFractionDigits: c.code === 'JPY' ? 0 : 2,
    }).format(n)
  } catch {
    return `${c.symbol}${n.toFixed(2)}`
  }
}

// ---- INR number-to-words (Indian numbering: lakh/crore) ----
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return TENS[t] + (o ? ' ' + ONES[o] : '')
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100)
  const rest = n % 100
  let s = ''
  if (h) s += ONES[h] + ' Hundred'
  if (rest) s += (h ? ' ' : '') + twoDigits(rest)
  return s
}

/** Indian-system words for an integer. */
export function intToIndianWords(num: number): string {
  if (num === 0) return 'Zero'
  let n = Math.floor(Math.abs(num))
  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const hundred = n
  if (crore) parts.push(intToIndianWords(crore) + ' Crore')
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh')
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand')
  if (hundred) parts.push(threeDigits(hundred))
  return parts.join(' ').trim()
}

/** "Rupees … and paise … only" for INR; generic major/minor for others. */
export function amountToWords(amount: number, code: string): string {
  const c = currencyOf(code)
  const neg = amount < 0
  const abs = Math.abs(amount)
  const major = Math.floor(abs)
  const minor = Math.round((abs - major) * 100)
  const majorName = code === 'INR' ? 'Rupees' : c.code
  const minorName = code === 'INR' ? 'Paise' : 'Cents'
  const words =
    code === 'INR'
      ? intToIndianWords(major)
      : intToWesternWords(major)
  let out = `${majorName} ${words}`
  if (minor > 0) out += ` and ${minorName} ${code === 'INR' ? twoDigits(minor) : intToWesternWords(minor)}`
  out += ' only'
  return (neg ? 'Minus ' : '') + out
}

function intToWesternWords(num: number): string {
  if (num === 0) return 'Zero'
  let n = Math.floor(Math.abs(num))
  const scales = ['', ' Thousand', ' Million', ' Billion', ' Trillion']
  const groups: number[] = []
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i]) parts.push(threeDigits(groups[i]) + scales[i])
  }
  return parts.join(' ').trim()
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function blankItem(): LineItem {
  return { id: uid(), description: '', qty: 1, rate: 0, taxPct: 18 }
}

export function nextInvoiceNumber(prev?: string): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const match = prev?.match(/(\d+)\s*$/)
  const seq = match ? String(Number(match[1]) + 1).padStart(3, '0') : '001'
  return `INV-${y}${m}-${seq}`
}
