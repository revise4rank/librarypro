"use client";

import { apiFetch } from "./api";

export type QueuedOfflineActionType =
  | "qr.checkin"
  | "qr.checkout"
  | "payment.pay"
  | "owner.payment.create"
  | "owner.expense.create"
  | "owner.notification.create";

export type QueuedOfflineAction = {
  id: string;
  type: QueuedOfflineActionType;
  path: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: Record<string, unknown>;
  createdAt: string;
};

export type QueuedQrAction = {
  id: string;
  action: "checkin" | "checkout";
  qrPayload: string;
  createdAt: string;
};

const DB_NAME = "nextlib-offline";
const STORE_NAME = "offline-actions";
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (db.objectStoreNames.contains("qr-actions")) {
        db.deleteObjectStore("qr-actions");
      }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    runner(store, resolve, reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function enqueueOfflineAction(
  action: Omit<QueuedOfflineAction, "id" | "createdAt"> & { createdAt?: string },
) {
  const queued: QueuedOfflineAction = {
    id: `${action.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: action.type,
    path: action.path,
    method: action.method,
    body: action.body,
    createdAt: action.createdAt ?? new Date().toISOString(),
  };

  await withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(queued);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  return queued;
}

export async function listQueuedOfflineActions(filterType?: QueuedOfflineAction["type"]) {
  const items = await withStore<QueuedOfflineAction[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as QueuedOfflineAction[]) ?? []);
    request.onerror = () => reject(request.error);
  });

  return filterType ? items.filter((item) => item.type === filterType) : items;
}

export async function removeQueuedOfflineAction(id: string) {
  await withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function flushQueuedOfflineActions(filterType?: QueuedOfflineAction["type"]) {
  const items = await listQueuedOfflineActions(filterType);
  let synced = 0;

  for (const item of items) {
    await apiFetch(item.path, {
      method: item.method,
      body: JSON.stringify({
        ...item.body,
        clientEventId: item.id,
      }),
    });
    await removeQueuedOfflineAction(item.id);
    synced += 1;
  }

  return synced;
}

export async function enqueueQrAction(action: Omit<QueuedQrAction, "id">) {
  return enqueueOfflineAction({
    type: action.action === "checkin" ? "qr.checkin" : "qr.checkout",
    method: "POST",
    path: action.action === "checkin" ? "/checkins/scan" : "/checkins/checkout",
    body: {
      qrPayload: action.qrPayload,
      scannedAtDevice: action.createdAt,
    },
    createdAt: action.createdAt,
  });
}

export async function listQueuedQrActions(): Promise<QueuedQrAction[]> {
  const items = await listQueuedOfflineActions();

  return items
    .filter((item) => item.type === "qr.checkin" || item.type === "qr.checkout")
    .map((item) => ({
      id: item.id,
      action: item.type === "qr.checkin" ? "checkin" : "checkout",
      qrPayload: String(item.body.qrPayload ?? ""),
      createdAt: item.createdAt,
    }));
}

export async function flushQueuedQrActions() {
  const qrActions = await listQueuedOfflineActions();
  const qrTypes = qrActions
    .filter((item) => item.type === "qr.checkin" || item.type === "qr.checkout")
    .map((item) => item.type);

  let synced = 0;
  for (const qrType of [...new Set(qrTypes)]) {
    synced += await flushQueuedOfflineActions(qrType);
  }

  return synced;
}

export async function enqueueStudentPaymentAction(paymentId: string, referenceNo: string) {
  return enqueueOfflineAction({
    type: "payment.pay",
    method: "POST",
    path: `/student/payments/${paymentId}/pay`,
    body: {
      method: "ONLINE",
      referenceNo,
    },
  });
}

export async function listQueuedStudentPaymentActions() {
  return listQueuedOfflineActions("payment.pay");
}

export async function flushQueuedStudentPaymentActions() {
  return flushQueuedOfflineActions("payment.pay");
}

export async function enqueueOwnerPaymentAction(input: {
  studentName: string;
  amount: number;
  method: string;
  status: string;
  dueDate?: string;
  paidAt?: string;
  referenceNo?: string;
  notes?: string;
}) {
  return enqueueOfflineAction({
    type: "owner.payment.create",
    method: "POST",
    path: "/owner/payments",
    body: input,
  });
}

export async function listQueuedOwnerPaymentActions() {
  return listQueuedOfflineActions("owner.payment.create");
}

export async function flushQueuedOwnerPaymentActions() {
  return flushQueuedOfflineActions("owner.payment.create");
}

export async function enqueueOwnerExpenseAction(input: {
  category: string;
  title: string;
  amount: number;
  spentOn: string;
  notes?: string;
}) {
  return enqueueOfflineAction({
    type: "owner.expense.create",
    method: "POST",
    path: "/owner/expenses",
    body: input,
  });
}

export async function listQueuedOwnerExpenseActions() {
  return listQueuedOfflineActions("owner.expense.create");
}

export async function flushQueuedOwnerExpenseActions() {
  return flushQueuedOfflineActions("owner.expense.create");
}

export async function enqueueOwnerNotificationAction(input: {
  title: string;
  type: string;
  audience: string;
  message: string;
}) {
  return enqueueOfflineAction({
    type: "owner.notification.create",
    method: "POST",
    path: "/owner/notifications",
    body: input,
  });
}

export async function listQueuedOwnerNotificationActions() {
  return listQueuedOfflineActions("owner.notification.create");
}

export async function flushQueuedOwnerNotificationActions() {
  return flushQueuedOfflineActions("owner.notification.create");
}
