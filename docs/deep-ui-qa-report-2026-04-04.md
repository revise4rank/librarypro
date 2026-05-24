# Deep UI QA Report

Date: `2026-04-04`
Workspace: `C:\Users\vikki\Downloads\library`

Audit artifacts:
- Report: [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\report.json](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\report.json)
- Findings: [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\findings.json](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\findings.json)

## Scope

The audit covered:
- Public website pages
- Marketplace
- Library slug pages
- Tenant public website
- Owner dashboard and owner operational screens
- Student dashboard and student productivity screens
- Superadmin screens

Verification commands run:
- `npm run build -w @librarypro/web`
- `npm run test -w @librarypro/api`
- `npm run audit:routes`
- `npm run audit:deep-ui`
- `npm run e2e:smoke`

## Summary

- Pages audited: `41`
- Pages with findings in raw audit: `12`
- Pages with open blocking UI issue after human review: `0`
- Real issues fixed in this pass: `2`

## Fixed In This Pass

### Homepage broken public library link

Status: `Fixed`

Issue:
- Homepage linked to `/libraries/focuslibrary`
- Real public route uses `/libraries/focus-library`

Fix:
- Updated [C:\Users\vikki\Downloads\library\apps\web\src\app\page.tsx](C:\Users\vikki\Downloads\library\apps\web\src\app\page.tsx)

Impact:
- Public users can now open the intended library detail page from the homepage hero/preview area.

### Missing app icon response

Status: `Fixed`

Issue:
- Browser requested favicon/app icon and produced noisy 404 console output.

Fix:
- Added [C:\Users\vikki\Downloads\library\apps\web\src\app\icon.tsx](C:\Users\vikki\Downloads\library\apps\web\src\app\icon.tsx)

Impact:
- Cleaner browser console and better app polish.

## Open Actionable Issues

None reproduced as blocking after clean restart and rerun.

## Non-Blocking Raw Findings Explained

### Public home

Screenshot:
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\public-home.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\public-home.png)

Raw finding:
- `Failed requests: 1`

Assessment:
- Non-blocking.
- Caused by aborted Next.js prefetch/navigation request to student login during automated crawl.

### Marketplace

Screenshot:
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\marketplace.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\marketplace.png)

Raw findings:
- `Console errors: 1`
- `Failed requests: 1`

Assessment:
- Non-blocking in current run.
- Page rendered correctly and interactive controls were present.
- Remaining noise came from aborted student login prefetch.

### Library public pages

Screenshots:
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-home.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-home.png)
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-about.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-about.png)
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-pricing.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-pricing.png)
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-contact.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-slug-contact.png)
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-subdomain-home.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\library-subdomain-home.png)

Raw findings:
- `Console errors`
- `Failed requests`

Assessment:
- Non-blocking in current run.
- Pages rendered correctly.
- Errors were `_rsc` prefetch aborts caused by automated crawl while page-to-page navigation links were discovered.

### Owner students

Screenshot:
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\owner-students.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\owner-students.png)

Raw finding:
- `Failed requests: 5`

Assessment:
- Non-blocking.
- These were aborted prefetches for individual student detail pages discovered by the crawler.
- Owner student roster rendered and link surface was present.

### Owner website

Screenshot:
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\owner-website.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\owner-website.png)

Raw findings:
- `Console errors: 2`
- `Failed requests: 1`

Assessment:
- Non-blocking in reproduced run.
- No page crash reproduced in targeted follow-up check.

### Student dashboard, focus, rewards

Screenshots:
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\student-dashboard.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\student-dashboard.png)
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\student-focus.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\student-focus.png)
- [C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\student-rewards.png](C:\Users\vikki\Downloads\library\artifacts\deep-ui-audit\2026-04-04T09-19-59-432Z\student-rewards.png)

Raw findings:
- `Console errors: 1`
- `Low interactive surface detected` on rewards

Assessment:
- Non-blocking.
- Targeted rerun did not reproduce API `500` responses.
- Rewards page has intentionally lower action density, so the "low interactive surface" signal is not treated as a bug.

## Page-Wise Pass Status

Passed without meaningful findings:
- `/owner/dashboard`
- `/owner/admissions`
- `/owner/admins`
- `/owner/seats`
- `/owner/payments`
- `/owner/reports`
- `/owner/checkins`
- `/owner/leads`
- `/owner/campaigns`
- `/owner/offers`
- `/owner/notifications`
- `/owner/settings`
- `/owner/billing`
- `/student/join-library`
- `/student/syllabus`
- `/student/revisions`
- `/student/feed`
- `/student/offers`
- `/student/payments`
- `/student/notifications`
- `/student/qr`
- `/student/seat`
- `/student/focus-mode`
- `/superadmin/dashboard`
- `/superadmin/libraries`
- `/superadmin/offers`
- `/superadmin/payments`
- `/superadmin/plans`
- `/superadmin/reviews`

Passed with audit noise only:
- `/`
- `/marketplace`
- `/libraries/focus-library`
- `/libraries/focus-library/about`
- `/libraries/focus-library/pricing`
- `/libraries/focus-library/contact`
- `/library-site?slug=focuslibrary`
- `/owner/students`
- `/owner/website`
- `/student/dashboard`
- `/student/focus`
- `/student/rewards`

## Final Punch-List

### Closed

1. Homepage broken public library link
2. Missing icon/favicon response

### Optional future cleanup

1. Reduce Next.js prefetch abort noise in automated Playwright audit by filtering `_rsc` aborted requests from findings.
2. Add a more specific ignore rule in deep UI audit for intentionally low-action pages like rewards.
3. Add a smaller targeted audit mode for only "true failures" so QA report is cleaner by default.

## Current QA Verdict

The website is broadly functioning across public, owner, student, and superadmin surfaces.
No open blocking UI regression was confirmed in the latest deep audit rerun.
The remaining raw findings are mostly crawler-prefetch noise, not broken user-facing flows.
