const crypto = require('crypto');
const fs = require('fs');

// Generate RSA 4096-bit key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicExponent: 65537,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

// Save keys to files
fs.writeFileSync('student_private.pem', privateKey);
fs.writeFileSync('student_public.pem', publicKey);

console.log('Keys generated successfully!');
console.log('\nPublic Key:\n', publicKey);
console.log('\nPrivate Key:\n', privateKey);