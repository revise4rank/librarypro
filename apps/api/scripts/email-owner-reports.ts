import nodemailer from "nodemailer";
import { loadMonitoring } from "../src/lib/monitoring";
import { exportOwnerReport, getOwnerReportsSummary, listOwnerReportRecipients } from "../src/services/owner-operations.service";

loadMonitoring();

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const smtpHost = requireEnv("SMTP_HOST");
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpUser = requireEnv("SMTP_USER");
  const smtpPass = requireEnv("SMTP_PASS");
  const reportFromEmail = requireEnv("REPORT_FROM_EMAIL");

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const owners = await listOwnerReportRecipients();
  for (const owner of owners) {
    const summary = await getOwnerReportsSummary({
      libraryId: owner.library_id,
    });
    const pdf = await exportOwnerReport({
      libraryId: owner.library_id,
      reportType: "summary",
      format: "pdf",
    });
    const xlsx = await exportOwnerReport({
      libraryId: owner.library_id,
      reportType: "payments",
      format: "xlsx",
    });

    await transporter.sendMail({
      from: reportFromEmail,
      to: owner.owner_email!,
      subject: `LibraryPro weekly report | ${owner.library_name}`,
      text: [
        `Hello ${owner.owner_name},`,
        ``,
        `Here is your latest LibraryPro business snapshot for ${owner.library_name}.`,
        `Paid revenue: Rs. ${summary.metrics.paidRevenue.toLocaleString("en-IN")}`,
        `Due revenue: Rs. ${summary.metrics.dueRevenue.toLocaleString("en-IN")}`,
        `Expenses: Rs. ${summary.metrics.expenses.toLocaleString("en-IN")}`,
        `Occupancy: ${summary.metrics.occupancyPercent}%`,
        ``,
        `Attachments include a PDF summary and an XLSX payment export.`,
      ].join("\n"),
      attachments: [
        {
          filename: pdf.filename,
          content: pdf.buffer,
          contentType: pdf.contentType,
        },
        {
          filename: xlsx.filename,
          content: xlsx.buffer,
          contentType: xlsx.contentType,
        },
      ],
    });
  }

  console.log(`Sent ${owners.length} owner report email(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
