# 🔐 Secure PKI-Based Two-Factor Authentication Microservice

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](https://www.docker.com/)
[![Security](https://img.shields.io/badge/Security-RSA--4096-red.svg)](https://en.wikipedia.org/wiki/RSA_(cryptosystem))
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-grade authentication microservice demonstrating enterprise security practices through **Public Key Infrastructure (PKI)** and **Time-based One-Time Passwords (TOTP)**. This project implements robust cryptographic protocols including RSA-4096 encryption, digital signatures, and automated 2FA code generation in a containerized environment.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Security Implementation](#security-implementation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Technical Specifications](#technical-specifications)
- [Docker Deployment](#docker-deployment)
- [Cryptographic Operations](#cryptographic-operations)
- [Troubleshooting](#troubleshooting)
- [Learning Outcomes](#learning-outcomes)

---

## 🎯 Overview

This microservice showcases a complete implementation of cryptographic security primitives in a modern cloud-native architecture. Built as part of the GPP (Good Programming Practices) curriculum, it demonstrates:

- **Asymmetric Encryption**: RSA-4096 with OAEP padding
- **Digital Signatures**: RSA-PSS with SHA-256
- **Time-Based Authentication**: TOTP with SHA-1
- **Container Orchestration**: Multi-stage Docker builds
- **Persistent Storage**: Volume management for stateful data
- **Automated Tasks**: Cron-based code generation

### Real-World Application

This architecture mirrors authentication systems used by:
- **Google Authenticator**: TOTP-based 2FA
- **Microsoft Azure**: PKI certificate management
- **AWS IAM**: Digital signature verification
- **Banking Systems**: Secure transaction signing

---

## ✨ Key Features

### 🔒 Cryptographic Security
- **RSA-4096 Key Pairs**: Industry-standard asymmetric encryption
- **OAEP Padding**: Optimal Asymmetric Encryption Padding with SHA-256
- **PSS Signatures**: Probabilistic Signature Scheme for commit verification
- **TOTP Generation**: RFC 6238 compliant time-based codes

### 🐳 Cloud-Native Architecture
- **Multi-Stage Builds**: Optimized Docker images (~50% size reduction)
- **Volume Persistence**: Data survives container restarts
- **Health Checks**: Automated service monitoring
- **Graceful Degradation**: Robust error handling

### 🤖 Automation
- **Cron Jobs**: Automated TOTP generation every minute
- **Persistent Logging**: UTC-timestamped code history
- **API Endpoints**: RESTful interface for all operations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Application                      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js API Server                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POST /decrypt-seed    │  Decrypt encrypted seed       │ │
│  │  GET  /generate-2fa    │  Generate current TOTP        │ │
│  │  POST /verify-2fa      │  Verify TOTP code             │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────┬───────────────────────────────┬────────────┘
                 │                               │
      ┌──────────▼──────────┐       ┌──────────▼──────────┐
      │   RSA Cryptography  │       │   TOTP Engine       │
      │   - 4096-bit Keys   │       │   - SHA-1 Algorithm │
      │   - OAEP Padding    │       │   - 30s Window      │
      │   - SHA-256 Hash    │       │   - 6 Digits        │
      └──────────┬──────────┘       └──────────┬──────────┘
                 │                               │
                 └───────────┬───────────────────┘
                             ▼
                  ┌─────────────────────┐
                  │   Docker Volumes    │
                  │  /data/seed.txt     │
                  │  /cron/last_code.txt│
                  └─────────────────────┘
                             ▲
                             │
                  ┌──────────┴──────────┐
                  │   Cron Daemon       │
                  │   (Every Minute)    │
                  └─────────────────────┘
```

### Data Flow

1. **Seed Decryption**: RSA/OAEP decrypts instructor-provided seed
2. **Persistent Storage**: Seed stored securely in Docker volume
3. **TOTP Generation**: Base32-encoded seed generates 6-digit codes
4. **Verification**: Time-window tolerance validates user codes
5. **Automated Logging**: Cron job logs codes with UTC timestamps

---

## 🛡️ Security Implementation

### Encryption Standards

| Component | Algorithm | Key Size | Padding | Hash |
|-----------|-----------|----------|---------|------|
| Seed Decryption | RSA/OAEP | 4096-bit | OAEP | SHA-256 |
| Commit Signing | RSA-PSS | 4096-bit | PSS | SHA-256 |
| TOTP Generation | HMAC-SHA1 | N/A | N/A | SHA-1 |

### Key Management

```
student_private.pem  (4096-bit)  →  Decrypt seed, Sign commits
student_public.pem   (4096-bit)  →  Shared with instructor
instructor_public.pem (8192-bit) →  Encrypt signatures
```

⚠️ **Security Notice**: Keys are committed to Git for **educational purposes only**. In production:
- Store keys in secure vaults (AWS KMS, Azure Key Vault, HashiCorp Vault)
- Use certificate authorities for key distribution
- Implement key rotation policies
- Never commit private keys to version control

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **Docker Desktop** (with Docker Compose)
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/SabbellaLaharika/GPP-Task1-Build-Secure-PKI-Based-2FA-Microservice-with-Docker.git
cd GPP-Task1-Build-Secure-PKI-Based-2FA-Microservice-with-Docker

# Install dependencies
npm install

# Generate RSA key pair (already done for this project)
node generate-keys.js

# Build and start Docker container
docker-compose build
docker-compose up -d
```

### First Run

```bash
# 1. Decrypt the seed (required before TOTP generation)
curl -X POST http://localhost:8080/decrypt-seed \
  -H "Content-Type: application/json" \
  -d "{\"encrypted_seed\":\"$(cat encrypted_seed.txt)\"}"

# 2. Generate a TOTP code
curl http://localhost:8080/generate-2fa

# 3. Verify the code (use code from step 2)
curl -X POST http://localhost:8080/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'

# 4. Check cron job output (wait 70+ seconds after decryption)
docker exec pki-2fa-microservice cat /cron/last_code.txt
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:8080
```

### Endpoints

#### 1. **POST** `/decrypt-seed`
Decrypt base64-encoded encrypted seed using student private key.

**Request:**
```json
{
  "encrypted_seed": "BASE64_ENCODED_CIPHERTEXT"
}
```

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

**Response (500 Error):**
```json
{
  "error": "Decryption failed"
}
```

---

#### 2. **GET** `/generate-2fa`
Generate current 6-digit TOTP code.

**Response (200 OK):**
```json
{
  "code": "123456",
  "valid_for": 28
}
```

**Response (500 Error):**
```json
{
  "error": "Seed not decrypted yet"
}
```

---

#### 3. **POST** `/verify-2fa`
Verify TOTP code with ±30 second tolerance.

**Request:**
```json
{
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "valid": "true"
}
```
or
```json
{
  "valid": "false"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Missing code"
}
```

---

## 🧪 Testing

### Local Testing (Without Docker)

```bash
# Start the server
npm start

# In another terminal, run tests
curl http://localhost:8080/
curl -X POST http://localhost:8080/decrypt-seed \
  -H "Content-Type: application/json" \
  -d "{\"encrypted_seed\":\"$(cat encrypted_seed.txt)\"}"
curl http://localhost:8080/generate-2fa
```

### Docker Testing

```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f

# Test endpoints
curl http://localhost:8080/generate-2fa

# Enter container for debugging
docker exec -it pki-2fa-microservice sh

# Stop and remove
docker-compose down
```

### Verification Checklist

- ✅ All endpoints return correct HTTP status codes
- ✅ Seed persists after container restart
- ✅ TOTP codes change every 30 seconds
- ✅ Verification accepts codes within ±30 second window
- ✅ Cron job logs codes every minute
- ✅ Timestamps are in UTC format

---

## 📁 Project Structure

```
.
├── data/                          # Persistent seed storage (not committed)
│   └── seed.txt                   # Decrypted 64-char hex seed
├── scripts/                       # Automation scripts
│   └── log_2fa_cron.js           # TOTP generation for cron
├── cron/                          # Cron configuration
│   └── 2fa-cron                   # Cron job definition (LF line endings)
├── server.js                      # Express.js API server
├── generate-keys.js               # RSA-4096 key pair generation
├── decrypt-seed.js                # Seed decryption utility
├── generate-totp.js               # TOTP generation utility
├── request-seed.js                # Request seed from instructor API
├── generate-commit-proof.js       # Cryptographic commit signature
├── student_private.pem            # Student RSA private key (4096-bit)
├── student_public.pem             # Student RSA public key (4096-bit)
├── instructor_public.pem          # Instructor RSA public key (8192-bit)
├── Dockerfile                     # Multi-stage Docker build
├── docker-compose.yml             # Container orchestration
├── .dockerignore                  # Docker build exclusions
├── .gitignore                     # Git exclusions
├── .gitattributes                 # Line ending configuration
├── package.json                   # Node.js dependencies
└── README.md                      # This file
```

---

## ⚙️ Technical Specifications

### Cryptographic Algorithms

#### RSA Key Generation
```javascript
crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicExponent: 65537,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
```

#### RSA/OAEP Decryption
```javascript
crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
}, encryptedBuffer);
```

#### TOTP Generation
```javascript
const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: base32EncodedSeed
});
```

### Docker Configuration

**Base Image**: `node:18-alpine` (minimal size)
**Cron Daemon**: `dcron` (Alpine Linux cron)
**Timezone**: UTC (critical for TOTP synchronization)
**Volumes**: Persistent storage for `/data` and `/cron`

---

## 🐳 Docker Deployment

### Build Process

```bash
# Development build
docker-compose build

# Production build with optimizations
docker build --no-cache -t pki-2fa-service .

# Multi-platform build (ARM64 + AMD64)
docker buildx build --platform linux/amd64,linux/arm64 -t pki-2fa-service .
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect gpp-task1-build-secure-pki-based-2fa-microservice-with-docker_seed-data

# Backup seed data
docker run --rm -v gpp-task1-build-secure-pki-based-2fa-microservice-with-docker_seed-data:/data \
  -v $(pwd):/backup alpine tar czf /backup/seed-backup.tar.gz -C /data .

# Restore seed data
docker run --rm -v gpp-task1-build-secure-pki-based-2fa-microservice-with-docker_seed-data:/data \
  -v $(pwd):/backup alpine tar xzf /backup/seed-backup.tar.gz -C /data
```

### Health Monitoring

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' pki-2fa-microservice

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' pki-2fa-microservice
```

---

## 🔐 Cryptographic Operations

### Seed Decryption Workflow

1. **Receive** base64-encoded encrypted seed from instructor API
2. **Decode** base64 to binary ciphertext
3. **Decrypt** using RSA/OAEP with student private key
4. **Validate** result is 64-character hexadecimal string
5. **Store** in persistent Docker volume

### TOTP Generation Workflow

1. **Read** 64-character hex seed from storage
2. **Convert** hex to bytes (32 bytes)
3. **Encode** bytes to base32 (RFC 4648)
4. **Initialize** TOTP with SHA-1, 6 digits, 30s period
5. **Generate** current time-based code
6. **Calculate** remaining validity seconds

### Commit Signing Workflow

1. **Extract** latest Git commit hash (40-char hex)
2. **Encode** commit hash as UTF-8 bytes
3. **Sign** using RSA-PSS with SHA-256, maximum salt
4. **Encrypt** signature with instructor's public key (RSA/OAEP)
5. **Encode** encrypted signature as base64

---

## 🐛 Troubleshooting

### Common Issues

#### Docker Not Starting
```bash
# Check if Docker Desktop is running
docker info

# Restart Docker Desktop
# Windows: Right-click Docker icon → Restart
# Mac: Docker menu → Restart

# Check Docker service
systemctl status docker  # Linux
```

#### Port Already in Use
```bash
# Find process using port 8080
netstat -ano | findstr :8080  # Windows
lsof -i :8080                 # Mac/Linux

# Kill process or change port in docker-compose.yml
ports:
  - "8081:8080"  # Use port 8081 instead
```

#### Cron Not Running
```bash
# Enter container
docker exec -it pki-2fa-microservice sh

# Check cron process
ps aux | grep cron

# Manually trigger cron job
/app/cron-job.sh

# Check cron logs
cat /cron/last_code.txt
```

#### Seed Not Persisting
```bash
# Check if volume exists
docker volume ls | grep seed-data

# Inspect volume mount
docker inspect pki-2fa-microservice | grep -A 10 Mounts

# Verify seed file exists
docker exec pki-2fa-microservice ls -la /data/
```

---

## 🎓 Learning Outcomes

This project demonstrates proficiency in:

### Cryptography
- ✅ Asymmetric encryption (RSA/OAEP)
- ✅ Digital signatures (RSA-PSS)
- ✅ Hash functions (SHA-256, SHA-1)
- ✅ Time-based authentication (TOTP)
- ✅ Key management and PKI concepts

### Software Engineering
- ✅ RESTful API design
- ✅ Error handling and validation
- ✅ Logging and monitoring
- ✅ Code organization and modularity

### DevOps
- ✅ Docker containerization
- ✅ Multi-stage builds
- ✅ Volume management
- ✅ Health checks and orchestration
- ✅ Cron job scheduling

### Security Best Practices
- ✅ Secure key storage
- ✅ Input validation
- ✅ Padding schemes (OAEP, PSS)
- ✅ Time synchronization (UTC)
- ✅ Cryptographic parameter validation

---

## 📚 References

- [RFC 6238 - TOTP Algorithm](https://tools.ietf.org/html/rfc6238)
- [RFC 8017 - RSA Cryptography](https://tools.ietf.org/html/rfc8017)
- [NIST SP 800-56B - Key Establishment](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-56Br2.pdf)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## 📝 License

This project is created for educational purposes as part of the GPP curriculum.

**Security Notice**: The cryptographic keys in this repository are for demonstration only and should **never be reused** for production systems.

---

## 👤 Author

**Sabbella Laharika**
- GitHub: [@SabbellaLaharika](https://github.com/SabbellaLaharika)
- Repository: [GPP-Task1-Build-Secure-PKI-Based-2FA-Microservice-with-Docker](https://github.com/SabbellaLaharika/GPP-Task1-Build-Secure-PKI-Based-2FA-Microservice-with-Docker)

---

## 🙏 Acknowledgments

- **Anthropic Claude** for development assistance
- **Node.js Crypto Module** for cryptographic primitives
- **OTPAuth Library** for TOTP implementation
- **Docker** for containerization platform
- **Express.js** for web framework

---

<div align="center">

**Built with 🔐 Security, 🐳 Docker, and ⚡ Node.js**

</div>