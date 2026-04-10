Verify the frontend deploy is live and fully functional after a push.

1. Run `git log --oneline -1` to get the latest local commit.

2. Check frontend health:
   curl -s -w "\n%{http_code}" https://motesart-frontend-production.up.railway.app/api/health
   Expect: 200 with {"status": "ok"}

3. Check backend proxy is forwarding:
   curl -s -w "\n%{http_code}" https://motesart-frontend-production.up.railway.app/api/health-backend-proxy-test
   Expect: 404 (proxy forwarded, backend returned not found = proxy PASS)
   If 502: backend is down. If connection error: frontend is down.

4. Check TTS route:
   curl -s -w "\n%{http_code}" https://motesart-frontend-production.up.railway.app/api/tts/voices
   Expect: 200 with voices array

5. Check static serving:
   curl -s -o /dev/null -w "%{http_code}" https://motesart-frontend-production.up.railway.app/
   Expect: 200

6. Report each as PASS/FAIL with status code.
   Overall verdict: PASS only if steps 2-5 all pass.
