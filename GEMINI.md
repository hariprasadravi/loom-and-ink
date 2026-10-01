# Pattupol (பட்டுப்போல்) - Technical Architecture & Developer Guide

## 1. Overview & Business Model
**Pattupol** (`www.pattupol.com`) is a boutique single-page web showroom for a mother-owned South Indian handloom & artisanal Kalamkari saree business. 
- **Catalog Model**: Products are curated and photographed locally, stored in Supabase, and presented in a catalog.
- **Conversion Flow**: Customers browse sarees by fabric type, view zoomable multi-image lightboxes, and click **"Enquire on WhatsApp"** to finalize sales directly with the owner over WhatsApp.
- **Hosting**: GitHub Pages deployed from the `main` branch to custom domain `www.pattupol.com` via Cloudflare CDN.

---

## 2. Tech Stack
- **Frontend Framework**: React 19 + Vite
- **Icons**: `lucide-react`
- **Database & Storage**: Supabase (PostgreSQL + S3-compatible Object Storage)
- **Local AI Processing**: `@imgly/background-removal` (in-browser ONNX / WebAssembly)
- **Testing**: Playwright E2E suite (`@playwright/test`)
- **Hosting & Deploy**: `gh-pages` npm package publishing `dist/`

---

## 3. Database & Storage Architecture (Supabase)
Connected via `src/utils/supabaseClient.js`.

### Tables
1. **`sarees`** (Primary inventory table):
   - `id` (text / uuid, primary key)
   - `code` (text, e.g. `LK-101`, `SC-201`)
   - `title` (text, e.g. `Indigo Peacock Kalamkari`)
   - `type` (text, category id e.g. `kalamkari`, `silk-cotton`, `soft-silk`)
   - `price` (text, active retail price in INR, e.g. `"4,800"`)
   - `original_price` (text, optional strike-through price for discounts, e.g. `"5,500"`)
   - `description` (text, artisanal storytelling / fabric details)
   - `image` (text, primary cover image path or full URL)
   - `images` (array of text, secondary gallery photos)
   - `sold` (boolean, marks item as Available or Sold Out)
   - `draft` (boolean, hides item from public showroom when true)
   - `created_at` (timestamp)

2. **Storage Buckets**:
   - `saree-photos`: Holds compressed, web-optimized saree photos uploaded from the Admin Panel.

---

## 4. Internationalization & Pricing Engine
Located in `src/utils/helpers.js` (`formatCurrency`) and `src/App.jsx`:

1. **Geolocation & Currency Detection**:
   - Client-side timezone detection (`Intl.DateTimeFormat().resolvedOptions().timeZone`) guesses local currency instantly on load (US timezones -> `USD`, Canada -> `CAD`, UK -> `GBP`, Europe -> `EUR`, India -> `INR`).
   - Bypasses ad-blockers and firewall restrictions with no initial network blocking.
   - Network fallback queries `open.er-api.com` for daily exchange rates relative to INR.
2. **International Shipping & Inflation Logic**:
   - **Non-India Audience (`targetCurrency !== 'INR'`)**: Available items (`!saree.sold`) have an international shipping markup baked in ($8 USD equivalent).
   - **US Audience (`USD`)**: Final price is automatically rounded to the **nearest multiple of $5** (e.g. $50, $55, $60, $65, $70) for clean retail display.
   - **Free Shipping Badge**: Displayed automatically on available items alongside discount tags in the showroom grid and zoom modal.
   - **Automated**: Mom enters standard domestic INR prices in Admin; all international conversions, markups, and badges apply on the fly in the presentation layer.

---

## 5. Admin Panel (`AdminPanel.jsx`)
- **Secret Route**: Accessed via URL parameter `?nirvahi` (e.g., `www.pattupol.com/?nirvahi`).
- **Features**:
  - Secure authentication via Supabase Auth.
  - Saree upload & editing form with multi-image gallery support.
  - Local AI background removal (uses static img.ly CDN assets with live percentage loader to clear backgrounds without crashing mobile browsers).
  - Store settings editor (custom category definitions, Aadi discount badges in Tamil/English, affiliate referral tags).
  - High-capacity stock manager with instant search by code/title and category filter chips.

---

## 6. Luxury Design System (`src/index.css`)
- **Theme**: Dark raw silk aesthetic.
- **Color Palette**:
  - Background: `#12100f` (Deep charcoal raw silk with subtle antique gold zari paisley *Booti* background pattern)
  - Cards: `#1c1917` (Muted dark slate)
  - Primary Accent: `#c5a059` (Muted Antique Zari Gold)
  - Price Highlight: `#e53e3e` (Warm terracotta/cardinal red)
  - Text: `#f4f0ec` (Warm linen off-white) and `#a39891` (Muted earthy grey)
- **Typography**:
  - Headings: `'Italiana', serif` (artistic brand logo) and `'Prata', serif` (titles)
  - Body: `'Inter', sans-serif`

---

## 7. Developer & Build Workflows

```bash
# 1. Install dependencies
npm install

# 2. Local development server
npm run dev

# 3. Production build
npm run build

# 4. Run Playwright E2E test suite
npm run test

# 5. Deploy live to GitHub Pages (www.pattupol.com)
npm run deploy
```

> **Note on Git**: Branch protection rules are enforced on `main`. Pushes directly to `main` must be made by repository owner (`hariprasadravi`) or via PR.
