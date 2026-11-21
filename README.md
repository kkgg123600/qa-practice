# qa-practice

Manual and automated testing practice across three platforms: web, desktop (Electron) and
mobile (Android, React Native).

| Suite | Tooling | App under test | Tests |
|-------|---------|----------------|-------|
| web | Playwright (Chrome) | Toolshop demo shop, two builds (below) | 20 (9 UI, 10 API, 1 E2E) |
| desktop | Playwright `_electron` | `apps/notes-desktop`, a small Electron app written for this repo | 8 |
| mobile | WebdriverIO + Appium (UiAutomator2), Android emulator | Sauce Labs My Demo App (React Native) v1.3.0, public test app | 6 |

Web builds:

| Build | URL | Role |
|-------|-----|------|
| reference | https://practicesoftwaretesting.com | correct behaviour (the oracle) |
| with-bugs | https://with-bugs.practicesoftwaretesting.com | same shop with seeded defects |

## Run

```bash
npm run test:web        # both web builds
npm run test:desktop    # Electron app
npm run test:mobile     # needs a running Android emulator (see below)
npx playwright show-report
```

Mobile setup: Android SDK in `~/Android/Sdk` (platform-tools, emulator, build-tools 34,
`system-images;android-34;google_apis;x86_64`), AVD `qa34`, KVM access. The APK is not
committed; download it from the upstream release into `mobile/apps/`:

```bash
gh release download v1.3.0 -R saucelabs/my-demo-app-rn -p 'Android-MyDemoAppRN.1.3.0.build-244.apk' -D mobile/apps
emulator -avd qa34 -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -no-snapshot &
```

## CI

`.github/workflows/tests.yml` runs three jobs on push and pull request:

- `web` — matrix over `reference` (must pass) and `with-bugs` (seeded defects; failures are
  expected and reported, the leg does not fail the workflow)
- `desktop` — Electron tests under `xvfb-run`
- `mobile` — Android 14 emulator (`reactivecircus/android-emulator-runner`), APK downloaded and
  checked against a pinned SHA-256

Reports, traces and Appium logs are uploaded as artifacts. Actions are pinned to commit SHAs.

## Design notes

- **Isolation.** Web tests register a fresh user per test through the API. Desktop tests launch
  the app with a temporary profile directory per test. Mobile tests clear app data before each
  test (`mobile: clearApp`). No test depends on another test's state or on run order.
- **No retries.** `retries: 0` on purpose: a retry hides flakiness. The one retry in the suite is
  for transport errors on the web API host, which drops about 1 in 3 new TCP connections
  (`tests/support/http.ts`); HTTP error responses are never retried.
- **Non-deterministic output (desktop "Summarize").** The note summarizer stands in for a local
  AI model: wording, length and latency vary per run. It is tested in two layers:
  1. mocked model (`NOTES_MODEL=mock`) — fixed answer, so the UI flow is asserted exactly;
  2. real model, 5 runs — each answer is checked against an output contract: allowed opener,
     2 to 4 keywords, every keyword taken from the note (nothing invented), main topic present,
     shorter than the note, inside a 5 s latency budget. Variation is recorded as an annotation,
     not asserted.
- **Tests were checked against planted bugs.** With two defects planted in the Electron app
  (no title validation; an invented word in the summary), DESK-03 and DESK-07 failed as
  expected; the app was then restored.
- **Flaky test found and fixed (mobile).** Two separate causes, each diagnosed from evidence
  before changing code:
  1. WebdriverIO wrote its logs under `test-results/`, which Playwright empties at start. Running
     both suites at once deleted the log mid-test (`ENOENT`, then mocha "done() called multiple
     times"). Fix: WebdriverIO output moved to `mobile-results/`.
  2. Intermittent `freshStart` failure ("Timed out waiting for the root AccessibilityNodeInfo"),
     also with nothing else running. logcat showed `pm clear` finishing asynchronously: its
     `Killing ... remove task` landed 5 ms after `activateApp`'s `START` and killed the new
     launch. Fix: confirm the app reached the foreground (`queryAppState === 4`) and re-activate
     if not, max 3 attempts, each retry logged. Only setup is retried, never an assertion.
     After the fix: 3 consecutive runs, 18/18 passed; run 3 hit the race once and recovered.
  Logs: `evidence/mobile-run-2026-11-21-collision.txt`, `-under-load.txt`, `-launch-race.txt`
  (before), `-fixed-1..3.txt` (after).
- **Locators.** Web and desktop use `data-test` attributes; mobile uses accessibility ids read
  from a `uiautomator dump` of the real app.

## Layout

- `tests/` — web UI and API tests; `tests/support/` helpers (API host per build, test users, retry)
- `tests-electron/` — desktop tests; `support/app.ts` launches the app with a fresh profile
- `apps/notes-desktop/` — the Electron app under test
- `mobile/` — `wdio.conf.ts`, `specs/`, `support/`
- `BUGS.md` — bug reports for the with-bugs web build
- `evidence/` — run logs and failure screenshots

## Latest local runs

- 2026-11-10 (`evidence/test-run-2026-11-10-v3.txt`): web reference 20 passed; with-bugs 10 passed,
  8 failed, 2 skipped (cart API does not exist in that build) — 9 reports in `BUGS.md`
- 2026-11-21: web reference 20 passed (`evidence/web-reference-run-2026-11-21.txt`), desktop 8 passed
  (`evidence/desktop-run-2026-11-21.txt`), mobile 6 passed on Android 14 emulator
  in 3 consecutive runs after the launch-race fix (`evidence/mobile-run-2026-11-21-fixed-{1,2,3}.txt`)
- CI: workflow written, not yet run on GitHub
