# National Livestock Festival 2026 — Vendor Exhibition Portal

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFA611?style=flat&logo=firebase)](https://firebase.google.com/)

Official commercial exhibition booth reservation, allocation management, and digital accreditation portal for the **National Livestock Festival (NLF) 2026**, organized in collaboration with the **Federal Ministry of Livestock Development**, Abuja, Nigeria.

---

## 📌 About The Project

The **NLF Vendors Portal** provides a centralized, streamlined digital procurement and management platform for commercial exhibitors, agro-dealers, livestock breeders, food vendors, and corporate sponsors attending the 2026 festival.

From initial booth discovery and tier selection to automated stall assignment and verifiable digital permits, the portal replaces manual paperwork with a high-trust, real-time booking and secretariat management system.

---

## 🚀 Key Features

### 🛒 Exhibitor & Vendor Portal
* **Live Booth Discovery:** Interactive tier catalog displaying dimensions, live inventory counts, pricing, and bundled perks.
* **Sector-Specific Classification:** Supports specialized industry categories:
  * Fresh Meat and Loins
  * Halal Culinary & Food Service
  * Livestock Breeding & Genetics
  * Agricultural & Farm Machinery
  * Cold-Chain Logistics & Storage
  * Veterinary Tech & Pharmaceuticals
* **Secure Authentication:** Firebase-powered email and password authentication for vendor accounts.
* **Checkout & Booking Pipeline:** Order processing with payment reference capture and real-time inventory decrement.
* **Digital Exhibition Permit & QR Pass:** Real-time digital booth pass featuring assigned booth numbers (e.g., `ST-01`, `PV-04`), official status badges, and scannable QR verification for on-site accreditation desks.

### 🛡️ Administration & Secretariat Portal (`/admin/booths`)
* **Real-Time Inventory Control:** Monitor booth stock across tiers, adjust unit prices, and lock/unlock tiers to halt or release booking quotas.
* **Order Oversight & Directory:** Comprehensive database of vendor applications, payment references, and company contacts.
* **Automated & Manual Booth Allocation:** Assign designated plot numbers or modify placements directly.
* **Revocation & Compliance:** Formal permit revocation workflow with mandatory reason logging and immediate vendor-side status sync.

---

## 🎪 Exhibition Tiers

| Tier | Dimensions | Pricing | Key Inclusions |
| :--- | :--- | :--- | :--- |
| **Standard Stall** | 3m × 3m Demarcated Stall | ₦150,000 | Demarcated floor space, basic signage, shared cold storage, 2 exhibitor badges |
| **Premium Pavilion** | 6m × 3m Covered Pavilion | ₦300,000 | Covered space, dedicated 13A power outlet, VIP exhibitor badges (×4), priority cold storage |
| **Corporate Island** | 9m × 6m Island Plot | ₦500,000 | Heavy machinery lane, dedicated 30A power, private meeting area, all-access badges (×8), media feature |

---

## 🛠️ Technology Stack

* **Frontend:** [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) with a bespoke executive palette:
  * **Sage Green** (`#1E4D38`) — Standard & Agricultural Stalls
  * **Champagne Gold** (`#8D6B1B`) — Premium & Culinary Pavilions
  * **Slate Gray** (`#1F2937`) — Corporate & Machinery Plots
* **Backend & Database:** [Google Firebase Firestore](https://firebase.google.com/docs/firestore) (Real-time snapshots, transactions & security rules)
* **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
* **Utilities & Icons:** [Lucide React](https://lucide.dev/), [`qrcode.react`](https://www.npmjs.com/package/qrcode.react)

---

## 📂 Project Structure

```text
NLF-VENDORS/
├── public/                     # Static assets and icons
├── scripts/                    # Database initialization & administrative scripts
│   ├── seed-client.mjs         # Client SDK tier seeder
│   ├── seed-tiers.js           # Firebase Admin SDK seeder
│   └── set-admin-claim.js      # Script to set admin custom claims
├── src/
│   ├── app/
│   │   ├── admin/booths/       # Secretariat booth management dashboard
│   │   ├── booths/             # Vendor booth catalog
│   │   │   ├── checkout/       # Checkout & booking submission
│   │   │   └── permit/         # Digital exhibition permit & QR display
│   │   ├── login/              # Vendor login & authentication
│   │   ├── setup/              # First-time tier setup utility
│   │   ├── globals.css         # Global Tailwind styles & color tokens
│   │   ├── layout.tsx          # Root app layout
│   │   └── page.tsx            # Main landing page
│   ├── components/ui/          # Accessible UI primitives (Alert, Badge, Button, Modal, etc.)
│   └── lib/                    # Core utilities, Firebase client, and type definitions
│       ├── auth.tsx            # Auth context provider & hooks
│       ├── design-tokens.ts    # Design constants & currency formatters
│       ├── firebase.ts         # Firebase client initialization
│       ├── firestore.ts        # Firestore data hooks & transaction helpers
│       └── types.ts            # TypeScript interfaces & sector enums
├── .env.local.example          # Sample environment variables template
├── firestore.rules             # Production Firestore security rules
├── next.config.mjs             # Next.js configuration
├── tailwind.config.ts          # Tailwind theme extensions
└── tsconfig.json               # TypeScript compiler config
```

---

## 🏁 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/johnnym5/NLF-VENDORS.git
cd NLF-VENDORS
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.local.example` to `.env.local` and populate with your Firebase credentials:
```bash
cp .env.local.example .env.local
```

Example configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

### 4. Seed Booth Tiers
Initialize the Firestore database with default exhibition tiers:
```bash
# Option A: Seed via browser
Navigate to http://localhost:3000/setup after running the dev server

# Option B: Seed via Node script
node scripts/seed-client.mjs
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Firestore Rules

Database access is protected by granular [firestore.rules](firestore.rules):
* **`booth_tiers`**: Publicly readable by all visitors; write operations restricted to authenticated administrators.
* **`booth_orders`**: Vendors can read only their own orders; order creation is restricted to verified users; administrative overrides and revocations require admin claims.

---

## 📄 License

Proprietary — Developed for the National Livestock Festival 2026 and the Federal Ministry of Livestock Development.
