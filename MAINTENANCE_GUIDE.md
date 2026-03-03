# 🛠️ Weekly Maintenance Guide: AcroAMS v2

As the lead developer for the **Acropolis Attendance Management System**, follow this checklist every **Monday morning** (or once a week) to ensure the system stays fast, secure, and reliable for all teachers.

---

## 1. 🌐 Network & Connectivity (Current Priority)
Due to the **Supabase India Region Incident**, we are currently using a **Vercel Proxy** to bypass ISP blocks.
*   **Check Status**: Visit [Supabase Status Page](https://status.supabase.com/incidents/xmgq69x4brfk).
*   **Decision**: 
    - If the incident is **Ongoing**: Keep the current proxy setup in `vercel.json` and `services/supabase.ts`.
    - If the incident is **Resolved**: You can either keep the proxy (it's safe!) or revert `services/supabase.ts` to use `VITE_SUPABASE_URL` directly for slightly faster performance.

---

## 2. 🗄️ Database Maintenance (SQL)
**Do you need to run SQL every week?** 
> **NO.** You should NOT run your setup SQL files (`schema.sql`, `security_fix.sql`, etc.) every week. Running them again might accidentally reset your tables or delete existing attendance data.

**Only run SQL if:**
*   You are adding a **new feature** (like a new table for "Late Entry").
*   You need to **fix a bug** in a specific Database Function or Trigger.
*   You want to **optimize performance** (e.g., adding an Index).

**Weekly Database Tasks:**
*   Check **Storage usage** in the Supabase Dashboard (stay under 500MB on Free Tier).
*   Review **Error Logs** in the Supabase SQL Editor to see if any queries are failing for teachers.

---

## 3. 📦 Dependency Updates
Libraries release patches to fix security holes and browser bugs.
1.  Open your terminal in `d:/acro/supa acro2/CSE_IT`.
2.  Run: `npm outdated` (to see what is old).
3.  Run: `npm update` (to safely update minor versions).
4.  Run: `npm run build` (to ensure nothing broke).

---

## 4. 🚀 Vercel & Deployment
*   Check the **Vercel Dashboard** for your latest deployment.
*   Ensure the **Build Logs** are green (no warnings or errors).
*   Check **Realtime Analytics** to see if any teacher is experiencing slow page loads.

---

## 5. 📱 PWA (App) Updates
Since teachers "install" the app on their phones:
*   When you push a new update, some teachers might still see the old version due to **PWA Caching**.
*   **Tip**: If a teacher reports an issue, ask them to **"Close and reopen the app twice"** or **Clear Browser Cache**. This forces the PWA to download the latest version from Vercel.

---

### **Need Help?**
If you see a "Red" status on Supabase or an error you don't understand, just ask me to analyze the logs!
