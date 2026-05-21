# SOM PROJECT BRAIN — HANDOFF
Last Updated: May 21, 2026 | Bundle: index-ByohIFMv.js

## WHAT'S WORKING
- Voice loop wired and deployed (Theory Phase)
- - Mic: continuous=false, micRunningRef lock, no abort loop
  - - Smart evaluator: natural language patterns, question/confusion handling
    - - Transcript appears in speech bubble area
      - - Begin Session → startLesson() → advanceTeaching() chain confirmed
        - - Dynamic concept routing via ?concept= URL param
          - - /practice-live?concept=half-step → Half Step ✅
            - - /practice-live?concept=whole-step → Whole Step ✅
              - - /practice-live?concept=scale-degree → Scale Degrees ✅
                - - PracticeSessionCockpit reads conceptTitle/conceptDesc from URL-driven config
                  - - Phase 1B verified: Audio works, TTS hits protective-flow, wrong answer does NOT advance
                    - - Motesart personality locked: funny/sarcastic/genuine coaching energy
                      - - Evaluator tightened: loose partial matches rejected
                        - - L00_major_scale_pattern.json committed to public/lesson_data/ (SHA 6a3249a)
                         
                          - ## SOM MASTERY INTELLIGENCE ENGINE — DOCTRINE LOCKED (May 21, 2026)
                          - - Full doctrine: SOM_MASTERY_INTELLIGENCE_ENGINE_DOCTRINE.md (outputs)
                            - - SOM Beginner Mastery Process: 8-gate C Major Scale path locked
                              - - WYL redefined as adaptive remediation engine (not fixed label)
                                - - Gate 0 schema is the master pattern every future lesson follows
                                  - - Lesson JSON structure: teach → proof → mistake_detection → wyl_interventions → mastery_rule → homework_reinforcement → evidence_logging → next_gate
                                   
                                    - ## L00_MAJOR_SCALE_PATTERN.JSON — COMMITTED ✅
                                    - - Path: public/lesson_data/L00_major_scale_pattern.json
                                      - - Commit: 6a3249a (May 21, 2026)
                                        - - Gate: 0 — Pattern Mind
                                          - - 7 proof questions (Q1-Q6 execution, Q7 ownership — both required)
                                            - - 5 mistake categories: WRONG_HALF_STEP_LOCATION, REVERSAL_CONFUSION, INCOMPLETE_PATTERN, LETTER_SYSTEM_BLEED (SOM-specific), MEMORIZED_WITHOUT_UNDERSTANDING
                                              - - 4 WYL interventions: triggered by mistake code, not student label
                                                - - 5 homework games (Find-A-Note variants, spaced repetition flagged)
                                                  - - Airtable evidence_logging schema: TO VERIFY before any write
                                                    - - video_asset: null from day one — no rebuild needed when clips ready
                                                      - - next_gate unlocks: L01_c_major_number_map (Gate 1 — Sound Recognition)
                                                       
                                                        - ## PHASE BUILD ORDER (locked)
                                                        - - Phase 1A: L00 Gate 0 proof loop (DONE — data committed)
                                                          - - Phase 1B: L01 + sound recognition + SVG keyboard with Motesart number labels
                                                            - - Phase 1C: L02 + timing engine (Tone.js Transport)
                                                              - - Phase 1D: L03 + fingering micro-clips + video pop-out modal
                                                                - - Phase 1E: L04 + play-through proof + combined accuracy score + homework variants
                                                                 
                                                                  - ## WHAT'S NEEDED NEXT
                                                                  - 1. Live test on real device with mic — confirm full end-to-end (PENDING from April)
                                                                    2. 2. Add VITE_MOTESART_CLAUDE_KEY to Netlify env vars (Anthropic key for parseIntent)
                                                                       3. 3. Build L01_c_major_number_map.json (Gate 1 schema — same structure as L00)
                                                                          4. 4. Build Gate 0 UI component that reads L00 and runs the proof loop
                                                                             5. 5. Confirm/create SOM_Mastery_Ledger table in Airtable (appTN4wNd5Kgbqdwl) — field names TO VERIFY
                                                                                6. 6. Re-enable T.A.M.i engine after voice loop confirmed stable
                                                                                  
                                                                                   7. ## LAST COMMITS
                                                                                   8. - 6a3249a: Add files via upload — L00_major_scale_pattern.json (May 21, 2026)
                                                                                      - - 904e868: Wire cockpit conceptTitle/conceptDesc from URL param
                                                                                        - - fedd806: Dynamic concept routing via ?concept= URL param
                                                                                          - - 6a01ea3: Add CLAUDE.md + PROJECT_BRAIN_HANDOFF.md
                                                                                            - - 151d954: Pass 2 smart evaluator, mic check, fallback, debug badge
                                                                                             
                                                                                              - ## BASELINES (from May 19, 2026 session)
                                                                                              - - MOTESART_ENGINE=23fb225
                                                                                                - - TAMI_P1=51eaab4
                                                                                                  - - TAMI_CONTRACT=a403d22
                                                                                                    - - TAMI_P2=89dd2ba
                                                                                                      - - TAMI_P1A_WIRE=915345a
                                                                                                        - - MOTESART_PERSONALITY=05ae905
                                                                                                          - - EVALUATOR_TIGHTEN=e94db09
                                                                                                            - - STRATEGY_DOC=460bb9c
                                                                                                              - - CURRICULUM_1B2=1fc98cf
                                                                                                                - - VISUAL_1B3=da61e15
                                                                                                                  - - Bundle: index-ktBHfYJg.js
                                                                                                                    - - AIRTABLE_BASE_ID=appTN4wNd5Kgbqdwl
                                                                                                                     
                                                                                                                      - ## PROTECTED FILES
                                                                                                                      - Registration.jsx, auth.py, GamePage.jsx, all working dashboards, L01_c_major_scale.json (existing curriculum planner — do not overwrite)
                                                                                                                     
                                                                                                                      - ## TO VERIFY
                                                                                                                      - - SOM_Mastery_Ledger table in Airtable: does it exist? field names? — required before any evidence write
                                                                                                                        - - VITE_MOTESART_CLAUDE_KEY in Netlify env vars
                                                                                                                          - - End-to-end mic test on iPhone 390x844 and 430x932 (mobile ship gate)
