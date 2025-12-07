const crypto = require('crypto');
const fs = require('fs');

/**
 * Decrypt base64-encoded encrypted seed using RSA/OAEP
 * 
 * Decryption Algorithm: RSA/OAEP with SHA-256
 * Critical Parameters:
 * - Padding: OAEP (Optimal Asymmetric Encryption Padding)
 * - MGF: MGF1 with SHA-256
 * - Hash Algorithm: SHA-256
 * - Label: None
 * 
 * @param {string} encryptedSeedB64 - Base64-encoded ciphertext
 * @param {string} privateKey - RSA private key object
 * @returns {string} - Decrypted hex seed (64-character string)
 */
function decryptSeed(encryptedSeedB64, privateKey) {
    console.log('Starting decryption process...\n');
    
    // Step 1: Base64 decode the encrypted seed string
    console.log('Step 1: Base64 decoding encrypted seed...');
    const encryptedBuffer = Buffer.from(encryptedSeedB64, 'base64');
    console.log(`  - Encrypted data size: ${encryptedBuffer.length} bytes`);
    
    // Step 2: RSA/OAEP decrypt with SHA-256
    console.log('\nStep 2: RSA/OAEP decryption with SHA-256...');
    console.log('  - Padding: OAEP');
    console.log('  - MGF: MGF1(SHA-256)\n[MGF =  Mask Generation Function]');
    console.log('  - Hash: SHA-256');
    console.log('  - Label: None');
    
    const decryptedBuffer = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        encryptedBuffer
    );
    
    // Step 3: Decode bytes to UTF-8 string
    console.log('\nStep 3: Decoding bytes to UTF-8 string...');
    const hexSeed = decryptedBuffer.toString('utf8');
    
    // Step 4: Validate - must be 64-character hex string
    console.log('\nStep 4: Validating decrypted seed...');
    console.log(`  - Length: ${hexSeed.length} characters`);
    
    if (hexSeed.length !== 64) {
        throw new Error(`Invalid seed length: expected 64, got ${hexSeed.length}`);
    }
    
    // Check all characters are in '0123456789abcdef'
    const hexPattern = /^[0-9a-f]{64}$/i;
    if (!hexPattern.test(hexSeed)) {
        throw new Error('Invalid seed format: must be 64 hexadecimal characters');
    }
    
    console.log('  ✓ Seed is valid 64-character hex string');
    
    // Step 5: Return hex seed
    console.log('\nStep 5: Decryption successful!\n');
    return hexSeed;
}

// Main execution
try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('         SEED DECRYPTION USING RSA/OAEP');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Read encrypted seed from file
    console.log('Reading encrypted seed from encrypted_seed.txt...');
    const encryptedSeed = fs.readFileSync('encrypted_seed.txt', 'utf8').trim();
    console.log('✓ Encrypted seed loaded\n');
    
    // Read private key
    console.log('Loading student private key...');
    const privateKey = fs.readFileSync('student_private.pem', 'utf8');
    console.log('✓ Private key loaded\n');
    
    // Decrypt the seed
    const decryptedSeed = decryptSeed(encryptedSeed, privateKey);
    
    // Display result
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    RESULT');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nDecrypted Seed (64-character hex):');
    console.log(decryptedSeed);
    console.log('\n═══════════════════════════════════════════════════════\n');
    
    // Store at /data/seed.txt (for Docker container usage later)
    // For now, we'll save it locally
    console.log('Saving decrypted seed to seed.txt...');
    fs.writeFileSync('seed.txt', decryptedSeed, { mode: 0o600 });
    console.log('✓ Seed saved to: seed.txt');
    
    console.log('\n✅ Step 5 Complete! Decrypted seed ready for TOTP generation.');
    console.log('\n⚠️  IMPORTANT: Keep this seed secure and do NOT commit to Git!\n');
    
} catch (error) {
    console.error('\n❌ Decryption failed:', error.message);
    console.error('\nPossible causes:');
    console.error('  1. Wrong private key');
    console.error('  2. Corrupted encrypted seed');
    console.error('  3. Incorrect padding/hash parameters');
    console.error('  4. Missing encrypted_seed.txt file\n');
    process.exit(1);
}