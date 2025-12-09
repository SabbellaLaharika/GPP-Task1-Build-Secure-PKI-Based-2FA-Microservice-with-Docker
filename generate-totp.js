const fs = require('fs');
const OTPAuth = require('otpauth');

/**
 * Generate current TOTP code from hex seed
 * 
 * TOTP Configuration:
 * - Algorithm: SHA-1 (default for most TOTP libraries)
 * - Period: 30 seconds
 * - Digits: 6
 * - Seed format: Convert hex seed to base32, then use with TOTP library
 * 
 * @param {string} hexSeed - 64-character hex string
 * @returns {string} - 6-digit TOTP code as string (e.g., "123456")
 */
function generateTotpCode(hexSeed) {
    console.log('Starting TOTP generation...\n');
    
    // Step 1: Convert hex seed to bytes
    console.log('Step 1: Converting hex seed to bytes...');
    const seedBuffer = Buffer.from(hexSeed, 'hex');
    console.log(`  - Seed buffer size: ${seedBuffer.length} bytes`);
    
    // Step 2: Convert bytes to base32 encoding
    console.log('\nStep 2: Converting bytes to base32 encoding...');
    const seedBase32 = base32Encode(seedBuffer);
    console.log(`  - Base32 seed length: ${seedBase32.length} characters`);
    console.log(`  - Base32 seed (first 20 chars): ${seedBase32.substring(0, 20)}...`);
    
    // Step 3: Create TOTP object using TOTP library
    console.log('\nStep 3: Creating TOTP object...');
    console.log('  - Algorithm: SHA-1');
    console.log('  - Period: 30 seconds');
    console.log('  - Digits: 6');
    
    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: seedBase32
    });
    
    // Step 4: Generate current TOTP code
    console.log('\nStep 4: Generating current TOTP code...');
    const code = totp.generate();
    console.log(`  - Generated code: ${code}`);
    
    // Calculate remaining time
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = 30 - (now % 30);
    console.log(`  - Valid for: ${remainingSeconds} seconds`);
    
    // Step 5: Return the code
    console.log('\nStep 5: TOTP generation complete!\n');
    return code;
}

/**
 * Verify TOTP code with time window tolerance
 * 
 * @param {string} hexSeed - 64-character hex string
 * @param {string} code - 6-digit code to verify
 * @param {number} validWindow - Number of periods before/after to accept (default 1 = ±30s)
 * @returns {boolean} - True if code is valid, False otherwise
 */
function verifyTotpCode(hexSeed, code, validWindow = 1) {
    console.log('Starting TOTP verification...\n');
    
    // Step 1: Convert hex seed to base32 (same process as generation)
    console.log('Step 1: Converting hex seed to base32...');
    const seedBuffer = Buffer.from(hexSeed, 'hex');
    const seedBase32 = base32Encode(seedBuffer);
    
    // Step 2: Create TOTP object with base32 seed
    console.log('Step 2: Creating TOTP object...');
    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: seedBase32
    });
    
    // Step 3: Verify code with time window tolerance
    console.log(`Step 3: Verifying code with ±${validWindow} period tolerance (±${validWindow * 30}s)...\n`);
    
    const delta = totp.validate({
        token: code,
        window: validWindow
    });
    
    // Library returns the time delta if valid, null if invalid
    const isValid = delta !== null;
    
    console.log(`Verification result: ${isValid ? '✓ VALID' : '✗ INVALID'}`);
    if (isValid) {
        console.log(`  - Time delta: ${delta} periods`);
    }
    
    // Step 4: Return verification result
    return isValid;
}

/**
 * Helper function: Convert buffer to base32 encoding
 * Base32 alphabet: A-Z, 2-7
 */
function base32Encode(buffer) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
            output += base32Chars[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += base32Chars[(value << (5 - bits)) & 31];
    }

    return output;
}

// Main execution
try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('              TOTP CODE GENERATION');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Read decrypted seed
    const seedPath = 'data/seed.txt';
    console.log(`Reading decrypted seed from ${seedPath}...`);
    const hexSeed = fs.readFileSync(seedPath, 'utf8').trim();
    console.log('✓ Seed loaded\n');
    
    // Validate seed format
    if (hexSeed.length !== 64 || !/^[0-9a-f]{64}$/i.test(hexSeed)) {
        throw new Error('Invalid seed format: must be 64 hexadecimal characters');
    }
    
    // Generate TOTP code
    const code = generateTotpCode(hexSeed);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    RESULT');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n  Current TOTP Code: ${code}`);
    
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = 30 - (now % 30);
    console.log(`  Valid for: ${remainingSeconds} seconds`);
    console.log('\n═══════════════════════════════════════════════════════\n');
    
    // Test verification
    console.log('Testing verification function...\n');
    const isValid = verifyTotpCode(hexSeed, code);
    console.log(`\n✅ Verification test: ${isValid ? 'PASSED' : 'FAILED'}\n`);
    
    console.log('✅ Step 6 Complete! TOTP generation working correctly.\n');
    
} catch (error) {
    console.error('\n❌ TOTP generation failed:', error.message);
    console.error('\nPossible causes:');
    console.error('  1. Missing seed.txt file (run decrypt-seed.js first)');
    console.error('  2. Invalid seed format');
    console.error('  3. Missing otpauth package (run: npm install otpauth)\n');
    process.exit(1);
}