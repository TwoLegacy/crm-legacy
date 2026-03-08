const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

fetch(`${url}/rest/v1/leads?select=id,nome,owner_closer_id,closer:profiles!owner_closer_id(name)&nome=eq.teste123`, {
  headers: { "apikey": key, "Authorization": `Bearer ${key}` }
})
.then(r => r.json())
.then(data => console.dir(data, { depth: null }))
.catch(console.error);
