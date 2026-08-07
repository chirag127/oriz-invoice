# PWABuilder — package oriz Invoice for the stores

Live URL: **https://invoice.oriz.in**

| Field | Value |
|---|---|
| Android package id | `in.oriz.invoice` |
| Signing SHA-256 | `0C:82:DB:11:57:7E:21:8D:62:1E:54:DF:3B:33:D1:29:6E:77:56:80:36:22:C1:99:36:DF:03:D3:6F:0D:30:36` |
| Digital Asset Links | https://invoice.oriz.in/.well-known/assetlinks.json |
| Manifest | https://invoice.oriz.in/manifest.webmanifest |

## Steps

1. Open https://www.pwabuilder.com
2. Enter URL `https://invoice.oriz.in`
3. **Package For Stores**:
   - **Android** — use the existing signing key, package `in.oriz.invoice` (SHA-256 above; matches `assetlinks.json` for TWA verification).
   - **Windows** — MSIX package.
   - **iOS** — Xcode project.

Assetlinks fingerprint must match the key you sign the Android build with, else deep-link verification fails.
