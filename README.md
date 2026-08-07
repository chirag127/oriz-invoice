# oriz-invoice

Free GST-aware invoice generator. 100% in your browser.

- **Live app:** https://invoice.oriz.in
- **About / info:** https://chirag127.github.io/oriz-invoice/
- **llms.txt:** https://invoice.oriz.in/llms.txt

Line items with live totals, tax (CGST/SGST or IGST), multi-currency, your logo,
client details, print → PDF, amount-in-words. Autosaves to your browser.

**100% client-side — no upload, no signup, no server, free.** Your invoice data
never leaves the browser; it is stored only in `localStorage` on your device.

## Features

- Line items — description, qty, rate, per-line tax %, live amount
- Auto totals — subtotal, discount, tax, shipping, grand total
- GST modes — no tax · CGST+SGST (intra-state) · IGST (inter-state), with tax breakup by rate
- Currency — INR, USD, EUR, GBP, AED, AUD, CAD, SGD, JPY (locale-correct formatting)
- INR-aware amount-in-words (lakh/crore) + western scale for others
- Logo — click or drag-drop an image
- Client + business details incl. GSTIN
- Print → PDF (scoped print stylesheet), receipt-paper preview
- Export / import invoice as JSON
- Autosave to `localStorage`
- Optional AI (via `@chirag127/oz-ai`, g4f multi-provider failover, no key): draft payment terms / scope + suggest line wording. Degrades gracefully if offline.

## Tech

Astro (static) + React 19 islands + Tailwind v4. Shared atomic packages:
`@chirag127/oz-tokens-base`, `@chirag127/oz-chrome`, `@chirag127/oz-file`,
`@chirag127/oz-ai`. Pure logic (totals, tax, number-to-words) unit-tested with vitest.
Installable PWA. Hosted on Cloudflare Pages.

## Develop

```bash
npm install --legacy-peer-deps
npm run dev      # local dev
npm test         # vitest — pure logic
npm run build    # static build → dist/
npm run deploy   # build + wrangler pages deploy
```

## License

MIT © 2026 Chirag Singhal
