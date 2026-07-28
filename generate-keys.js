const crypto = require('crypto');
const fs = require('fs');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const formattedPrivate = privateKey.replace(/\n/g, '\\n');
const formattedPublic = publicKey.replace(/\n/g, '\\n');

const content = `SSO_ISSUER="Vero2Auth"\nSSO_PRIVATE_KEY="${formattedPrivate}"\nSSO_PUBLIC_KEY="${formattedPublic}"\n`;

fs.mkdirSync('backend/config', { recursive: true });
fs.writeFileSync('backend/config/.env.keys', content);
console.log('Successfully generated .env.keys!');
