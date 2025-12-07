const fs = require('fs');
const crypto = require('crypto');

try {
    const key = fs.readFileSync('instructor_public.pem', 'utf8');
    const publicKey = crypto.createPublicKey(key);
    
    console.log('✅ Key is valid!');
    console.log('Key type:', publicKey.asymmetricKeyType);
    console.log('Key size:', publicKey.asymmetricKeyDetails.modulusLength, 'bits');
} catch (error) {
    console.log('❌ Invalid key:', error.message);
}