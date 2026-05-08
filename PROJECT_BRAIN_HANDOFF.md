# SOM PROJECT BRAIN — HANDOFF
Last Updated: April 27, 2026 | Bundle: index-ByohIFMv.js

## WHAT'S WORKING
- Voice loop wired and deployed (Theory Phase)
- Mic: continuous=false, micRunningRef lock, no abort loop
- Smart evaluator: natural language patterns, question/confusion handling
- Transcript appears in speech bubble area
- Begin Session → startLesson() → advanceTeaching() chain confirmed
- Dynamic concept routing via ?concept= URL param
  - /practice-live?concept=half-step → Half Step ✅
  - /practice-live?concept=whole-step → Whole Step ✅
  - /practice-live?concept=scale-degree → Scale Degrees ✅
- PracticeSessionCockpit reads conceptTitle/conceptDesc from URL-driven config

## WHAT'S NEEDED NEXT
1. Live test on real device with mic — confirm full end-to-end
2. Add VITE_MOTESART_CLAUDE_KEY to Netlify env vars (Anthropic key for parseIntent)
3. Upload public/lesson_data/L01_c_major_scale.json + visual_asset_registry.json
4. Re-enable T.A.M.i engine after voice loop confirmed stable

## LAST COMMITS
- 904e868: Wire cockpit conceptTitle/conceptDesc from URL param
- fedd806: Dynamic concept routing via ?concept= URL param
- 6a01ea3: Add CLAUDE.md + PROJECT_BRAIN_HANDOFF.md
- 151d954: Pass 2 smart evaluator, mic check, fallback, debug badge

## PROTECTED FILES
Registration.jsx, auth.py, GamePage.jsx, all working dashboards
