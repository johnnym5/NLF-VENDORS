# National Livestock Festival 2026 — Vendor Exhibition Portal

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)

Official commercial exhibition booth reservation, allocation management, and digital accreditation portal for the **National Livestock Festival (NLF) 2026**, organized in collaboration with the **Federal Ministry of Livestock Development**, Abuja, Nigeria.

Live Production URL: [https://vendors.livestockcarnival.ng](https://vendors.livestockcarnival.ng)

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
* **Secure Authentication:** Supabase-powered email, password, and Google OAuth authentication for vendor accounts.
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
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend & Database:** [Supabase PostgreSQL](https://supabase.com/) (Real-time snapshots & transactions)
* **Authentication:** [Supabase Auth](https://supabase.com/docs/guides/auth)
* **Domain:** [vendors.livestockcarnival.ng](https://vendors.livestockcarnival.ng)

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
Copy `.env.local.example` to `.env.local` and populate with your Supabase credentials:
```bash
cp .env.local.example .env.local
```

Example configuration:
```env
NEXT_PUBLIC_SUPABASE_URL=https://bqwohpjschaditdkrdra.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HYjA-ZuSRTwNMTYBdsMfmA_Kvot5Ylg
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Setup Database
Run `supabase_schema.sql` in your Supabase SQL Editor.

### 5. Seed Booth Tiers
Initialize the database with default exhibition tiers:
Navigate to [https://vendors.livestockcarnival.ng/setup](https://vendors.livestockcarnival.ng/setup) or `http://localhost:3000/setup` after logging in as `admin@nlf.com`.

---

## 📄 License

Proprietary — Developed for the National Livestock Festival 2026 and the Federal Ministry of Livestock Development.
