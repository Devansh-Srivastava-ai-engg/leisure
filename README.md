# DukaanKhata (दुकान खाता) 🏪
### Production-Ready, Ultra-Fast PWA for Micro-Retailers
*(Panwadi Shops, Chai Tapris, and Local Kirana Stalls)*

Built with **React 19, Vite, Tailwind CSS v4, Lucide Icons, Zustand, Dexie.js (IndexedDB), and VitePWA**.

---

## ⚡ Highlights & Key Features

### 1. High-Speed, Touch-First UI (Outdoor Sunlight Optimized)
- **One-handed thumb operation**: Core workflows complete in under 3 seconds.
- **Large touch targets**: All key interactive buttons are $\ge 48\text{px}-56\text{px}$ high.
- **Sunlight Mode (धूप मोड)**: Top header toggle applying high contrast & saturation overrides for bright outdoor readability.
- **Bilingual Interface**: 1-tap header button instantly toggles between **Hindi (हिंदी)** and **English** across all tabs, buttons, labels, and audio feedback.
- **Spoken Audio Confirmations**: Uses Web SpeechSynthesis API to speak out transaction confirmations in Hindi/English (e.g. *"₹20 udhar jud gaya"*, *"₹50 jama mila"*), alongside synthesized Web Audio API metallic chimes and haptic vibrations (`navigator.vibrate`).

### 2. Four Primary Navigation Views
- 📖 **Ledger (खाता)**:
  - Horizontal scrolling carousel of **Pinned Regulars (पक्के ग्राहक)** with avatars and live balance badges.
  - Fast search by customer name, phone number, or notes.
  - **Fast Input Module**: One-tap currency chips (`+₹10`, `+₹20`, `+₹50`, `+₹100`, `+₹200`, `+₹500`), custom numeric keypad with dedicated **Jama / जमा** (Received - Green) and **Udhar / उधार** (Given - Red) buttons.
  - **1-Click WhatsApp Payment Link**: Sends preformatted message with dynamic UPI string: `upi://pay?pa={upi}&pn={shop}&am={balance}&cu=INR`.
  - In-person **UPI QR Code** modal for counter scanning.
  - **Credit Limit Warnings**: Customers highlighted in amber/red when unpaid credit exceeds threshold (e.g. $> ₹500$).
- ☕ **Quick Counter (सामान)**:
  - Presets grid: Cutting Chai, Cigarettes, Pan Masala, Cold Drinks, Chips, Lighter, Biscuits.
  - **Loose Unit Breakdown Engine**: 1 Box = 10 Packs = 100 Sticks. Granular stock deduction down to individual sticks/cups.
  - Profit margin % calculator: Cost vs selling price per loose unit.
  - Low-stock badge pulsing alerts when fast-moving items drop below safe levels.
  - Fast Cart Drawer: 1-tap "Sell Cash", "Sell UPI", or "Add to Customer Udhar".
- 💵 **Cash Drawer (रोकड़)**:
  - Physical Note Counter: Row tallies for ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 notes and Coins with `+` / `-` steppers.
  - Auto-reconciliation formula:
    $$\text{Expected Cash} = \text{Starting Drawer} + \text{Cash Sales} + \text{Jama Received} - \text{Cash Expenses}$$
  - Live Discrepancy indicator: Surplus (+₹), Deficit (-₹), or Perfect Match (₹0).
  - Single-tap "Close Day Register" with confirmation modal, confetti, and audio confirmation.
  - "+ Record Shop Expense" button (milk, ice, lemons, electricity, etc.).
- 📊 **Day Summary (दैनिक हिसाब)**:
  - KPI Snapshot: Total Turnover, Cash in Hand, UPI Bank Received, Today's Udhar Given, Today's Recovery, Total Market Credit Owed.
  - Breakdown of top selling items today.
  - 1-click **WhatsApp Daily Business Report** sharing.
  - Full JSON database export & backup.
- 🚚 **Wholesale Suppliers (सप्लायर)**:
  - Dedicated sub-tab to track supplier bills received (+ owed) and distributor payments made (- owed).

### 3. Voice-to-Ledger (Hands-Free Entry)
- Persistent floating microphone button.
- Speech Recognition API listening for colloquial Hindi, Hinglish, and English phrases (*"Sharma ji 30 rupaye udhar"*, *"Ramesh 50 jama"*, *"Cold drink 40 cash"*).
- Client-side parser extracting Customer Name, Amount, and Transaction Type.
- 3-second animated auto-confirm countdown bar with manual override before committing.
- 1-tap test simulation chips for rapid desktop testing.

### 4. Offline-First & Sync Architecture
- **Dexie.js (IndexedDB)**: Zero network latency. All reads and writes occur locally first.
- **Sync Outbox (`sync_outbox`)**: Tracks mutations with sync state and pushes batched JSON deltas whenever network connection is detected.
- **PWA Capabilities**: Service worker caching, Web App Manifest (`manifest.webmanifest`), portrait orientation lock, mobile viewport locking.

### 5. Production Backend Engine
- **Engine**: Node.js + Express + TypeScript (`tsx`) + **SQLite in Write-Ahead Logging (WAL) Mode**.
- **Delta Sync (`POST /api/sync`)**: Processes batched mutations (`CREATE`, `UPDATE`, `DELETE`) with atomic ACID transactions and Last-Write-Wins conflict resolution.
- **Multi-Device Pull (`GET /api/pull?since=...`)**: Synchronizes multiple devices (owner's smartphone, cashier tablet, home PC).
- **Automated Audit Trail**: Logs every client mutation payload into `sync_audit_log`.
- **Cloud Backup & Restore (`GET /api/backup`, `POST /api/backup/restore`)**: Instant full-database JSON snapshots.
- **REST APIs**: Full CRUD for `/api/customers`, `/api/transactions`, `/api/inventory`, `/api/registers`, `/api/vendors`, and `/api/health`.

---

## 🚀 Running Locally

```bash
# 1. Install all dependencies
npm install

# 2. Start the Backend API Server (Port 5000)
npm run server

# 3. In another terminal, start the PWA Client (Port 5173)
npm run dev

# 4. Production build with PWA Service Worker
npm run build
npm run preview
```

### 📡 Backend API Endpoints
- `GET  /api/health` — System status, uptime, and database row counts
- `POST /api/sync` — Push batched client mutations
- `GET  /api/pull` — Pull changes modified since timestamp
- `GET  /api/customers` — Search & list customer ledgers
- `GET  /api/customers/:id` — Customer detail & transaction history
- `POST /api/customers` — Create customer
- `GET  /api/transactions` — Transaction feed with filters
- `POST /api/transactions` — Record new transaction
- `GET  /api/inventory` — Micro-inventory items & loose stock levels
- `PUT  /api/inventory/:id/stock` — Adjust loose unit stock
- `GET  /api/registers/today` — Today's active cash drawer tally
- `POST /api/registers/close` — Close daily register
- `GET  /api/vendors` — Wholesale suppliers & balance owed
- `POST /api/vendors/transactions` — Log supplier bills and payments
- `GET  /api/backup` — Download complete JSON database dump
- `POST /api/backup/restore` — Restore from backup dump

