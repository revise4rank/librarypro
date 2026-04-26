import { apiFetch, getApiBaseUrl, readSession } from "./api";

export async function fetchOwnerFinanceDashboard<T>() {
  return apiFetch<T>("/owner/dashboard");
}

export async function fetchOwnerPayments<T>() {
  return apiFetch<T>("/owner/payments");
}

export async function fetchOwnerReports<T>(fromDate?: string, toDate?: string) {
  const params = new URLSearchParams();
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  return apiFetch<T>(`/owner/reports?${params.toString()}`);
}

export async function exportOwnerReport(reportType: string, format: "xlsx" | "pdf", fromDate?: string, toDate?: string) {
  const params = new URLSearchParams({ reportType, format });
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);

  const headers = new Headers();
  const csrfToken = readSession()?.csrfToken;
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(`${getApiBaseUrl()}/v1/owner/reports/export?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error("Export failed");
  }

  return response;
}
