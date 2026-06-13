const fs = require('fs');
const toml = fs.readFileSync('shopify.app.toml', 'utf-8');
const env = fs.readFileSync('.env', 'utf-8');
const tomlId = toml.match(/client_id\s*=\s*"([^"]+)"/)[1];
const envId = env.match(/SHOPIFY_CLIENT_ID=(.+)/)[1].trim();
console.log('TOML ID:', JSON.stringify(tomlId));
console.log('ENV  ID:', JSON.stringify(envId));
console.log('Match:', tomlId === envId);
