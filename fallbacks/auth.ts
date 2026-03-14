import * as fs from 'fs';
import * as path from 'path';

// 🛠️ HARD-CODED CONFIG (Rule out .env issues)
const APP_KEY = "529032"; 
const APP_SECRET = "PASTE_YOUR_SECRET_HERE";
const REDIRECT_URI = "https://www.zipitnshipit.com"; 

async function exchange() {
  const code = process.argv[2];
  if (!code) return console.error("❌ Need Code.");

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: APP_KEY,
    client_secret: APP_SECRET,
    redirect_uri: REDIRECT_URI,
    sign_method: 'hmac-sha256'
  });

  const endpoints = [
    'https://oauth.aliexpress.com/token',
    'https://gw.api.alibaba.com/openapi/http/1/system.oauth/getToken'
  ];

  for (const url of endpoints) {
    console.log(`📡 Trying Gateway: ${url}...`);
    try {
      const res = await fetch(url, { 
        method: 'POST', 
        body: params, 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
      });
      const data = await res.json();

      if (data.access_token) {
        console.log("✅ SUCCESS!");
        const envPath = path.join(process.cwd(), '.env');
        let content = fs.readFileSync(envPath, 'utf8');
        const newLine = `ALIEXPRESS_ACCESS_TOKEN=${data.access_token}`;
        
        content = /^ALIEXPRESS_ACCESS_TOKEN=.*$/m.test(content) 
          ? content.replace(/^ALIEXPRESS_ACCESS_TOKEN=.*$/m, newLine) 
          : content + `\n${newLine}`;
          
        fs.writeFileSync(envPath, content);
        return console.log("📝 .env Updated.");
      }
      console.log(`❌ Failed: ${data.error_msg || JSON.stringify(data)}`);
    } catch (e) { console.log("💥 Network Error."); }
  }
}
exchange();