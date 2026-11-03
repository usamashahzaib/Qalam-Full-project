# Career Momentum Loop

## Product goal

Make Qalam the first place a professional goes when useful work happens, so career proof compounds instead of disappearing into messages, meetings, and memory.

The goal is not maximum time in product. The goal is more useful career days and stronger reusable proof.

## Core loop

1. Trigger: "I did something useful today that I may forget."
2. Action: answer one focused prompt in under 30 seconds.
3. Reward: close today's loop, see momentum change, and receive one relevant next move.
4. Investment: the saved signal strengthens a private Signal Bank and makes future career actions easier.

## Retention mechanics

- Seven rotating prompts reduce blank-page effort.
- One signal per local day creates a clear, finite behavior.
- The current run stays alive until the day ends. Qalam does not punish a user in the morning for not acting yet.
- The seven-day rhythm shows consistency without threatening the user with artificial loss.
- The next best move changes with real product state: proof, profile, visibility, or application pipeline.
- Reminder email is opt-in, user-timed, timezone-aware, and skipped when today's signal already exists.
- Every reminder can be disabled from the same dashboard surface where it was enabled.
- After completion, the interface says the user is done for today.

## Momentum definition

Momentum is a transparent activity indicator, not an employability prediction.

| Pillar | Maximum | Inputs |
| --- | ---: | --- |
| Proof | 35 | Daily signals, evidence, documented evidence |
| Direction | 15 | Career profile completion |
| Visibility | 25 | Published posts in the last 30 days |
| Pipeline | 15 | Active applications and interview-stage progress |
| Rhythm | 10 | Useful active days in the last seven days |

## Success metrics

Primary metric: **Useful Career Days per weekly active user**.

Activation:

- signup to first daily signal;
- time to first signal;
- first signal to second useful day.

Retention:

- day 1, day 7, and day 30 return rate;
- users with three or more useful days per week;
- organic opens versus reminder-assisted opens;
- reminder open to signal completion;
- signal capture to next-best-action completion.

Habit evidence:

- identify the actions that separate retained users from casual users;
- confirm at least 5 percent of activated users return without an external prompt;
- reduce prompts as organic return behavior rises.

Guardrails:

- reminder opt-out rate;
- reminder complaint and unsubscribe rate;
- sessions with no useful action;
- repeated daily sessions after completion;
- user-reported regret or pressure.

## Diagnostic scores

Hook Model design completeness: 10/10.

- Internal trigger is specific.
- Action is small and clear.
- Reward varies with meaningful product state.
- Investment improves the next use.
- Ethics gate passes as a facilitator pattern.

B=MAP design completeness: 10/10.

- Core action is under 60 seconds.
- It works in low-motivation moments.
- Prompts are opt-in and skipped when the action is complete.
- Completion receives immediate feedback.
- Mental effort is reduced with one prompt and one example.
- Users scale naturally into the next useful action.

These are design scores, not retention evidence. Real retention must be established through cohort data after deployment.

## Deployment requirements

1. Apply `20260824160000_career_momentum_loop.sql`.
2. Deploy the application.
3. Re-run `scripts/setup-qstash-schedules.mjs` to register the hourly reminder sweep.
4. Verify `RESEND_API_KEY`, `QSTASH_TOKEN`, `CRON_SECRET`, and the production origin.
5. Test one opted-in reminder in a non-production workspace before enabling the schedule for all users.
