const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Generate Commit Proof
 * 
 * Process:
 * 1. Get current commit hash
 * 2. Sign commit hash with student private key (RSA-PSS-SHA256)
 * 3. Encrypt signature with instructor public key (RSA/OAEP-SHA256)
 * 4. Base64 encode the encrypted signature
 * 
 * Signature Algorithm: RSA-PSS with SHA-256
 * - Padding: PSS (Probabilistic Signature Scheme)
 * - MGF: MGF1 with SHA-256
 * - Hash Algorithm: SHA-256
 * - Salt Length: Maximum (PSS_MAX_LENGTH)
 * - Message: ASCII bytes of commit hash (40-character hex string)
 */

function generateCommitProof() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('           GENERATING COMMIT PROOF');
    console.log('═══════════════════════════════════════════════════════\n');

    // Step 1: Get current commit hash
    console.log('Step 1: Getting current commit hash...');
    const commitHash = execSync('git log -1 --format=%H', { encoding: 'utf8' }).trim();
    console.log(`  Commit hash: ${commitHash}`);
    console.log(`  Length: ${commitHash.length} characters\n`);

    // Validate commit hash
    if (commitHash.length !== 40 || !/^[0-9a-f]{40}$/i.test(commitHash)) {
        throw new Error('Invalid commit hash format');
    }

    // Step 2: Load student private key
    console.log('Step 2: Loading student private key...');
    const privateKey = fs.readFileSync('student_private.pem', 'utf8');
    console.log('  ✓ Private key loaded\n');

    // Step 3: Sign commit hash with student private key
    console.log('Step 3: Signing commit hash with RSA-PSS-SHA256...');
    console.log('  - Padding: PSS');
    console.log('  - MGF: MGF1 with SHA-256');
    console.log('  - Hash: SHA-256');
    console.log('  - Salt Length: Maximum\n');

    // CRITICAL: Sign the ASCII string, NOT binary hex!
    const messageBuffer = Buffer.from(commitHash, 'utf-8');

    const signature = crypto.sign(
        'sha256', // Hash algorithm: SHA-256
        messageBuffer,
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN
        }
    );

    console.log(`  ✓ Signature generated (${signature.length} bytes)\n`);

    // Step 4: Load instructor public key
    console.log('Step 4: Loading instructor public key...');
    const instructorPublicKey = fs.readFileSync('instructor_public.pem', 'utf8');
    console.log('  ✓ Instructor public key loaded\n');

    // Step 5: Encrypt signature with instructor public key
    console.log('Step 5: Encrypting signature with RSA/OAEP-SHA256...');
    console.log('  - Padding: OAEP');
    console.log('  - MGF: MGF1 with SHA-256');
    console.log('  - Hash: SHA-256');
    console.log('  - Label: None\n');

    const encryptedSignature = crypto.publicEncrypt(
        {
            key: instructorPublicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        signature
    );

    console.log(`  ✓ Signature encrypted (${encryptedSignature.length} bytes)\n`);

    // Step 6: Base64 encode encrypted signature
    console.log('Step 6: Base64 encoding encrypted signature...');
    const encryptedSignatureB64 = encryptedSignature.toString('base64');
    console.log('  ✓ Encoded to base64\n');

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('Commit Hash (40-character hex):');
    console.log(commitHash);
    console.log('\n');

    console.log('Encrypted Signature (Base64, single line):');
    console.log(encryptedSignatureB64);
    console.log('\n');

    // Save to file
    const output = {
        commit_hash: commitHash,
        encrypted_signature: encryptedSignatureB64
    };

    fs.writeFileSync('commit_proof.json', JSON.stringify(output, null, 2));
    console.log('✓ Commit proof saved to: commit_proof.json\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ COMMIT PROOF GENERATED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════\n');

    return output;
}

// Main execution
try {
    generateCommitProof();
} catch (error) {
    console.error('\n❌ Error generating commit proof:', error.message);
    console.error('\nPossible causes:');
    console.error('  1. Not in a git repository');
    console.error('  2. No commits in repository');
    console.error('  3. Missing student_private.pem');
    console.error('  4. Missing instructor_public.pem\n');
    process.exit(1);
}