const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const OTPAuth = require('otpauth');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Load student private key
const privateKey = fs.readFileSync(path.join(__dirname, 'student_private.pem'), 'utf8');

// Paths for persistent storage (Docker volumes or local)
// In Docker: /data/seed.txt
// Local testing: ./seed.txt
const SEED_FILE = fs.existsSync('/data') ? '/data/seed.txt' : path.join(__dirname, 'seed.txt');

/**
 * Helper function: Convert buffer to base32
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

/**
 * Endpoint 1: POST /decrypt-seed
 * Decrypt encrypted seed using student private key
 */
app.post('/decrypt-seed', (req, res) => {
    try {
        const { encrypted_seed } = req.body;

        // Validate input
        if (!encrypted_seed) {
            return res.status(400).json({
                error: 'Missing encrypted_seed parameter'
            });
        }

        console.log('Decrypting seed...');

        // Base64 decode the encrypted_seed
        const encryptedBuffer = Buffer.from(encrypted_seed, 'base64');

        // Decrypt using RSA/OAEP with SHA-256
        const decryptedBuffer = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256'
            },
            encryptedBuffer
        );

        // Convert to UTF-8 string (hex seed)
        const hexSeed = decryptedBuffer.toString('utf8');

        // Validate decrypted seed is 64-character hex
        if (hexSeed.length !== 64 || !/^[0-9a-f]{64}$/i.test(hexSeed)) {
            throw new Error('Invalid decrypted seed format');
        }

        // Save to /data/seed.txt
        fs.writeFileSync(SEED_FILE, hexSeed, { mode: 0o600 });

        console.log('✓ Seed decrypted and saved successfully');

        // Return response
        return res.status(200).json({
            status: 'ok'
        });

    } catch (error) {
        console.error('Decryption error:', error.message);
        return res.status(500).json({
            error: 'Decryption failed'
        });
    }
});

/**
 * Endpoint 2: GET /generate-2fa
 * Generate current TOTP code from stored seed
 */
app.get('/generate-2fa', (req, res) => {
    try {
        // Check if /data/seed.txt exists
        if (!fs.existsSync(SEED_FILE)) {
            return res.status(500).json({
                error: 'Seed not decrypted yet'
            });
        }

        console.log('Generating TOTP code...');

        // Read hex seed from file
        const hexSeed = fs.readFileSync(SEED_FILE, 'utf8').trim();

        // Convert hex seed to bytes
        const seedBuffer = Buffer.from(hexSeed, 'hex');

        // Convert bytes to base32 encoding
        const seedBase32 = base32Encode(seedBuffer);

        // Create TOTP object
        const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: seedBase32
        });

        // Generate current TOTP code
        const code = totp.generate();

        // Calculate remaining seconds in current period
        const now = Math.floor(Date.now() / 1000);
        const remainingSeconds = 30 - (now % 30);

        console.log(`✓ Generated code: ${code}, valid for ${remainingSeconds}s`);

        // Return response
        return res.status(200).json({
            code: code,
            valid_for: remainingSeconds
        });

    } catch (error) {
        console.error('TOTP generation error:', error.message);
        return res.status(500).json({
            error: 'Seed not decrypted yet'
        });
    }
});

/**
 * Endpoint 3: POST /verify-2fa
 * Verify TOTP code against stored seed
 */
app.post('/verify-2fa', (req, res) => {
    try {
        const { code } = req.body;

        // Validate input
        if (!code) {
            return res.status(400).json({
                error: 'Missing code'
            });
        }

        // Check if /data/seed.txt exists
        if (!fs.existsSync(SEED_FILE)) {
            return res.status(500).json({
                error: 'Seed not decrypted yet'
            });
        }

        console.log(`Verifying code: ${code}...`);

        // Read hex seed from file
        const hexSeed = fs.readFileSync(SEED_FILE, 'utf8').trim();

        // Convert hex seed to base32
        const seedBuffer = Buffer.from(hexSeed, 'hex');
        const seedBase32 = base32Encode(seedBuffer);

        // Create TOTP object
        const totp = new OTPAuth.TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: seedBase32
        });

        // Verify code with ±1 period tolerance (±30 seconds)
        const delta = totp.validate({
            token: code,
            window: 1
        });

        const isValid = delta !== null;

        console.log(`✓ Verification result: ${isValid ? 'VALID' : 'INVALID'}`);

        // Return response
        return res.status(200).json({
            valid: isValid ? 'true' : 'false'
        });

    } catch (error) {
        console.error('Verification error:', error.message);
        return res.status(500).json({
            error: 'Seed not decrypted yet'
        });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'PKI-Based 2FA Microservice',
        status: 'running',
        endpoints: [
            'POST /decrypt-seed',
            'GET /generate-2fa',
            'POST /verify-2fa'
        ]
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   🔐 PKI-BASED 2FA MICROSERVICE API                      ║');
    console.log('║   ═════════════════════════════════════════════════════   ║');
    console.log(`║   Server running on port ${PORT}                            ║`);
    console.log(`║   API: http://localhost:${PORT}                             ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log('Available endpoints:');
    console.log('  POST /decrypt-seed  - Decrypt encrypted seed');
    console.log('  GET  /generate-2fa  - Generate current TOTP code');
    console.log('  POST /verify-2fa    - Verify TOTP code\n');
});