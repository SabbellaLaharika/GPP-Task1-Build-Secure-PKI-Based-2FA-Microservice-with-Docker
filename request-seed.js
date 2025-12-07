const https = require('https');
const fs = require('fs');

// Read your public key
const publicKey = fs.readFileSync('student_public.pem', 'utf8').trim();

// Your exact GitHub repo URL (CRITICAL!)
const githubRepoUrl = 'https://github.com/SabbellaLaharika/GPP-Task1-Build-Secure-PKI-Based-2FA-Microservice-with-Docker';

// Request body - keep public key as-is with actual newlines
const requestData = {
  "student_id": "22A91A05J9",
  "github_repo_url": githubRepoUrl,
  "public_key": publicKey
};

const requestBody = JSON.stringify(requestData);

// API endpoint (UPDATE WITH CORRECT URL FROM YOUR INSTRUCTOR)
const apiUrl = 'https://eajeyq4r3zljoq4rpovy2nthda0vtjqf.lambda-url.ap-south-1.on.aws/';

console.log('Requesting encrypted seed from instructor API...\n');

// Make HTTPS POST request
const url = new URL(apiUrl);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', data);
    console.log('\n');

    try {
      const response = JSON.parse(data);
      
      if (response.encrypted_seed) {
        // Save encrypted seed to file
        fs.writeFileSync('encrypted_seed.txt', response.encrypted_seed);
        console.log('✅ Encrypted seed saved to: encrypted_seed.txt');
        console.log('\nEncrypted Seed:');
        console.log(response.encrypted_seed);
      } else if (response.error) {
        console.log('❌ API Error:', response.error);
      } else {
        console.log('❌ Unexpected response format');
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(requestBody);
req.end();