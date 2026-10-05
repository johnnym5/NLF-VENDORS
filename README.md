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
* **Exhibitor Categories:** Separate catalogs and permits for Livestock Booths and Commercial Vendors, with one account able to apply across categories.
* **Configurable Applications:** Administrators can create categories and configure category-specific questions for future applicants.
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
* **Manual Bank Transfer:** Vendors can pay the exact approved reservation total by transfer and see live confirmation status.
* **Digital Exhibition Permit & QR Pass:** Real-time digital booth pass featuring assigned booth numbers (e.g., `ST-01`, `PV-04`), official status badges, and scannable QR verification for on-site accreditation desks.

### 🛡️ Administration & Secretariat Portal (`/admin/booths`)
* **Category-Specific Operations:** Switch between exhibitor sections to manage their independent tiers, applications, inventory, and permit sequences.
* **Real-Time Inventory Control:** Monitor booth stock across tiers, adjust unit prices, and lock/unlock tiers to halt or release booking quotas.
* **Order Oversight & Directory:** Comprehensive database of vendor applications, payment references, and company contacts.
* **Transfer Account & Review Queue:** Configure up to five event bank accounts and confirm, leave pending, or reject manual transfer submissions.
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
PAYSTACK_SECRET_KEY=sk_live_your-paystack-secret-key
NEXT_PUBLIC_PAYSTACK_PUBLISHABLE_KEY=pk_live_your-paystack-publishable-key
```

Set `NEXT_PUBLIC_PAYSTACK_PUBLISHABLE_KEY` in Hostinger's Node.js app environment. Set `PAYSTACK_SECRET_KEY` only as a Supabase Edge Function secret. The public and secret keys must belong to the same live or test account. Enable at least one payment channel in the Paystack Dashboard; this project currently requests card, bank, USSD, and bank transfer at checkout.

### 3a. Apply database migrations and deploy payment verification

Install and sign in to the [Supabase CLI](https://supabase.com/docs/guides/cli), then link this checkout to the Supabase project shown in `NEXT_PUBLIC_SUPABASE_URL` (`diimxnsmrhhouflgoqib`). From the repository root, run:

```bash
supabase login
supabase link --project-ref diimxnsmrhhouflgoqib
supabase db push
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_your-paystack-secret-key
supabase functions deploy verify-paystack-payment --no-verify-jwt
```

The manual bank transfer workflow is installed by the additive migration in `supabase/migrations/`. The migration creates bank account and transfer submission tables, access policies, and atomic payment review functions. Add or change the event bank accounts in **Admin → Booths → Manual Transfer Bank Accounts** after deployment.

Use the matching `sk_test_...` secret instead if the site uses a test public key. Set the matching `NEXT_PUBLIC_PAYSTACK_PUBLISHABLE_KEY` in Hostinger's Node.js app environment and redeploy the app so Next.js builds with it. Never put the Paystack secret key in a `NEXT_PUBLIC_` variable or browser code. Do not deploy until the CLI is linked to the intended project.

### 3b. Deploy the app on Hostinger

Connect the Git repository to a Hostinger Node.js Web App. Configure the required `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_PAYSTACK_PUBLISHABLE_KEY` environment variables in Hostinger before building. Set `PAYSTACK_SECRET_KEY` only in Supabase Function secrets. Use `npm install` for install, `npm run build` for build, and `npm run start` for startup; the app listens on the port provided by Hostinger. Redeploy after changing environment variables because `NEXT_PUBLIC_*` values are embedded during the build.

### 4. Setup Database
For a fresh project, run `supabase_schema.sql` in Supabase SQL Editor, then apply the repository migrations with `supabase db push`. Existing installations should apply new changes with `supabase db push`. The category correction migration classifies the existing booth catalog under Livestock Booths and seeds a separate three-tier Commercial Vendors catalog; both remain editable from the admin dashboard.

### 5. Seed Booth Tiers
Initialize the database with default exhibition tiers by visiting `/setup` after signing in with an admin account.

---

## 📄 License

Proprietary — Developed for the National Livestock Festival 2026 and the Federal Ministry of Livestock Development.
