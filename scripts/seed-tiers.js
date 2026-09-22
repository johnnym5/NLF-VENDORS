/**
 * Script to seed the initial booth tiers for NLF Vendors.
 * 
 * Usage:
 * 1. Ensure you have firebase-admin installed: `npm install firebase-admin`
 * 2. Set your Google application credentials or use a service account key file.
 *    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-file.json"
 * 3. Run the script: `node scripts/seed-tiers.js`
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// If GOOGLE_APPLICATION_CREDENTIALS is set, applicationDefault() will use it automatically.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

const tiers = [
  {
    id: 'tier_standard',
    data: {
      name: 'Standard Meat and Agro Stall',
      dimension: '3m x 3m Demarcated Stall',
      colorCode: 'sage',
      price: 150000,
      stock: 20,
      initialStock: 20,
      isLocked: false,
      perks: [
        'Demarcated floor space (3m x 3m)',
        'Basic signage holder',
        'Access to shared cold storage',
        'Festival programme listing',
        'Standard exhibitor badge (x2)'
      ],
      updatedAt: new Date().toISOString()
    }
  },
  {
    id: 'tier_culinary',
    data: {
      name: 'Premium Culinary and Pavilion',
      dimension: '6m x 3m Covered Pavilion',
      colorCode: 'champagne',
      price: 300000,
      stock: 15,
      initialStock: 15,
      isLocked: false,
      perks: [
        'Covered pavilion space (6m x 3m)',
        'Dedicated power outlet (13A)',
        'Premium signage and branding',
        'Priority cold storage access',
        'VIP exhibitor badge (x4)',
        'Festival catalogue feature'
      ],
      updatedAt: new Date().toISOString()
    }
  },
  {
    id: 'tier_corporate',
    data: {
      name: 'Corporate and Machinery Island',
      dimension: '9m x 6m Island Plot',
      colorCode: 'slate',
      price: 500000,
      stock: 10,
      initialStock: 10,
      isLocked: false,
      perks: [
        'Premium island plot (9m x 6m)',
        'Heavy machinery access lane',
        'Dedicated power supply (30A)',
        'Custom branding and signage package',
        'Private meeting area',
        'All-access exhibitor badge (x8)',
        'Sponsored feature in festival media'
      ],
      updatedAt: new Date().toISOString()
    }
  }
];

async function seedTiers() {
  console.log('Starting to seed booth tiers...');
  
  try {
    for (const tier of tiers) {
      const docRef = db.collection('booth_tiers').doc(tier.id);
      await docRef.set(tier.data, { merge: true });
      console.log(`Successfully seeded tier: ${tier.id}`);
    }
    
    console.log('All tiers have been seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tiers:', error);
    process.exit(1);
  }
}

seedTiers();
