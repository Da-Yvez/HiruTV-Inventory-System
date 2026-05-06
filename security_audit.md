# 🔒 Security Audit — Hiru TV Inventory System

Audited all source files: `firebase.js`, `AuthContext.js`, `SiteContext.js`, `LoginPage.js`,
`SiteSelection.js`, `InventoryTable.js`, `DeviceForm.js`, `ActivityLogs.js`,
`DepartmentManagement.js`, `DashboardLayout.js`, `utils.js`, `next.config.mjs`,
`.gitignore`, `package.json`.

---

## 🔴 Critical — Fix Immediately

### 1. Firebase API Key Hardcoded in Source Code

**File:** `src/lib/firebase.js` — Lines 5–14

```js
const firebaseConfig = {
    apiKey: "AIzaSyC7GcDDHQqUsOVKrkux7WaSpH7gzYHEsXU",
    authDomain: "inventory-3650f.firebaseapp.com",
    projectId: "inventory-3650f",
    ...
};
```

This entire config block — including the **live API key, project ID, app ID, and measurement ID** —
is committed to Git and shipped in client-side JavaScript. Anyone who visits your Vercel URL can
extract it from the browser's Network tab or page source in seconds.

**What an attacker can do with it:**
- Query your Firestore directly using the Firebase REST API or SDK in their own browser/script.
- Read **all** device records, IP addresses, software license keys, MAC addresses, and activity logs.
- If Firestore security rules are permissive (common default), they can also **write or delete** records
  without any login.

**Fix:** Move all config values to environment variables.

```
# .env.local  (already gitignored ✅ — just create this file)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC7...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=inventory-3650f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=inventory-3650f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=inventory-3650f.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=788791862955
NEXT_PUBLIC_FIREBASE_APP_ID=1:788791862955:web:280dc7b46f9ee5eb1a79ee
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-1NTLEP3DFE
```

Then in `firebase.js`:
```js
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
```

Also add these same variables to **Vercel → Project → Settings → Environment Variables**.

> [!CAUTION]
> Since this key is already on GitHub/Vercel, it is already public. Moving to env vars prevents
> future exposure but **does not revoke the current key**. You must also go to the
> [Firebase Console → Project Settings → API restrictions](https://console.firebase.google.com)
> and restrict the key to only your Vercel domain, or rotate/create a new restricted key.

---

### 2. No Firestore Security Rules Verified

**Risk:** With the API key public (see #1), the only thing stopping unauthenticated external
access to your Firestore database is your **Security Rules**. Default Firebase projects often
ship with open rules (`allow read, write: if true`).

**Fix:** Go to **Firebase Console → Firestore → Rules** and make sure they look like this at
minimum:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This ensures **only authenticated Firebase users** can read or write anything. Without this,
your inventory data is publicly readable and writable by anyone with the API key.

---

## 🟠 High — Fix Soon

### 3. No Authorization / Role Checks — Any Authenticated User Is Admin

**Files:** `InventoryTable.js`, `DepartmentManagement.js`, `DeviceForm.js`

The application checks `if (!user)` to guard the UI, but **every logged-in user has full
admin power**: they can add, edit, delete any device, and modify departments. There is no
`role` field checked anywhere.

**Risk:** If someone's `@inventory.system` account credentials are compromised or guessed,
they have full write access to all inventory data across both sites (WTC and HLS).

**Recommended fix:** Add a `role` field to Firebase Auth custom claims or to a Firestore
`users` collection, then check it before allowing mutations:
```js
// Example guard in handleDelete / handleSave
if (user?.role !== 'admin') return;
```

---

### 4. Public Google Sheet URL Hardcoded in Sidebar

**File:** `src/components/layout/DashboardLayout.js` — Line 105

```js
href="https://docs.google.com/spreadsheets/d/1fkAexdvowZ5z7QblipLsGbKfaSuvamp1O-7vqNkYow0/edit?usp=sharing"
```

This link is **embedded in the page source** and will be visible to anyone who visits the
Vercel URL (even before login, it's in the JS bundle). If that Google Sheet contains
employee names, salaries, or sensitive data, it's effectively public.

**Fix:** Verify the Sheet's sharing settings are "Restricted (only people added can open)".
If it must be linked, move the URL to an env variable so it's not in your public repo.

---

### 5. Software License Keys Stored in Plain Text in Firestore

**File:** `DeviceForm.js` — Lines 438–446

The `licenseKey` field for software is stored and displayed in plain text with no masking.
These values are written directly to Firestore and exported to Excel unmasked.

**Risk:** Anyone who can read Firestore (see #2) gets all your software license keys.

**Fix (short term):** Mask the key in the UI with a show/hide toggle like a password field.
**Fix (long term):** Consider encrypting sensitive fields before writing to Firestore.

---

## 🟡 Medium — Should Address

### 6. No Input Sanitization / Length Limits on Form Fields

**File:** `DeviceForm.js`, `DepartmentManagement.js`

All text inputs accept arbitrary-length strings with no validation or sanitization beyond
`required`. Someone with login access could write very large strings or special characters
to Firestore, potentially corrupting data or causing UI rendering issues.

**Fix:** Add `maxLength` attributes to inputs and trim values before saving:
```jsx
<input maxLength={100} ... />
// and in handleSave:
pcNumber: formData.pcNumber.trim().slice(0, 50),
```

---

### 7. Activity Logs Can Be Tampered With By Any Logged-In User

**File:** `utils.js` — `addLog()` function

Logs are written client-side by the app. Any authenticated user can call `addLog()` (or the
Firestore API directly) with any `action`, `details`, and `user` string they want — including
fake entries. The `user` field is just `user?.displayName`, which is set from the Firebase
auth token but still client-controlled.

**Fix:** Use **Firebase Cloud Functions** (server-side triggers) to write audit logs
automatically on Firestore document changes (`onCreate`, `onUpdate`, `onDelete`). This makes
logs tamper-proof.

---

### 8. `setPersistence` Race Condition in AuthContext

**File:** `src/context/AuthContext.js` — Lines 20–21

```js
setPersistence(auth, browserSessionPersistence);
const unsubscribe = onAuthStateChanged(auth, ...);
```

`setPersistence` returns a Promise but is not awaited. `onAuthStateChanged` is set up
immediately after, before persistence is guaranteed to be applied.

**Fix:**
```js
useEffect(() => {
    let unsubscribe;
    setPersistence(auth, browserSessionPersistence).then(() => {
        unsubscribe = onAuthStateChanged(auth, (user) => { ... });
    });
    return () => unsubscribe?.();
}, []);
```

---

### 9. `window.confirm()` for Destructive Actions (Bypassable)

**Files:** `InventoryTable.js` line 86, `DepartmentManagement.js` line 38

Using `window.confirm()` for delete confirmations is a browser native dialog that can be
suppressed in some environments and provides no undo mechanism. If a user accidentally
confirms, the record is permanently gone.

**Fix:** Replace with a proper in-app confirmation modal that requires typing a confirmation
string for destructive actions, and consider a soft-delete pattern (mark as `deleted: true`)
rather than permanent `deleteDoc()`.

---

### 10. `xlsx` Package Version Is Known-Vulnerable

**File:** `package.json` — Line 20

```json
"xlsx": "^0.18.5"
```

The `xlsx` (SheetJS Community Edition) `0.18.x` series has known prototype-pollution and
ReDoS vulnerabilities (CVE-2023-30533). While the attack vector here is limited (you control
the data being exported), it's still advisable to update.

**Fix:** Run `npm audit` and update:
```bash
npm audit
npm install xlsx@latest
```

---

## 🟢 Good Practices — Already In Place

| Item | Status |
|---|---|
| `.env*` is in `.gitignore` | ✅ Correct |
| Firebase Auth used for login (not custom) | ✅ Correct |
| `browserSessionPersistence` — logs out on tab close | ✅ Good |
| Auth state checked before rendering dashboard | ✅ Correct |
| No `dangerouslySetInnerHTML` used anywhere | ✅ No XSS risk |
| `/OLD` and `/legacy` excluded from Git | ✅ Correct |
| No server-side secrets (all Firebase is client-side) | ✅ As expected |

---

## Summary Priority Table

| # | Issue | Severity | Effort to Fix |
|---|---|---|---|
| 1 | Firebase API key hardcoded in source | 🔴 Critical | Low (env vars) |
| 2 | Firestore security rules not verified | 🔴 Critical | Low (Firebase console) |
| 3 | No role-based access control | 🟠 High | Medium |
| 4 | Google Sheet URL public in JS bundle | 🟠 High | Low |
| 5 | License keys in plain text | 🟠 High | Low–Medium |
| 6 | No input length limits | 🟡 Medium | Low |
| 7 | Client-side audit logs (tamperable) | 🟡 Medium | High (Cloud Functions) |
| 8 | `setPersistence` not awaited | 🟡 Medium | Low |
| 9 | `window.confirm()` for deletes | 🟡 Medium | Medium |
| 10 | `xlsx` outdated/vulnerable | 🟡 Medium | Low |
