# Cloudflare backend

The Worker API and D1 database power the public menu, saved orders, tracking, and admin dashboard. Product photos are resized in the browser and stored in D1; no separate paid image service is used.

## First deployment

1. From this directory, run `npm install`.
2. Apply the free D1 schema with `npm run db:migrate:remote`.
3. Set the admin bootstrap values in Cloudflare Worker settings:
   - `ADMIN_EMAIL`: the admin login name/email.
   - `ADMIN_PASSWORD`: add this as a **secret**, not a plain variable. Use a new password. On the first successful login it is hashed into D1; afterward it is no longer used for login.
4. Deploy the Worker with `npm run deploy`.
5. The frontend uses the deployed Worker URL by default in production. If you use a different Worker URL, set Vercel's `REACT_APP_BACKEND_URL` to it and redeploy the frontend. Keep the Vercel app on its existing free plan.

Do not add a payment method or upgrade the Cloudflare account. D1 and Workers have free usage limits; requests can stop temporarily if those limits are reached.
