# LibraryPro API Surface

Base prefix: `/v1`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Marketplace / Public

- `GET /marketplace/libraries`
- `GET /marketplace/libraries/:slug`
- `GET /marketplace/libraries/:slug/layout`

## Libraries

- `GET /libraries/current`
- `PATCH /libraries/current`
- `GET /libraries/current/settings`
- `PATCH /libraries/current/settings`
- `POST /libraries/current/qr/regenerate`

## Seats

- `GET /seats`
- `POST /seats`
- `PATCH /seats/:seatId`
- `DELETE /seats/:seatId`
- `GET /seats/layout`
- `PUT /seats/layout`
- `POST /seats/:seatId/assign`
- `POST /seats/:seatId/release`

## Students

- `GET /students`
- `POST /students`
- `GET /students/:studentId`
- `PATCH /students/:studentId`
- `POST /students/:studentId/assignment`
- `PATCH /students/:studentId/assignment/:assignmentId`
- `GET /students/:studentId/checkins`

## Check-in

- `POST /checkins/scan`
- `POST /checkins/:checkinId/checkout`
- `GET /checkins`

## Finance

- `GET /payments`
- `POST /payments`
- `PATCH /payments/:paymentId`
- `GET /expenses`
- `POST /expenses`
- `PATCH /expenses/:expenseId`

## Notifications

- `GET /notifications`
- `POST /notifications`
- `PATCH /notifications/:notificationId/read`

## Analytics

- `GET /analytics/summary`
- `GET /analytics/revenue`
- `GET /analytics/attendance`

## Billing / SaaS Subscription

- `GET /billing/subscription`
- `POST /billing/subscription/create`
- `POST /billing/subscription/renew`
- `POST /billing/subscription/cancel`
- `POST /billing/razorpay/webhook`

## Super Admin

- `GET /admin/libraries`
- `GET /admin/libraries/:libraryId`
- `PATCH /admin/libraries/:libraryId/status`
- `GET /admin/analytics/mrr`
- `GET /admin/platform-payments`
- `GET /admin/plans`
- `POST /admin/plans`
