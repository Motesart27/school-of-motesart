# SOM Adaptive Music Intelligence Strategy
*Locked: May 19, 2026 | Baseline: TAMI_PHASE_1A_WIRE_BASELINE = 915345a*

## Strategic Doctrine

> Most competitors correct notes. SOM corrects the learner.

School of Motesart is not building a piano app. It is building an adaptive
music intelligence platform that:
- Teaches through the Motesart Theory curriculum and number system
- Listens through student performance signals
- Understands through WYL (learning style) and DPM (motivation/engagement)
- Coaches through real-time confidence tracking, struggle detection, and milestone recognition
- Will expand into posture/form correction via camera analysis
- Will scale through T.A.M.i Ambassadors — specialized human teacher/coach personas

## Phase 1A Milestone

The Phase 1A Wire (commit 915345a) is the first moment SOM stopped
being a music app and started being an adaptive learning system.
Before this commit: student answers went into a text matcher and stopped.
After this commit: every student answer flows through T.A.M.i intelligence,
updates concept confidence, and can trigger struggle/milestone/engagement detection.

This is the foundation everything else builds on.

## Competitive Climate

### Real-time note and timing feedback
Yousician and Skoove listen to note accuracy and timing via microphone.
They correct wrong notes immediately. Strong execution, narrow scope.
Neither system tracks learning style, motivation state, or adaptive concept pacing.

### Gamified music education
Duolingo entered music with a gamified course and a partnered portable piano.
Mainstream EdTech is treating music literacy as a scalable consumer category.
This validates the market. It does not threaten SOM's differentiation.

### AI piano tutors
Multiple AI tutors (including GPT-powered apps) provide explanation and Q&A.
None adapt their teaching STYLE based on how a student learns.
None track motivation intelligence across sessions.

### Computer vision hand and posture tracking
ROLI Airwave uses camera/vision tracking to observe hand motion and finger position.
Hand-tracking and adaptive difficulty are emerging as premium differentiators.
This is the next frontier. SOM must plan for it — but after core answer intelligence is stable.

### Adaptive learning systems
Carnegie Learning and Khan Academy's Khanmigo demonstrate mastery-based progression
and Socratic questioning at scale. SOM's curriculum architecture — WYL + DPM +
Motesart Theory + T.A.M.i — is architecturally ahead of most music-specific apps.

## SOM Differentiation Stack

| Layer | What SOM has | Competitors |
|---|---|---|
| Curriculum | Motesart Theory — numbers before letters, ear before notation | Standard Western notation |
| Learning style | WYL — 4 modes, real-time recalibration | None |
| Motivation | DPM — Drive/Passion/Motivation, 5 tiers | None |
| Performance | Answer signals, confidence tracking, struggle/milestone detection | Note accuracy only |
| Physical (planned) | Camera-based posture and hand position correction | ROLI only |
| Human layer | T.A.M.i Ambassadors — teacher/coach personas | None |

## The 6 Intelligence Layers

1. Curriculum Intelligence — Motesart Theory, number system, 13-phase spine
2. Learning Intelligence — WYL profile, 4 teaching styles, real-time adaptation
3. Motivation Intelligence — DPM scoring, 5-tier engagement, trigger responses
4. Performance Intelligence — note, rhythm, timing, answer accuracy, confidence
5. Physical Intelligence (planned) — posture, hand position, form correction via camera
6. Human Intelligence — T.A.M.i Ambassador layer, teacher/coach personas

## Posture and Form Correction — Requirements Before Building

Do not build camera posture correction until these are true:
- Answer intelligence is verified live with real students
- T.A.M.i event persistence is working (Airtable write)
- WYL and DPM trigger layers are live
- A clear spec exists for what pose data the camera must detect
- Privacy and consent framework is defined for camera use

Posture correction built on a weak foundation is a flashy feature on sand.
Build it fourth — after answer, learning pattern, and engagement intelligence.

## T.A.M.i Ambassador Model

Ambassadors are human teacher/coach/doctor/professor personas loaded dynamically
into T.A.M.i's system prompt. Same Claude API. No fine-tuning.
Each Ambassador has: name, specialty, voice style, teaching approach, backstory.
Students choose their coach. Personality loads into T.A.M.i per session.
Motesart is the default free coach. Premium Ambassadors are the growth model.

Build Ambassador model fifth — after the core intelligence stack is stable.

## SOM Market Intelligence Agent (Proposed)

Name: SOM Market Intelligence Agent
Mission: Weekly research brief on the AI music education and adaptive learning landscape

Weekly brief covers:
1. Competitor movement (Yousician, Skoove, ROLI, Duolingo Music, new entrants)
2. AI/music education trend (new models, new approaches, academic research)
3. Computer vision/posture/form trend (hand tracking, pose estimation, camera tools)
4. Adaptive learning/WYL opportunity (new frameworks, research, partnerships)
5. Gamification/DPM opportunity (engagement models, reward research)
6. Ambassador/educator partnership opportunity (teachers, institutions, artists)
7. Threats (funding, market shifts, feature parity)
8. Recommended SOM action (one specific next move per week)

Feeds: PROJECT_BRAIN.md, SOM roadmap decisions, T.A.M.i curriculum strategy.
Not yet built. Proposed for Phase 1B-7.

## Near-Term Roadmap

Phase 1B-1: Live verification — real student wrong-answer test (next session)
Phase 1B-2: T.A.M.i event persistence — store signals to Airtable
Phase 1B-3: WYL trigger layer — stagnation → teaching style switch
Phase 1B-4: DPM trigger layer — engagement drop → game/reward/encouragement change
Phase 1B-5: Posture/form research spec — define camera detection requirements
Phase 1B-6: T.A.M.i Ambassador model — persona structure and selection flow
Phase 1B-7: SOM Market Intelligence Agent — weekly brief cadence

## Guardrails (Permanent)

- T.A.M.i supports teaching. Motesart remains the primary lesson voice where locked.
- No fake AI claims. No overpromising features before live verification.
- No posture correction until tested and specced. No camera without consent framework.
- No replacing human teachers. SOM augments teachers through the Ambassador model.
- Student data and session signals are private. Never exposed without consent.
- Strategic documents finalized only after audit and agreement — not prematurely.
