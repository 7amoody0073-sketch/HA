# Auth Testing Playbook

Admin credentials are loaded from `backend/.env` using `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the admin user is seeded idempotently at startup.

## API test
```
API_URL=${REACT_APP_BACKEND_URL:-http://localhost:8000}
curl -c /tmp/cookies.txt -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
curl -b /tmp/cookies.txt "$API_URL/api/auth/me"
```
Login returns {token, user} and sets access_token cookie. /me returns the admin user.

## Wrong password
Expect 401 with detail "البريد الإلكتروني أو كلمة المرور غير صحيحة".
