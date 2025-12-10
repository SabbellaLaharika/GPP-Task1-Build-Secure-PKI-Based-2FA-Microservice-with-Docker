#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const OTPAuth = require('otpauth');

/**
 * Cron script to log 2FA codes every minute
 * Runs automatically via cron daemon
 */

// Helper function: Convert buffer to base32
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

try {
    // Step 1: Read hex seed from persistent storage
    const seedPath = '/data/seed.txt';
    
    if (!fs.existsSync(seedPath)) {
        throw new Error('Seed file not found');
    }
    
    const hexSeed = fs.readFileSync(seedPath, 'utf8').trim();
    
    // Step 2: Generate current TOTP code
    const seedBuffer = Buffer.from(hexSeed, 'hex');
    const seedBase32 = base32Encode(seedBuffer);
    
    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: seedBase32
    });
    
    const code = totp.generate();
    
    // Step 3: Get current UTC timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    
    // Step 4: Output formatted line
    // Format: "YYYY-MM-DD HH:MM:SS - 2FA Code: [code]"
    const output = `${timestamp} - 2FA Code: ${code}`;
    console.log(output);
    
} catch (error) {
    // Handle file not found errors gracefully
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    console.error(`${timestamp} - ERROR: ${error.message}`);
    process.exit(1);
}