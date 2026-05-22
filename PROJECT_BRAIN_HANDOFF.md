——✅——✅—✅——✅—————————————————————————# SOM PROJECT BRAIN — HANDOFF
Last Updated: May 21, 2026 | Bundle: index-DbJgJPq1.js

## DOCTRINE STATE (May 21, 2026)

### Motesart Language Constitution v1.1 — RATIFIED ✅
- Commit: 38fda2a (May 21, 2026)
- - Location: docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md
  - - 18 Articles, 10 constitutional locks
    - - Governs: student-facing language, gate order, T.A.M.i voice, homework-game framing, mastery language
      - - Key locks: Together (not squeeze), Skip before whole step, Home before tonic, Family before key, no percentages to students, speak-or-text on every input, Motesart present except quiz moments, Find the Note as universal homework engine
       
        - ### motesart_constitution.md — ADDED TO REPO ✅
        - - Commit: 38fda2a (May 21, 2026)
          - - Location: repo root (was project-files-only before)
            - - Related Doctrine section appended — points to Language Constitution
             
              - ### Gate 0 — Find Home Lesson JSON — COMMITTED ✅
              - - Commit: 38fda2a (May 21, 2026)
                - - Location: public/lesson_data/L00_find_home.json
                  - - 515 lines, 32/32 Constitution audit checks passed
                    - - 9-step gate template: Story Hook → Hear It → Say It → Feel Check → Name It → Quiz It → Explain It → Homework Game → Evidence Logged
                      - - 5 quiz questions, ownership gate (is_ownership_gate: true), Feel Check (internal only), 3 narrative intensity bands, Find Home homework variant at L1
                        - - Next gate pointer: L01_skip_and_together (Gate 1)
                         
                          - ## GATE ARCHITECTURE (Locked May 21, 2026)
                         
                          - | Gate | Name | Status | Lesson File |
                          - |---|---|---|---|
                          - | Gate 0 | Find Home | JSON committed, UI not yet built | L00_find_home.json |
                          - | Gate 1 | Skip & Together | Not started | L01_skip_and_together.json (to build) |
                          - | Gate 2 | The Family Pattern | RECLASSIFIED from old Gate 0 | L00_major_scale_pattern.json (language update pending) |
                          - | Gate 3 | Numbers in C | Not started | |
                          - | Gate 4 | Feel the Pattern | Not started | |
                          - | Gate 5 | Say It Back | Not started | |
                          - | Gate 6 | Finger Path | Not started | |
                          - | Gate 7 | Play It | Not started | |
                          - | Gate 8 | Homework Reinforcement | Not started | |
                         
                          - ### Current Production Gate (Gate 2 — reclassified)
                          - - Route: /practice/C_MAJOR_GATE_0 (live, stays live until Gate 2 is re-threaded)
                            - - Component: MajorScalePatternGate.jsx (preserved per Constitution Article XV)
                              - - Bundle: index-DbJgJPq1.js
                                - - Netlify Deploy: 6a0f5d46359f68e57d3fbaf2
                                  - - Status: DEPLOYED_NOT_SHIPPED (mobile verification pending; language update pending)
                                    - - DO NOT direct first-time students to this route until Gate 0 and Gate 1 are built in front of it
                                     
                                      - ## WHAT'S WORKING
                                      - - Voice loop wired and deployed (Theory Phase)
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
                                                               
                                                                - ## WHAT'S NEEDED NEXT (Ordered)
                                                                - 1. Build Gate 0 UI — Find Home (reads L00_find_home.json, 9-step gate template)
                                                                  2. 2. Draft L01_skip_and_together.json (Gate 1 JSON, same template, audit before build)
                                                                     3. 3. Build Gate 1 UI — Skip & Together
                                                                        4. 4. Re-thread current Pattern Mind as Gate 2 (language update: skip/together language leads, W-W-H as music-world name)
                                                                           5. 5. Wire Find the Note as universal homework engine (reads homework_game block from each gate JSON)
                                                                              6. 6. Live end-to-end mic test on iPhone 390x844 and 430x932 (mobile ship gate)
                                                                                 7. 7. Add VITE_MOTESART_CLAUDE_KEY to Netlify env vars (enables parseIntent AI fallback)
                                                                                    8. 8. Confirm SOM_Mastery_Ledger table in Airtable (appTN4wNd5Kgbqdwl) — TO VERIFY before any evidence write
                                                                                      
                                                                                       9. ## LAST COMMITS
                                                                                       10. - 38fda2a: docs: ratify Motesart Language Constitution v1.1 — lock beginner doctrine, gate order, Find Home
                                                                                           - - b2ea193: feat(gate0): add major scale pattern mastery gate (Pattern Mind — now Gate 2)
                                                                                             - - 6a3249a: Add files via upload — L00_major_scale_pattern.json
                                                                                               - - 38ae555: docs: session handoff May 21 2026 — Gate 0 committed, doctrine locked
                                                                                                
                                                                                                 - ## BASELINES (from May 19, 2026 session)
                                                                                                 - - MOTESART_ENGINE=23fb225
                                                                                                   - - TAMI_P1=51eaab4
                                                                                                     - - TAMI_CONTRACT=a403d22
                                                                                                       - - TAMI_P2=89dd2ba
                                                                                                         - - TAMI_P1A_WIRE=915345a
                                                                                                           - - MOTESART_PERSONALITY=05ae905
                                                                                                             - - EVALUATOR_TIGHTEN=e94db09
                                                                                                               - - Bundle: index-DbJgJPq1.js (updated May 21)
                                                                                                                 - - AIRTABLE_BASE_ID=appTN4wNd5Kgbqdwl
                                                                                                                  
                                                                                                                   - ## PROTECTED FILES
                                                                                                                   - Registration.jsx, auth.py, GamePage.jsx, all working dashboards
                                                                                                                   - MajorScalePatternGate.jsx — PRESERVED (Article XV), reclassified as Gate 2
                                                                                                                   - L00_major_scale_pattern.json — PRESERVED, language update pending
                                                                                                                  
                                                                                                                   - ## TO VERIFY
                                                                                                                   - - SOM_Mastery_Ledger table in Airtable: does it exist? field names?
                                                                                                                     - - Game_Sessions table: confirm field names match L00_find_home.json evidence_logging schema
                                                                                                                       - - VITE_MOTESART_CLAUDE_KEY in Netlify env vars
                                                                                                                         - - End-to-end mic test on iPhone 390x844 and 430x932 (mobile ship gate)
                                                                                                                          
                                                                                                                           - ## DOCTRINE DOCUMENTS (all in repo as of 38fda2a)
                                                                                                                           - - motesart_constitution.md — build process, protected files, approval discipline
                                                                                                                             - - docs/MOTESART_LANGUAGE_CONSTITUTION_v1_1.md — student language, gate order, teaching voice
                                                                                                                               - - docs/MOTESART_VOICE_BIBLE.md — school-safe culturally responsive voice
                                                                                                                                 - - docs/SOM_ADAPTIVE_MUSIC_INTELLIGENCE_STRATEGY.md — adaptive strategy
