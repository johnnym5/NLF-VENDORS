import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC-1KT3w2wkRLsv9iMzM225hiJmmRlfrpQ",
  authDomain: "nlf-vendors.firebaseapp.com",
  projectId: "nlf-vendors",
  storageBucket: "nlf-vendors.firebasestorage.app",
  messagingSenderId: "537202804304",
  appId: "1:537202804304:web:adae76f2e489b115e0f355",
  measurementId: "G-EELWXJVV7Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tiers = [
  {
    id: 'tier_standard',
    data: {
      id: 'tier_standard',
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
      id: 'tier_culinary',
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
      id: 'tier_corporate',
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

async function seed() {
  console.log('Seeding booth tiers into Firestore...');
  for (const tier of tiers) {
    await setDoc(doc(db, 'booth_tiers', tier.id), tier.data, { merge: true });
    console.log(`Seeded tier: ${tier.data.name} (${tier.id})`);
  }
  console.log('All booth tiers seeded successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Error seeding tiers:', err.message);
  process.exit(1);
});
