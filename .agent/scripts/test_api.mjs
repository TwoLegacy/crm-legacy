import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const key = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

fetch(`${url}/rest/v1/leads?select=id,status_sdr,status_closer,owner_closer_id,closer:profiles!owner_closer_id(name)&owner_closer_id=not.is.null&limit=3`, {
  headers: { "apikey": key, "Authorization": `Bearer ${key}` }
})
.then(r => r.json())
.then(data => console.dir(data, { depth: null }))
.catch(console.error);
