# Project Rules & Instructions

## Asset Preservation
- **DO NOT OVERWRITE** or modify the icons in `/public/icons/`. The user manages these manually via GitHub.
  - `/public/icons/icon-192.png`
  - `/public/icons/icon-512.png`

## Authentication
- Primary authentication is handled via **SheetDB** (`/services/sheetdbService.ts`).
- Any changes to login logic must verify against the SheetDB state (Active/Expiry).
