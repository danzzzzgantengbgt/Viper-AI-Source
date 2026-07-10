import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Anti-theft: Advanced protection against curl, fetch, and direct source access
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isCurl = userAgent.toLowerCase().includes('curl') || userAgent.toLowerCase().includes('wget');
  const isBot = /bot|spider|crawl|fetch|axios|python|go-http-client|postman|insomnia/i.test(userAgent);
  
  // Detect if it's a "skidie" attempt (curl, wget, or common script libraries)
  // We allow empty User-Agent to avoid blocking preview environments that might strip it
  const isSkidie = isCurl || (userAgent && isBot);

  const forbiddenPaths = [
    '/src',
    '/package.json',
    '/package-lock.json',
    '/tsconfig.json',
    '/vite.config.ts',
    '/.env',
    '/.env.example',
    '/server.ts',
    '/node_modules'
  ];

  const isForbiddenPath = forbiddenPaths.some(p => req.path.startsWith(p));
  const isSourceFile = /\.(tsx?|jsx?|env|config\.ts)$/.test(req.path);

  // 1. Handle skidie attempt (curl/fetch)
  if (isSkidie) {
    // Always block curl/wget
    if (isCurl) {
      return res.status(200).send('skidie nyoba nyolong wkwkw😭');
    }
    // For other "bots" (fetch, axios, etc.), allow root path for health checks/previews
    if (req.path !== '/' && req.path !== '/index.html' && !req.path.startsWith('/api')) {
      return res.status(200).send('skidie nyoba nyolong wkwkw😭');
    }
  }

  // 2. Handle direct browser access to source files or forbidden paths
  if (isForbiddenPath || isSourceFile) {
    // Only block if it's a direct browser navigation (Accept: text/html)
    // Legitimate app resource loading (scripts, etc.) won't have text/html as primary Accept
    const acceptHeader = req.headers['accept'] || '';
    const isHtmlRequest = acceptHeader.includes('text/html');
    
    if (isHtmlRequest && req.path !== '/' && req.path !== '/index.html') {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0a0a0a; color: #fff;">
          <h1 style="font-size: 120px; margin: 0;">404</h1>
          <p style="font-size: 20px; color: #888;">Page not found or access restricted.</p>
          <a href="/" style="margin-top: 20px; color: #3b82f6; text-decoration: none;">Back to Home</a>
        </body>
        </html>
      `);
    }
  }

  next();
});

app.use(express.json());

const codex = (length: number) => {
  let result = '';
  const characters = 'abcdef0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

app.post('/api/otp', async (req, res) => {
  const { phoneNumber, service } = req.body;
  const axios = (await import('axios')).default;

  try {
    let response;
    let success = false;
    let message = '';

    switch (service) {
      case "adiraku":
        response = await axios.post(
          "https://prod.adiraku.co.id/ms-auth/auth/generate-otp-vdata",
          {
            mobileNumber: phoneNumber,
            type: "prospect-create",
            channel: "whatsapp",
          },
          {
            headers: { "Content-Type": "application/json; charset=utf-8" },
            timeout: 10000,
          }
        );
        success = response.data.message === "success";
        message = success ? "Adiraku OTP Sent" : `Adiraku Error: ${JSON.stringify(response.data)}`;
        break;

      case "uangme":
        response = await axios.get(
          `https://api.uangme.com/api/v2/sms_code?phone=${phoneNumber}&scene_type=login&send_type=wp`,
          {
            headers: {
              'aid': `gaid_15497a9b-2669-42cf-ad10-${codex(12)}`,
              'android_id': 'b787045b140c631f',
              'app_version': '300504',
              'brand': 'samsung',
              'carrier': '00',
              'Content-Type': 'application/x-www-form-urlencoded',
              'country': '510',
              'dfp': '6F95F26E1EEBEC8A1FE4BE741D826AB0',
              'fcm_reg_id': 'frHvK61jS-ekpp6SIG46da:APA91bEzq2XwRVb6Nth9hEsgpH8JGDxynt5LyYEoDthLGHL-kC4_fQYEx0wZqkFxKvHFA1gfRVSZpIDGBDP763E8AhgRjDV7kKjnL-Mi4zH2QDJlsrzuMRo',
              'gaid': 'gaid_15497a9b-2669-42cf-ad10-d0d0d8f50ad0',
              'lan': 'in_ID',
              'model': 'SM-G965N',
              'ns': 'wifi',
              'os': '1',
              'timestamp': Math.floor(Date.now() / 1000).toString(),
              'tz': 'Asia/Bangkok',
              'User-Agent': 'okhttp/3.12.1',
              'v': '1',
              'version': '28'
            },
            timeout: 10000,
          }
        );
        success = response.data.code === "200";
        message = success ? "UangMe OTP Sent" : `UangMe Error: ${JSON.stringify(response.data)}`;
        break;

      case "speedcash":
        const tokenResponse = await axios.post(
          "https://sofia.bmsecure.id/central-api/oauth/token",
          "grant_type=client_credentials",
          {
            headers: {
              'Authorization': 'Basic NGFiYmZkNWQtZGNkYS00OTZlLWJiNjEtYWMzNzc1MTdjMGJmOjNjNjZmNTZiLWQwYWItNDlmMC04NTc1LTY1Njg1NjAyZTI5Yg==',
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 10000,
          }
        );
        const accessToken = tokenResponse.data.access_token;

        response = await axios.post(
          "https://sofia.bmsecure.id/central-api/sc-api/otp/generate",
          {
            version_name: "6.2.1 (428)",
            phone: phoneNumber,
            appid: "SPEEDCASH",
            version_code: 428,
            location: "0,0",
            state: "REGISTER",
            type: "WA",
            app_id: "SPEEDCASH",
            uuid: `00000000-4c22-250d-ffff-ffff${codex(8)}`,
            via: "BB ANDROID"
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000,
          }
        );
        success = response.data.rc === "00";
        message = success ? "SpeedCash OTP Sent" : `SpeedCash Error: ${JSON.stringify(response.data)}`;
        break;

      case "singa":
        response = await axios.post(
          "https://api102.singa.id/new/login/sendWaOtp?versionName=2.4.8&versionCode=143&model=SM-G965N&systemVersion=9&platform=android&appsflyer_id=",
          {
            mobile_phone: phoneNumber,
            type: "mobile",
            is_switchable: 1
          },
          {
            headers: { "Content-Type": "application/json; charset=utf-8" },
            timeout: 10000,
          }
        );
        success = response.data.msg === "Success";
        message = success ? "Singa OTP Sent" : `Singa Error: ${JSON.stringify(response.data)}`;
        break;

      default:
        return res.status(400).json({ error: "Invalid service" });
    }

    res.json({ success, message });
  } catch (error: any) {
    console.error(`Error sending OTP via ${service}:`, error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Setup Vite or Static files depending on environment
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Only listen if not running in Vercel serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
