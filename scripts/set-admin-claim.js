/**
 * Script to set the admin custom claim on a Firebase user.
 * 
 * Usage:
 * 1. Ensure you have firebase-admin installed: `npm install firebase-admin`
 * 2. Set your Google application credentials.
 *    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-file.json"
 * 3. Run the script passing the UID or email as an argument:
 *    node scripts/set-admin-claim.js user@example.com
 *    OR
 *    node scripts/set-admin-claim.js <uid>
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const auth = admin.auth();

async function setAdminClaim() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: Please provide a user email or UID as an argument.');
    console.log('Usage: node set-admin-claim.js <user-email-or-uid>');
    process.exit(1);
  }

  const identifier = args[0];
  let uid = identifier;

  try {
    // If it looks like an email, try to get the user by email first
    if (identifier.includes('@')) {
      try {
        const userRecord = await auth.getUserByEmail(identifier);
        uid = userRecord.uid;
        console.log(`Found user by email. UID: ${uid}`);
      } catch (error) {
        console.error(`Could not find user with email ${identifier}`);
        process.exit(1);
      }
    }

    // Set the custom claim
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`Successfully set admin claim for user with UID: ${uid}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  }
}

setAdminClaim();
