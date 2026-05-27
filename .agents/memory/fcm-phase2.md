---
name: FCM Phase 2 setup
description: Firebase Admin SDK integration for native Android/iOS push — what worked, what failed, and where fan-out lives.
---

## The rule
`FIREBASE_SERVICE_ACCOUNT_JSON` must contain the **full JSON file contents** (starting `{`, ending `}`). Pasting only the API key (starts with `AIzaSy...`) causes "Unexpected token 'A' ... is not valid JSON" at startup and FCM is silently disabled.

**Why:** `firebase-admin` calls `JSON.parse()` on the secret value directly. A bare API key is not JSON.

**How to apply:** If logs show `Firebase Admin init failed — FCM push disabled: Unexpected token`, the secret value is wrong. The fix is to open the `.json` service account file, select all, and paste the entire contents into the Replit Secret.

## Fan-out locations in server/routes.ts
FCM `sendFcmBatch()` is called after each VAPID web-push block in:
1. `dispatchLiveIncidentPush()` — live incident fan-out (all roles, exclude creator)
2. `POST /api/panic` — panic alert fan-out (all roles, exclude panicker)
3. Severity alert block — red (all roles) / orange (admin+supervisor only), exclude reporter
4. `POST /api/incidents/:id/acknowledge-panic` — notifies panicker's native device

Silent broadcasts (panic_ack_update, close-panic) are VAPID-only — native apps don't process SW data messages.

## Storage helpers
- `getFcmTokensByOrg(orgId, excludeUserId?, roles?)` — org-wide fan-out
- `getFcmTokensByUser(userId)` — single-user (panicker) fan-out
- `deleteFcmToken(token)` — called automatically on registration-token-not-registered / invalid-registration-token errors
