# Cloud Deployment — SmartHome PFE

Goal: run the whole system without your PC. ESP32 talks to a public MQTT broker, backend runs on Render, frontend on Vercel.

## 0. Accounts (free tier on all)

| Service | URL | What for |
|---|---|---|
| MongoDB Atlas | https://www.mongodb.com/cloud/atlas/register | Database (512 MB free) |
| HiveMQ Cloud | https://www.hivemq.com/mqtt-cloud-broker/ | Public MQTTS broker (100 device free) |
| GitHub | https://github.com | Code hosting |
| Render | https://render.com | Backend hosting (free 750 h/mo) |
| Vercel | https://vercel.com | Frontend hosting |

Sign up for all 5 with the same email. Sign Render + Vercel in with your GitHub account.

---

## 1. MongoDB Atlas (5 min)

1. Create a free **M0 cluster** in any region.
2. **Database Access** → add user `smarthome` with a strong password. Role = `Atlas Admin`.
3. **Network Access** → click **"Allow access from anywhere"** (`0.0.0.0/0`).
4. **Connect** → **Drivers** → copy the connection string. Replace `<password>` with the real one and append the DB name:
   ```
   mongodb+srv://smarthome:<password>@cluster0.xxxx.mongodb.net/SmartHome?retryWrites=true&w=majority
   ```
   Save this for Render env var `MONGODB_URI`.

---

## 2. HiveMQ Cloud (5 min)

1. Create a **Serverless Free** cluster.
2. After provisioning, you'll get a **hostname** like `abc12345.s1.eu.hivemq.cloud`.
3. **Access Management** → **Credentials** → create user:
   - Username: `smarthome-esp32`
   - Password: pick a strong one
   - Permission: **Publish + Subscribe** on topic `#`
4. Save these for two places:
   - Backend (Render env): `MQTT_BROKER_URL=mqtts://abc12345.s1.eu.hivemq.cloud:8883`, `MQTT_USERNAME`, `MQTT_PASSWORD`
   - ESP32 sketch: `MQTT_SERVER`, `MQTT_USERNAME`, `MQTT_PASSWORD` (in `SmartHome_ESP32.ino`)

---

## 3. Push to GitHub (2 min)

```bash
git add .
git commit -m "Prepare for cloud deployment"
git push origin main
```

If you don't have a repo yet:
```bash
git remote add origin https://github.com/YOUR-USER/SmartHome-PFE.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy backend → Render (5 min)

1. Render Dashboard → **New** → **Web Service**.
2. **Connect** your GitHub repo `SmartHome-PFE`.
3. Settings:
   - **Name**: `smarthome-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
4. Click **Advanced** → **Add Environment Variable** for each:
   - `MONGODB_URI` — from step 1
   - `JWT_SECRET` — same as your local `.env`
   - `MQTT_BROKER_URL` — `mqtts://abc12345.s1.eu.hivemq.cloud:8883`
   - `MQTT_USERNAME` — from step 2
   - `MQTT_PASSWORD` — from step 2
   - `FRONTEND_URL` — you'll fill this in after step 5 (re-deploy then)
   - Copy your local `.env`'s `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GROQ_API_KEY`, `EMAIL_*`, `ADMIN_ACCESS_CODE`, `AGENCY_ACCESS_CODE`, `CONCIERGE_CODE`
5. **Create Web Service**. Wait ~3 min for first build.
6. You get a public URL like `https://smarthome-backend.onrender.com`.

Verify it works:
```
https://smarthome-backend.onrender.com/api/health   # 404 is fine — means it's up
```

> Note: free Render services spin down after 15 min idle and take ~30 s to wake. Fine for demo.

---

## 5. Deploy frontend → Vercel (3 min)

1. Vercel Dashboard → **Add New** → **Project** → import your GitHub repo.
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
3. **Environment Variables**:
   - `VITE_API_URL` = `https://smarthome-backend.onrender.com/api`
   - `VITE_API_BASE_URL` = `https://smarthome-backend.onrender.com`
4. **Deploy**. Wait ~1 min.
5. You get a URL like `https://smarthome-pfe.vercel.app`.

Now go back to Render → your service → Environment → set `FRONTEND_URL=https://smarthome-pfe.vercel.app` → **Manual Deploy**.

---

## 6. Update ESP32 (2 min)

Open `esp32/SmartHome_ESP32/SmartHome_ESP32.ino` and set:

```cpp
#define WIFI_SSID        "your-home-wifi"
#define WIFI_PASSWORD    "your-wifi-password"

#define MQTT_SERVER      "abc12345.s1.eu.hivemq.cloud"
#define MQTT_PORT        8883
#define MQTT_USE_TLS     true
#define MQTT_USERNAME    "smarthome-esp32"
#define MQTT_PASSWORD    "your-strong-password-here"

#define HOUSE_CODE       "I5402"
```

Re-flash. The ESP32 will:
1. Join your home WiFi
2. Open TLS connection to HiveMQ Cloud on port 8883
3. Authenticate with the username/password above
4. Subscribe to `command/...` topics and start publishing `sensors/I5402/gas`, `sensors/I5402/dht`

Backend on Render receives every message and pushes live updates to the Vercel frontend via Socket.IO.

---

## 7. Done — verify the loop

1. Open `https://smarthome-pfe.vercel.app` from your phone (turn WiFi OFF — use cellular to prove the PC isn't involved).
2. Log in.
3. Watch the kitchen gas card update live.
4. Toggle the bedroom light. The physical LED should respond within 1 s.

You can now turn off your PC. 🎉

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| ESP32 serial: `[MQTT] ❌ rc=-2` repeatedly | Wrong HiveMQ hostname/port/credentials. Double-check the cluster URL has no `mqtts://` prefix in the sketch (only port 8883 + TLS flag). |
| ESP32 serial: `[MQTT] ❌ rc=4` | Username/password rejected. Verify HiveMQ "Access Management" credentials. |
| Frontend shows blank stats, console has CORS errors | Render `FRONTEND_URL` is missing or wrong. Set it and redeploy. |
| Render service won't start | Check **Logs** tab. Most common: forgot `MONGODB_URI` or MongoDB Atlas network rule isn't `0.0.0.0/0`. |
| First page load takes 30+ seconds | Render free plan cold-start. Normal. |
| Gas overlay never shows | Verify in Render logs you see `[MQTT] ✅ Connected to external broker mqtts://...` and `[GAS] Reading for I5402: level=…`. If first line is missing, MQTT creds are wrong. If second is missing, ESP32 isn't reaching the broker. |
