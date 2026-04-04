import { Router } from "express";
import { loginController, logoutController, meController, studentRegisterController } from "../controllers/auth.controller";
import { razorpayWebhookController } from "../controllers/billing.controller";
import {
  getBillingSubscriptionController,
  renewBillingSubscriptionController,
} from "../controllers/billing-subscription.controller";
import { getStudentEntryQrController, scanCheckInController, scanCheckOutController } from "../controllers/checkin.controller";
import {
  createPublicLibraryContactLeadController,
  createStudentLibraryReviewController,
  listAdminReviewReportsController,
  getOwnerPublicProfileController,
  getPublicLibraryProfileController,
  listPublicLibraryReviewsController,
  listOwnerLeadsController,
  moderateLibraryReviewController,
  reportLibraryReviewController,
  searchMarketplaceSuggestionsController,
  getSubdomainAvailabilityController,
  publishOwnerPublicProfileController,
  saveOwnerPublicProfileController,
  searchMarketplaceLibrariesController,
  updateOwnerLeadController,
} from "../controllers/public-profile.controller";
import {
  createAdminOfferController,
  createOwnerOfferController,
  listAdminOffersController,
  listOfferCategoriesController,
  listOffersController,
  trackOfferClickController,
  trackOfferViewController,
} from "../controllers/offers.controller";
import {
  completeStudentRevisionController,
  createManualRevisionController,
  createOwnerStudentInterventionNoteController,
  createStudentFeedPostController,
  createSyllabusSubjectController,
  createSyllabusTopicController,
  getStudentFeedController,
  getOwnerStudentProductivityController,
  getOwnerProductivityTrendsController,
  getStudentRevisionDashboardController,
  listOwnerFollowUpQueueController,
  getStudentAnalyticsController,
  getStudentFocusLeaderboardController,
  getStudentSyllabusAnalyticsController,
  getStudentSyllabusController,
  listStudentLibrariesController,
  setActiveStudentLibraryController,
  updateStudentFeedVisibilityController,
  updateOwnerStudentInterventionStatusController,
  updateSyllabusTopicProgressController,
} from "../controllers/productivity.controller";
import {
  assignOwnerSeatController,
  createOwnerFloorController,
  createOwnerNotificationController,
  createOwnerExpenseController,
  createOwnerAdminController,
  createOwnerPaymentController,
  createOwnerSeatsController,
  createOwnerStudentController,
  createStudentJoinRequestController,
  getStudentRejoinOptionsController,
  reserveStudentRejoinSeatController,
  createStudentRejoinRequestController,
  deleteOwnerStudentController,
  deleteOwnerAdminController,
  getAdminDashboardController,
  getOwnerDashboardController,
  getOwnerCheckinsController,
  getOwnerPaymentReceiptController,
  listOwnerFloorsController,
  exportOwnerPaymentReceiptController,
  getOwnerReportsSummaryController,
  getOwnerSettingsController,
  getStudentDashboardController,
  getStudentFocusTrackerController,
  getStudentPaymentReceiptController,
  listOwnerNotificationsController,
  listOwnerExpensesController,
  listOwnerAdminsController,
  listOwnerAuditLogsController,
  listOwnerJoinRequestsController,
  listStudentJoinRequestsController,
  listOwnerPaymentsController,
  listOwnerSeatsController,
  listOwnerStudentsController,
  listAdminLibrariesController,
  listAdminPaymentsController,
  listAdminPlanSummariesController,
  listStudentNotificationsController,
  listStudentPaymentsController,
  payStudentPaymentController,
  regenerateOwnerQrController,
  rejectOwnerJoinRequestController,
  sendDueRecoveryCampaignController,
  approveOwnerJoinRequestController,
  exportOwnerReportController,
  updateStudentFocusGoalsController,
  updateOwnerSettingsController,
  updateOwnerPaymentController,
  updateOwnerFloorController,
  updateOwnerSeatController,
  updateOwnerStudentController,
  createStudentFocusSessionController,
  createStudentFocusSubjectController,
  exitStudentLibraryController,
  updateOwnerAdminPermissionsController,
} from "../controllers/owner-operations.controller";
import { uploadPublicProfileAssetController } from "../controllers/upload.controller";
import { asyncHandler } from "../lib/async-handler";
import { publicProfileUpload } from "../lib/upload";
import { requireOwnerPermission } from "../middleware/owner-permission.middleware";
import { requireRole } from "../middleware/require-role.middleware";

export const router = Router();

router.post("/auth/login", asyncHandler(loginController));
router.post("/auth/student/register", asyncHandler(studentRegisterController));
router.post("/auth/logout", asyncHandler(logoutController));
router.get("/auth/me", asyncHandler(meController));
router.post("/billing/razorpay/webhook", asyncHandler(razorpayWebhookController));
router.get("/billing/subscription", requireRole(["LIBRARY_OWNER"]), asyncHandler(getBillingSubscriptionController));
router.post("/billing/subscription/renew", requireRole(["LIBRARY_OWNER"]), asyncHandler(renewBillingSubscriptionController));
router.get("/student/entry-qr", requireRole(["STUDENT"]), asyncHandler(getStudentEntryQrController));
router.post("/checkins/scan", requireRole(["STUDENT"]), asyncHandler(scanCheckInController));
router.post("/checkins/checkout", requireRole(["STUDENT"]), asyncHandler(scanCheckOutController));
router.get("/public/subdomain-availability", asyncHandler(getSubdomainAvailabilityController));
router.get("/public/libraries/suggestions", asyncHandler(searchMarketplaceSuggestionsController));
router.get("/public/libraries/search", asyncHandler(searchMarketplaceLibrariesController));
router.get("/offers/categories", asyncHandler(listOfferCategoriesController));
router.get("/offers", asyncHandler(listOffersController));
router.post("/offers/click", asyncHandler(trackOfferClickController));
router.post("/offers/:offerId/view", asyncHandler(trackOfferViewController));
router.get("/public/libraries/:slugOrSubdomain", asyncHandler(getPublicLibraryProfileController));
router.get("/public/libraries/:slugOrSubdomain/reviews", asyncHandler(listPublicLibraryReviewsController));
router.post("/public/libraries/:slugOrSubdomain/contact", asyncHandler(createPublicLibraryContactLeadController));
router.post("/public/reviews/:reviewId/report", asyncHandler(reportLibraryReviewController));
router.get("/owner/public-profile", requireRole(["LIBRARY_OWNER"]), asyncHandler(getOwnerPublicProfileController));
router.post("/owner/public-profile", requireRole(["LIBRARY_OWNER"]), asyncHandler(saveOwnerPublicProfileController));
router.patch("/owner/public-profile/publish", requireRole(["LIBRARY_OWNER"]), asyncHandler(publishOwnerPublicProfileController));
router.get("/owner/leads", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("admissions"), asyncHandler(listOwnerLeadsController));
router.get("/owner/admins", requireRole(["LIBRARY_OWNER"]), asyncHandler(listOwnerAdminsController));
router.post("/owner/admins", requireRole(["LIBRARY_OWNER"]), asyncHandler(createOwnerAdminController));
router.delete("/owner/admins/:adminUserId", requireRole(["LIBRARY_OWNER"]), asyncHandler(deleteOwnerAdminController));
router.patch("/owner/admins/:adminUserId/permissions", requireRole(["LIBRARY_OWNER"]), asyncHandler(updateOwnerAdminPermissionsController));
router.get("/owner/audit-logs", requireRole(["LIBRARY_OWNER"]), asyncHandler(listOwnerAuditLogsController));
router.get("/owner/join-requests", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("admissions"), asyncHandler(listOwnerJoinRequestsController));
router.post("/owner/join-requests/:requestId/approve", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("admissions"), asyncHandler(approveOwnerJoinRequestController));
router.post("/owner/join-requests/:requestId/reject", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("admissions"), asyncHandler(rejectOwnerJoinRequestController));
router.patch("/owner/leads/:leadId", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("admissions"), asyncHandler(updateOwnerLeadController));
router.post("/owner/offers", requireRole(["LIBRARY_OWNER"]), asyncHandler(createOwnerOfferController));
router.get("/owner/students", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("students"), asyncHandler(listOwnerStudentsController));
router.get("/owner/students/:studentUserId/productivity", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("students"), asyncHandler(getOwnerStudentProductivityController));
router.post("/owner/students/:studentUserId/interventions", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("students"), asyncHandler(createOwnerStudentInterventionNoteController));
router.patch("/owner/interventions/:noteId", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("students"), asyncHandler(updateOwnerStudentInterventionStatusController));
router.get("/owner/productivity/followups", requireRole(["LIBRARY_OWNER"]), asyncHandler(listOwnerFollowUpQueueController));
router.get("/owner/productivity/trends", requireRole(["LIBRARY_OWNER"]), asyncHandler(getOwnerProductivityTrendsController));
router.get("/owner/dashboard", requireRole(["LIBRARY_OWNER"]), asyncHandler(getOwnerDashboardController));
router.get("/owner/reports", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("reports"), asyncHandler(getOwnerReportsSummaryController));
router.get("/owner/reports/export", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("reports"), asyncHandler(exportOwnerReportController));
router.post("/owner/campaigns/due-recovery", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("notifications"), asyncHandler(sendDueRecoveryCampaignController));
router.post("/owner/students", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("students"), asyncHandler(createOwnerStudentController));
router.patch("/owner/students/:assignmentId", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("students"), asyncHandler(updateOwnerStudentController));
router.delete("/owner/students/:assignmentId", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("students"), asyncHandler(deleteOwnerStudentController));
router.get("/owner/seats", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("seat_control"), asyncHandler(listOwnerSeatsController));
router.get("/owner/floors", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("seat_control"), asyncHandler(listOwnerFloorsController));
router.get("/owner/checkins", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("checkins"), asyncHandler(getOwnerCheckinsController));
router.post("/owner/floors", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("seat_control"), asyncHandler(createOwnerFloorController));
router.patch("/owner/floors/:floorId", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("seat_control"), asyncHandler(updateOwnerFloorController));
router.post("/owner/seats", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("seat_control"), asyncHandler(createOwnerSeatsController));
router.patch("/owner/seats/:seatId", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("seat_control"), asyncHandler(updateOwnerSeatController));
router.post("/owner/seats/assign", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("seat_control"), asyncHandler(assignOwnerSeatController));
router.get("/owner/payments", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("payments"), asyncHandler(listOwnerPaymentsController));
router.get("/owner/payments/:paymentId/receipt", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("payments"), asyncHandler(getOwnerPaymentReceiptController));
router.get("/owner/payments/:paymentId/receipt/export", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("payments"), asyncHandler(exportOwnerPaymentReceiptController));
router.post("/owner/payments", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("payments"), asyncHandler(createOwnerPaymentController));
router.patch("/owner/payments/:paymentId", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("payments"), asyncHandler(updateOwnerPaymentController));
router.get("/owner/expenses", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("reports"), asyncHandler(listOwnerExpensesController));
router.post("/owner/expenses", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("reports"), asyncHandler(createOwnerExpenseController));
router.get("/owner/notifications", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("notifications"), asyncHandler(listOwnerNotificationsController));
router.post("/owner/notifications", requireRole(["LIBRARY_OWNER"]), requireOwnerPermission("notifications"), asyncHandler(createOwnerNotificationController));
router.get("/owner/settings", requireRole(["LIBRARY_OWNER"]), asyncHandler(getOwnerSettingsController));
router.patch("/owner/settings", requireRole(["LIBRARY_OWNER"]), asyncHandler(updateOwnerSettingsController));
router.post("/owner/settings/regenerate-qr", requireRole(["LIBRARY_OWNER"]), asyncHandler(regenerateOwnerQrController));
router.get("/student/payments", requireRole(["STUDENT"]), asyncHandler(listStudentPaymentsController));
router.get("/student/dashboard", requireRole(["STUDENT"]), asyncHandler(getStudentDashboardController));
router.get("/student/focus", requireRole(["STUDENT"]), asyncHandler(getStudentFocusTrackerController));
router.get("/student/focus/leaderboard", requireRole(["STUDENT"]), asyncHandler(getStudentFocusLeaderboardController));
router.get("/student/analytics", requireRole(["STUDENT"]), asyncHandler(getStudentAnalyticsController));
router.get("/student/revisions", requireRole(["STUDENT"]), asyncHandler(getStudentRevisionDashboardController));
router.post("/student/revisions", requireRole(["STUDENT"]), asyncHandler(createManualRevisionController));
router.patch("/student/revisions/:revisionId/complete", requireRole(["STUDENT"]), asyncHandler(completeStudentRevisionController));
router.get("/student/feed", requireRole(["STUDENT"]), asyncHandler(getStudentFeedController));
router.post("/student/feed/posts", requireRole(["STUDENT"]), asyncHandler(createStudentFeedPostController));
router.patch("/student/feed/visibility", requireRole(["STUDENT"]), asyncHandler(updateStudentFeedVisibilityController));
router.get("/student/libraries", requireRole(["STUDENT"]), asyncHandler(listStudentLibrariesController));
router.patch("/student/libraries/:libraryId/active", requireRole(["STUDENT"]), asyncHandler(setActiveStudentLibraryController));
router.post("/student/libraries/:libraryId/exit", requireRole(["STUDENT"]), asyncHandler(exitStudentLibraryController));
router.get("/student/libraries/:libraryId/rejoin-options", requireRole(["STUDENT"]), asyncHandler(getStudentRejoinOptionsController));
router.post("/student/libraries/:libraryId/rejoin-seats/:seatNumber/reserve", requireRole(["STUDENT"]), asyncHandler(reserveStudentRejoinSeatController));
router.post("/student/libraries/:libraryId/rejoin", requireRole(["STUDENT"]), asyncHandler(createStudentRejoinRequestController));
router.post("/student/libraries/:libraryId/reviews", requireRole(["STUDENT"]), asyncHandler(createStudentLibraryReviewController));
router.post("/student/join-requests/scan", requireRole(["STUDENT"]), asyncHandler(createStudentJoinRequestController));
router.get("/student/join-requests", requireRole(["STUDENT"]), asyncHandler(listStudentJoinRequestsController));
router.get("/student/syllabus", requireRole(["STUDENT"]), asyncHandler(getStudentSyllabusController));
router.get("/student/syllabus/analytics", requireRole(["STUDENT"]), asyncHandler(getStudentSyllabusAnalyticsController));
router.post("/student/syllabus/subjects", requireRole(["STUDENT"]), asyncHandler(createSyllabusSubjectController));
router.post("/student/syllabus/topics", requireRole(["STUDENT"]), asyncHandler(createSyllabusTopicController));
router.patch("/student/syllabus/topics/:topicId/progress", requireRole(["STUDENT"]), asyncHandler(updateSyllabusTopicProgressController));
router.patch("/student/focus/goals", requireRole(["STUDENT"]), asyncHandler(updateStudentFocusGoalsController));
router.post("/student/focus/subjects", requireRole(["STUDENT"]), asyncHandler(createStudentFocusSubjectController));
router.post("/student/focus/sessions", requireRole(["STUDENT"]), asyncHandler(createStudentFocusSessionController));
router.post("/student/payments/:paymentId/pay", requireRole(["STUDENT"]), asyncHandler(payStudentPaymentController));
router.get("/student/payments/:paymentId/receipt", requireRole(["STUDENT"]), asyncHandler(getStudentPaymentReceiptController));
router.get("/student/notifications", requireRole(["STUDENT"]), asyncHandler(listStudentNotificationsController));
router.get("/admin/dashboard", requireRole(["SUPER_ADMIN"]), asyncHandler(getAdminDashboardController));
router.get("/admin/libraries", requireRole(["SUPER_ADMIN"]), asyncHandler(listAdminLibrariesController));
router.get("/admin/plans", requireRole(["SUPER_ADMIN"]), asyncHandler(listAdminPlanSummariesController));
router.get("/admin/payments", requireRole(["SUPER_ADMIN"]), asyncHandler(listAdminPaymentsController));
router.get("/admin/offers", requireRole(["SUPER_ADMIN"]), asyncHandler(listAdminOffersController));
router.post("/admin/offers", requireRole(["SUPER_ADMIN"]), asyncHandler(createAdminOfferController));
router.get("/admin/review-reports", requireRole(["SUPER_ADMIN"]), asyncHandler(listAdminReviewReportsController));
router.patch("/admin/reviews/:reviewId/moderate", requireRole(["SUPER_ADMIN"]), asyncHandler(moderateLibraryReviewController));
router.post(
  "/owner/public-profile/uploads",
  requireRole(["LIBRARY_OWNER"]),
  publicProfileUpload.single("file"),
  asyncHandler(uploadPublicProfileAssetController),
);
