End-to-end T.A.M.i check through the frontend proxy (the real user path).

1. Login through frontend proxy to get a token:
   POST https://motesart-frontend-production.up.railway.app/api/auth/login
   with test credentials. Expect 200 + access_token.
   If this fails, stop and report — nothing downstream will work.

2. List students through frontend proxy:
   GET https://motesart-frontend-production.up.railway.app/api/students
   with Bearer token from step 1. Expect 200 + students array.
   This proves: proxy → backend → Airtable path is live.

3. Send a T.A.M.i test message through frontend proxy:
   POST https://motesart-frontend-production.up.railway.app/api/tami/chat/v2
   with Bearer token and {"student_id": "<first student from step 2>", "message": "Hello, this is a system check. Respond with one sentence."}
   Expect 200 + status: "success" + non-empty response.
   This proves: proxy → backend → Airtable context load → Claude API → response.

4. Report each step as PASS/FAIL with status code.
   On FAIL, show the exact error body.
   Overall verdict: PASS only if all steps pass.
