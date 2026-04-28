"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { getRealtimeSocket } from "../lib/realtime";
import { DashboardCard } from "./dashboard-shell";

type SeatRow = {
  id: string;
  floor_name: string | null;
  floor_id?: string | null;
  section_name?: string | null;
  seat_number: string;
  row_no: number;
  col_no: number;
  pos_x: number;
  pos_y: number;
  status: string;
  reserved_until?: string | null;
  assignment_id: string | null;
  student_name: string | null;
  student_user_id: string | null;
  plan_name?: string | null;
  payment_status?: string | null;
  ends_at?: string | null;
  last_check_in_at?: string | null;
};

type StudentRow = {
  assignment_id: string;
  student_name: string;
  seat_number: string | null;
  plan_name: string;
  payment_status: string;
  ends_at: string;
  admission_status?: "SEAT_UNALLOTTED" | "SEAT_ALLOTTED";
};

type FloorRow = {
  id: string;
  name: string;
  floor_number: number;
  layout_columns: number;
  layout_rows: number;
  layout_meta?: {
    aisleCells?: string[];
    sectionColors?: Record<string, string>;
  } | null;
};

type FloorDrafts = Record<string, { name: string; layoutRows: number; layoutColumns: number }>;
type FloorMetaDrafts = Record<string, { aisleCells: string[]; sectionColors: Record<string, string> }>;

const seatToneClasses: Record<string, string> = {
  AVAILABLE: "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_10px_18px_rgba(16,185,129,0.10)]",
  OCCUPIED: "border-rose-300 bg-rose-50 text-rose-900 shadow-[0_10px_18px_rgba(244,63,94,0.10)]",
  RESERVED: "border-amber-300 bg-amber-50 text-amber-900 shadow-[0_10px_18px_rgba(245,158,11,0.10)]",
  DISABLED: "border-slate-300 bg-slate-100 text-slate-500 shadow-[0_10px_18px_rgba(100,116,139,0.10)]",
};

function formatReserveTimer(value?: string | null) {
  if (!value) return "No timer";
  const target = new Date(value).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return "Expired";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m left`;
  return `${hours}h ${minutes}m`;
}

function formatStudentInitials(value?: string | null) {
  if (!value) return "FS";
  const parts = value.split(" ").filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "ST";
}

function describeSeatState(seat: SeatRow) {
  if (seat.status === "OCCUPIED") return seat.student_name ?? "Occupied";
  if (seat.status === "RESERVED") return `Reserved - ${formatReserveTimer(seat.reserved_until)}`;
  if (seat.status === "DISABLED") return "Blocked";
  return "Free";
}

function formatSeatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpiringSoon(value?: string | null, days = 7) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = Date.now();
  const diff = parsed.getTime() - now;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function inferZone(seat: SeatRow) {
  const value = `${seat.section_name ?? ""} ${seat.seat_number}`.toLowerCase();
  if (value.includes("girl") || value.includes("female")) return "Girls Zone";
  if (value.includes("boy") || value.includes("male")) return "Boys Zone";
  if (value.includes("quiet") || value.includes("silent")) return "Quiet Zone";
  return "Open Hall";
}

function inferSeatShape(seat: SeatRow) {
  const value = `${seat.section_name ?? ""} ${seat.seat_number}`.toLowerCase();
  if (value.includes("cabin")) return "Cabin";
  if (value.includes("wall") || value.includes("window")) return "Wall Desk";
  return "Study Desk";
}

function getClusterType(col: number) {
  const mod = (col - 1) % 6;
  if (mod <= 1) return "2 Seat Desk";
  if (mod <= 3) return "4 Seat Table";
  return "6 Seat Table";
}

function getPlannerColumnWidth(columns: number) {
  if (columns >= 14) return 84;
  if (columns >= 12) return 88;
  if (columns >= 10) return 94;
  return 104;
}

function InlineHelp({ title, points }: { title: string; points: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lp-border)] bg-white text-sm font-black text-[var(--lp-accent)] shadow-[0_8px_18px_rgba(210,114,61,0.08)]"
        aria-label={`${title} help`}
      >
        ?
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[120] w-72 rounded-[1rem] border border-[var(--lp-border)] bg-white p-3 shadow-[0_20px_44px_rgba(15,23,42,0.14)]">
          <p className="text-sm font-black text-[var(--lp-text)]">{title}</p>
          <div className="mt-2 grid gap-2 text-sm leading-6 text-[var(--lp-muted)]">
            {points.map((point) => (
              <p key={point}>{point}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildNextSeatCode(existingSeatNumbers: string[], prefix: string) {
  const cleanPrefix = prefix.trim().toUpperCase() || "S";
  const seen = new Set(existingSeatNumbers.map((item) => item.trim().toUpperCase()));
  let maxNumber = 0;

  for (const seatNumber of seen) {
    const normalized = seatNumber.trim().toUpperCase();
    if (!normalized.startsWith(cleanPrefix)) continue;
    const suffix = normalized.slice(cleanPrefix.length).replace(/[^0-9]/g, "");
    const numeric = Number.parseInt(suffix || "0", 10);
    if (Number.isFinite(numeric)) {
      maxNumber = Math.max(maxNumber, numeric);
    }
  }

  let candidate = maxNumber + 1;
  while (seen.has(`${cleanPrefix}${candidate}`)) {
    candidate += 1;
  }

  return `${cleanPrefix}${candidate}`;
}

function getZoneTone(zone: string) {
  if (zone === "Girls Zone") return "bg-fuchsia-100 text-fuchsia-700";
  if (zone === "Boys Zone") return "bg-sky-100 text-sky-700";
  if (zone === "Quiet Zone") return "bg-violet-100 text-violet-700";
  return "bg-emerald-100 text-emerald-700";
}

function getZoneAccent(zone: string) {
  if (zone === "Girls Zone") return "#ec4899";
  if (zone === "Boys Zone") return "#0ea5e9";
  if (zone === "Quiet Zone") return "#8b5cf6";
  return "#10b981";
}

function SeatStatusGlyph({ status }: { status: string }) {
  const tone =
    status === "AVAILABLE"
      ? "text-emerald-300"
      : status === "OCCUPIED"
        ? "text-rose-300"
        : status === "RESERVED"
          ? "text-amber-300"
          : "text-slate-300";

  if (status === "AVAILABLE") {
    return (
      <svg viewBox="0 0 20 20" className={`h-4 w-4 ${tone}`} aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.18" />
        <path d="m6.2 10.4 2.3 2.2 5.3-5.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  if (status === "OCCUPIED") {
    return (
      <svg viewBox="0 0 20 20" className={`h-4 w-4 ${tone}`} aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.18" />
        <circle cx="10" cy="7.5" r="2.2" fill="currentColor" />
        <path d="M6.5 14c.8-2.1 2-3.2 3.5-3.2S12.7 11.9 13.5 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (status === "RESERVED") {
    return (
      <svg viewBox="0 0 20 20" className={`h-4 w-4 ${tone}`} aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.18" />
        <path d="M10 5.8v4.5l2.8 1.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 ${tone}`} aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.18" />
      <path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" />
    </svg>
  );
}

const roomLayoutPresets = [
  {
    id: "reading-hall",
    title: "Reading Hall",
    subtitle: "Straight desk lanes with clear aisle",
    cluster: "2" as const,
    sectionName: "Open Hall",
    sectionColor: "#6ee7b7",
  },
  {
    id: "cabin-zone",
    title: "Cabin Zone",
    subtitle: "Focused cabin-style blocks",
    cluster: "4" as const,
    sectionName: "Quiet Zone",
    sectionColor: "#c4b5fd",
  },
  {
    id: "window-wing",
    title: "Window Wing",
    subtitle: "Wall desks with side aisle",
    cluster: "6" as const,
    sectionName: "Girls Zone",
    sectionColor: "#f9a8d4",
  },
];

function RoomLayoutThumbnail({ presetId }: { presetId: string }) {
  if (presetId === "cabin-zone") {
    return (
      <svg viewBox="0 0 180 96" className="h-24 w-full text-slate-900/65" aria-hidden="true">
        <rect x="10" y="10" width="44" height="28" rx="9" fill="currentColor" opacity="0.16" />
        <rect x="64" y="10" width="44" height="28" rx="9" fill="currentColor" opacity="0.16" />
        <rect x="118" y="10" width="44" height="28" rx="9" fill="currentColor" opacity="0.16" />
        <rect x="10" y="56" width="44" height="28" rx="9" fill="currentColor" opacity="0.16" />
        <rect x="64" y="56" width="44" height="28" rx="9" fill="currentColor" opacity="0.16" />
        <rect x="118" y="56" width="44" height="28" rx="9" fill="currentColor" opacity="0.16" />
        <rect x="55" y="0" width="8" height="96" rx="4" fill="currentColor" opacity="0.1" />
        <rect x="109" y="0" width="8" height="96" rx="4" fill="currentColor" opacity="0.1" />
      </svg>
    );
  }

  if (presetId === "window-wing") {
    return (
      <svg viewBox="0 0 180 96" className="h-24 w-full text-slate-900/65" aria-hidden="true">
        <rect x="12" y="8" width="8" height="80" rx="4" fill="currentColor" opacity="0.12" />
        <rect x="30" y="14" width="38" height="18" rx="9" fill="currentColor" opacity="0.18" />
        <rect x="30" y="40" width="38" height="18" rx="9" fill="currentColor" opacity="0.18" />
        <rect x="30" y="66" width="38" height="18" rx="9" fill="currentColor" opacity="0.18" />
        <rect x="98" y="14" width="56" height="18" rx="9" fill="currentColor" opacity="0.18" />
        <rect x="98" y="40" width="56" height="18" rx="9" fill="currentColor" opacity="0.18" />
        <rect x="98" y="66" width="56" height="18" rx="9" fill="currentColor" opacity="0.18" />
        <rect x="78" y="0" width="10" height="96" rx="5" fill="currentColor" opacity="0.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 96" className="h-24 w-full text-slate-900/65" aria-hidden="true">
      <rect x="18" y="14" width="42" height="16" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="68" y="14" width="42" height="16" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="118" y="14" width="42" height="16" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="18" y="64" width="42" height="16" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="68" y="64" width="42" height="16" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="118" y="64" width="42" height="16" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="0" y="40" width="180" height="12" rx="6" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function makeSeatDragPreview(label: string) {
  const preview = document.createElement("div");
  preview.style.position = "absolute";
  preview.style.top = "-9999px";
  preview.style.left = "-9999px";
  preview.style.width = "108px";
  preview.style.height = "72px";
  preview.style.borderRadius = "16px";
  preview.style.border = "2px solid #d2723d";
  preview.style.background = "linear-gradient(180deg,#fffaf4 0%,#f7eadc 100%)";
  preview.style.color = "#1e293b";
  preview.style.display = "flex";
  preview.style.flexDirection = "column";
  preview.style.justifyContent = "center";
  preview.style.alignItems = "center";
  preview.style.boxShadow = "0 14px 28px rgba(15,23,42,0.16)";
  preview.innerHTML = `<div style="font: 800 14px system-ui">${label}</div><div style="font: 600 10px system-ui; letter-spacing: .18em; text-transform: uppercase; opacity: .7">Seat Move</div>`;
  document.body.appendChild(preview);
  return preview;
}

function SeatSilhouette({ shape }: { shape: string }) {
  if (shape === "Cabin") {
    return (
      <svg viewBox="0 0 120 64" className="h-6 w-full text-slate-900/55" aria-hidden="true">
        <rect x="22" y="16" width="76" height="34" rx="10" fill="currentColor" opacity="0.14" />
        <rect x="30" y="22" width="60" height="22" rx="7" fill="currentColor" opacity="0.22" />
        <rect x="20" y="14" width="4" height="38" rx="2" fill="currentColor" />
        <rect x="96" y="14" width="4" height="38" rx="2" fill="currentColor" />
        <rect x="24" y="12" width="72" height="4" rx="2" fill="currentColor" />
      </svg>
    );
  }

  if (shape === "Wall Desk") {
    return (
      <svg viewBox="0 0 120 64" className="h-6 w-full text-slate-900/55" aria-hidden="true">
        <rect x="12" y="10" width="7" height="44" rx="3" fill="currentColor" />
        <rect x="24" y="18" width="58" height="20" rx="8" fill="currentColor" opacity="0.18" />
        <rect x="36" y="42" width="10" height="10" rx="3" fill="currentColor" />
        <rect x="60" y="42" width="10" height="10" rx="3" fill="currentColor" />
        <rect x="86" y="16" width="16" height="28" rx="7" fill="currentColor" opacity="0.16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 64" className="h-6 w-full text-slate-900/55" aria-hidden="true">
      <rect x="28" y="18" width="64" height="20" rx="9" fill="currentColor" opacity="0.2" />
      <rect x="40" y="42" width="10" height="10" rx="3" fill="currentColor" />
      <rect x="70" y="42" width="10" height="10" rx="3" fill="currentColor" />
      <rect x="18" y="20" width="14" height="24" rx="7" fill="currentColor" opacity="0.14" />
      <rect x="88" y="20" width="14" height="24" rx="7" fill="currentColor" opacity="0.14" />
    </svg>
  );
}

function SeatPodIcon({ status, occupied }: { status: string; occupied: boolean }) {
  const tone =
    status === "AVAILABLE"
      ? "text-emerald-400"
      : status === "OCCUPIED"
        ? "text-rose-400"
        : status === "RESERVED"
          ? "text-amber-400"
          : "text-slate-400";

  return (
    <svg viewBox="0 0 72 72" className={`h-10 w-10 drop-shadow-[0_6px_12px_rgba(15,23,42,0.08)] ${tone}`} aria-hidden="true">
      <defs>
        <linearGradient id={`seat-shell-${status}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.38" />
        </linearGradient>
      </defs>
      <rect x="18" y="10" width="36" height="22" rx="10" fill={`url(#seat-shell-${status})`} />
      <rect x="22" y="15" width="28" height="12" rx="6" fill="currentColor" opacity="0.22" />
      <rect x="11" y="18" width="8" height="24" rx="4" fill="currentColor" opacity="0.18" />
      <rect x="53" y="18" width="8" height="24" rx="4" fill="currentColor" opacity="0.18" />
      <rect x="23" y="35" width="26" height="12" rx="6" fill="currentColor" opacity="0.26" />
      <rect x="21" y="46" width="7" height="11" rx="3.5" fill="currentColor" opacity="0.65" />
      <rect x="44" y="46" width="7" height="11" rx="3.5" fill="currentColor" opacity="0.65" />
      <rect x="15" y="58" width="42" height="4" rx="2" fill="currentColor" opacity="0.14" />
      {occupied ? (
        <>
          <circle cx="36" cy="22" r="4.5" fill="currentColor" opacity="0.92" />
          <path d="M31 29c1.2-2 2.9-3 5-3s3.8 1 5 3l1.8 3.4H29.2L31 29Z" fill="currentColor" opacity="0.9" />
        </>
      ) : null}
    </svg>
  );
}

function createMainFloor(columns: number, rows: number): FloorRow {
  return {
    id: "main-floor",
    name: "Main Floor",
    floor_number: 0,
    layout_columns: columns,
    layout_rows: rows,
  };
}

function suggestNextFloor(floors: FloorRow[]) {
  const maxFloorNumber = floors.reduce((max, floor) => Math.max(max, floor.floor_number), 0);
  const nextFloorNumber = maxFloorNumber + 1;
  return {
    floorNumber: nextFloorNumber,
    floorName: nextFloorNumber === 1 ? "First Floor" : `Floor ${nextFloorNumber}`,
  };
}

export function OwnerSeatsManager() {
  const searchParams = useSearchParams();
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [floors, setFloors] = useState<FloorRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState("Connecting");
  const [floorName, setFloorName] = useState("First Floor");
  const [floorNumber, setFloorNumber] = useState(1);
  const [layoutColumns, setLayoutColumns] = useState(8);
  const [layoutRows, setLayoutRows] = useState(6);
  const [seatPrefix, setSeatPrefix] = useState("A");
  const [sectionName, setSectionName] = useState("Reading Hall");
  const [manualSeatCode, setManualSeatCode] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [seatCount, setSeatCount] = useState(12);
  const [columnsPerRow, setColumnsPerRow] = useState(4);
  const [rowStart, setRowStart] = useState(1);
  const [colStart, setColStart] = useState(1);
  const [seatFilter, setSeatFilter] = useState<"ALL" | "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DUE" | "EXPIRING">("ALL");
  const [drawerSeatCode, setDrawerSeatCode] = useState("");
  const [drawerSectionName, setDrawerSectionName] = useState("");
  const [drawerReservedUntil, setDrawerReservedUntil] = useState("");
  const [dragSeatId, setDragSeatId] = useState<string | null>(null);
  const [hoverCellKey, setHoverCellKey] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState(false);
  const [floorDrafts, setFloorDrafts] = useState<FloorDrafts>({});
  const [recentlyMovedSeatId, setRecentlyMovedSeatId] = useState<string | null>(null);
  const [plannerTool, setPlannerTool] = useState<"move" | "aisle" | "paint">("move");
  const [paintSectionName, setPaintSectionName] = useState("Girls Zone");
  const [paintSectionColor, setPaintSectionColor] = useState("#f472b6");
  const [floorMetaDrafts, setFloorMetaDrafts] = useState<FloorMetaDrafts>({});
  const [activeAislePaint, setActiveAislePaint] = useState<{ floorId: string; mode: "add" | "remove" } | null>(null);
  const [ribbonTab, setRibbonTab] = useState<"floor" | "bank" | "single">("floor");
  const [plannerRibbonTab, setPlannerRibbonTab] = useState<"templates" | "layout" | "paint" | "students">("templates");
  const [workspaceMode, setWorkspaceMode] = useState<"setup" | "layout" | "assign">("assign");
  const [plannerToolbarOpen, setPlannerToolbarOpen] = useState(false);
  const [assignmentTrayOpen, setAssignmentTrayOpen] = useState(true);
  const [setupRibbonOpen, setSetupRibbonOpen] = useState(false);
  const [hallSettingsOpen, setHallSettingsOpen] = useState<string | null>(null);
  const [plannerLegendOpen, setPlannerLegendOpen] = useState(false);
  const [inspectorControlsOpen, setInspectorControlsOpen] = useState(false);
  const [floorSwitcherOpen, setFloorSwitcherOpen] = useState(false);
  const [seatFiltersOpen, setSeatFiltersOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const plannerBusyRef = useRef(false);
  const refreshTimerRef = useRef<number | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [seatResponse, studentResponse, floorResponse] = await Promise.all([
        apiFetch<{ success: boolean; data: SeatRow[] }>("/owner/seats"),
        apiFetch<{ success: boolean; data: StudentRow[] }>("/owner/students"),
        apiFetch<{ success: boolean; data: FloorRow[] }>("/owner/floors"),
      ]);
      setSeats(seatResponse.data);
      setStudents(studentResponse.data);
      setFloors(floorResponse.data);
      setError(null);
    } catch (loadError) {
      setSeats([]);
      setStudents([]);
      setFloors([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load live seat map.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const nextDrafts: FloorDrafts = {};
    const nextMetaDrafts: FloorMetaDrafts = {};
    for (const floor of floors) {
      nextDrafts[floor.id] = {
        name: floor.name,
        layoutRows: floor.layout_rows,
        layoutColumns: floor.layout_columns,
      };
      nextMetaDrafts[floor.id] = {
        aisleCells: floor.layout_meta?.aisleCells ?? [],
        sectionColors: floor.layout_meta?.sectionColors ?? {},
      };
    }
    setFloorDrafts(nextDrafts);
    setFloorMetaDrafts(nextMetaDrafts);
    if (!selectedFloorId && floors[0]) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  useEffect(() => {
    const suggestion = suggestNextFloor(floors);
    setFloorNumber((current) => {
      const duplicate = floors.some((floor) => floor.floor_number === current);
      return duplicate ? suggestion.floorNumber : current;
    });
    setFloorName((current) => {
      if (!current.trim() || current === "First Floor" || /^Floor \d+$/i.test(current)) {
        return suggestion.floorName;
      }
      return current;
    });
  }, [floors]);

  useEffect(() => {
    const workspace = searchParams.get("workspace");
    const ribbon = searchParams.get("ribbon");
    const planner = searchParams.get("planner");

    if (workspace === "setup" || workspace === "layout" || workspace === "assign") {
      setWorkspaceMode(workspace);
      if (workspace === "setup") {
        setSetupRibbonOpen(true);
      }
      if (workspace === "layout") {
        setPlannerToolbarOpen(true);
        setLayoutMode(true);
      }
    }

    if (ribbon === "floor" || ribbon === "bank" || ribbon === "single") {
      setRibbonTab(ribbon);
      setSetupRibbonOpen(true);
    }

    if (planner === "templates" || planner === "layout" || planner === "paint" || planner === "students") {
      setPlannerRibbonTab(planner);
      setPlannerToolbarOpen(true);
      if (planner === "layout") {
        setLayoutMode(true);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (workspaceMode === "layout") {
      setLayoutMode(true);
      return;
    }
    setLayoutMode(false);
  }, [workspaceMode]);

  useEffect(() => {
    plannerBusyRef.current = Boolean(dragSeatId || activeAislePaint || actionSheetOpen || layoutMode);
  }, [actionSheetOpen, activeAislePaint, dragSeatId, layoutMode]);

  useEffect(() => {
    if (!activeAislePaint) return;
    const finishAislePaint = () => {
      const draft = floorMetaDrafts[activeAislePaint.floorId];
      void saveFloorMeta(activeAislePaint.floorId, {
        aisleCells: draft?.aisleCells ?? [],
        sectionColors: draft?.sectionColors ?? {},
      });
      setActiveAislePaint(null);
    };

    window.addEventListener("mouseup", finishAislePaint);
    window.addEventListener("pointerup", finishAislePaint);
    window.addEventListener("pointercancel", finishAislePaint);
    window.addEventListener("touchend", finishAislePaint);

    return () => {
      window.removeEventListener("mouseup", finishAislePaint);
      window.removeEventListener("pointerup", finishAislePaint);
      window.removeEventListener("pointercancel", finishAislePaint);
      window.removeEventListener("touchend", finishAislePaint);
    };
  }, [activeAislePaint, floorMetaDrafts]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) {
      setLiveStatus("Offline");
      return;
    }

    const ready = () => setLiveStatus("Live");
    const disconnected = () => setLiveStatus("Disconnected");
    const onSeatUpdate = () => {
      setLiveStatus("Live");
      if (plannerBusyRef.current) {
        if (refreshTimerRef.current) {
          window.clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = window.setTimeout(() => {
          refreshTimerRef.current = null;
          void loadData();
        }, 900);
        return;
      }
      void loadData();
    };

    socket.on("connect", ready);
    socket.on("disconnect", disconnected);
    socket.on("realtime.ready", ready);
    socket.on("seat.updated", onSeatUpdate);
    socket.on("student.updated", onSeatUpdate);

    if (socket.connected) {
      setLiveStatus("Live");
    }

    return () => {
      socket.off("connect", ready);
      socket.off("disconnect", disconnected);
      socket.off("realtime.ready", ready);
      socket.off("seat.updated", onSeatUpdate);
      socket.off("student.updated", onSeatUpdate);
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  const selectedSeat = useMemo(() => seats.find((seat) => seat.id === selectedSeatId) ?? null, [seats, selectedSeatId]);

  useEffect(() => {
    if (!selectedSeat) {
      setActionSheetOpen(false);
      return;
    }
    setDrawerSeatCode(selectedSeat.seat_number);
    setDrawerSectionName(selectedSeat.section_name ?? "");
    setDrawerReservedUntil(selectedSeat.reserved_until ? selectedSeat.reserved_until.slice(0, 16) : "");
    setActionSheetOpen(true);
  }, [selectedSeat]);

  const unallottedStudents = useMemo(
    () => students.filter((student) => student.assignment_id && (student.admission_status ? student.admission_status === "SEAT_UNALLOTTED" : !student.seat_number)),
    [students],
  );
  const selectedAssignmentStudent = useMemo(
    () => students.find((student) => student.assignment_id === selectedAssignmentId) ?? null,
    [students, selectedAssignmentId],
  );
  const existingSeatNumbers = useMemo(() => seats.map((seat) => seat.seat_number), [seats]);

  const sectionOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];
    for (const seat of seats) {
      if (seat.section_name && !seen.has(seat.section_name)) {
        seen.add(seat.section_name);
        options.push(seat.section_name);
      }
    }
    return options;
  }, [seats]);
  const activeRibbonSectionColors = useMemo(
    () => (selectedFloorId ? floorMetaDrafts[selectedFloorId]?.sectionColors ?? {} : {}),
    [floorMetaDrafts, selectedFloorId],
  );

  const floorCards = useMemo(() => {
    const seatsByFloor = new Map<string, SeatRow[]>();
    const mainFloorSeats: SeatRow[] = [];

    for (const seat of seats) {
      if (seat.floor_id) {
        const current = seatsByFloor.get(seat.floor_id) ?? [];
        current.push(seat);
        seatsByFloor.set(seat.floor_id, current);
      } else {
        mainFloorSeats.push(seat);
      }
    }

    const built = floors.map((floor) => {
      const floorSeats = (seatsByFloor.get(floor.id) ?? []).sort((a, b) => a.pos_y - b.pos_y || a.pos_x - b.pos_x || a.seat_number.localeCompare(b.seat_number));
      const maxX = floorSeats.reduce((value, seat) => Math.max(value, seat.pos_x, seat.col_no), floor.layout_columns);
      const maxY = floorSeats.reduce((value, seat) => Math.max(value, seat.pos_y, seat.row_no), floor.layout_rows);
      return {
        floor,
        seats: floorSeats,
        columns: Math.max(floor.layout_columns, maxX, 1),
        rows: Math.max(floor.layout_rows, maxY, 1),
      };
    });

    if (mainFloorSeats.length > 0) {
      const maxX = mainFloorSeats.reduce((value, seat) => Math.max(value, seat.pos_x, seat.col_no), 0);
      const maxY = mainFloorSeats.reduce((value, seat) => Math.max(value, seat.pos_y, seat.row_no), 0);
      built.unshift({
        floor: createMainFloor(Math.max(maxX, 6), Math.max(maxY, 4)),
        seats: mainFloorSeats.sort((a, b) => a.pos_y - b.pos_y || a.pos_x - b.pos_x || a.seat_number.localeCompare(b.seat_number)),
        columns: Math.max(maxX, 6),
        rows: Math.max(maxY, 4),
      });
    }

    return built
      .map((item) => ({
        ...item,
        seats: item.seats.filter((seat) => {
          if (seatFilter === "ALL") return true;
          if (seatFilter === "DUE") return seat.payment_status === "DUE" || seat.payment_status === "PENDING";
          if (seatFilter === "EXPIRING") return isExpiringSoon(seat.ends_at);
          return seat.status === seatFilter;
        }),
      }))
      .filter((item) => item.seats.length > 0 || item.floor.id === selectedFloorId);
  }, [floors, seats, seatFilter, selectedFloorId]);

  const activeFloorCard = useMemo(() => {
    if (floorCards.length === 0) {
      return null;
    }

    if (selectedFloorId) {
      return floorCards.find((item) => item.floor.id === selectedFloorId) ?? floorCards[0];
    }

    return floorCards[0];
  }, [floorCards, selectedFloorId]);

  const visibleFloorCards = useMemo(() => (activeFloorCard ? [activeFloorCard] : []), [activeFloorCard]);

  const hallSettingsFloor = useMemo(() => {
    if (!hallSettingsOpen) return null;
    return floorCards.find((item) => item.floor.id === hallSettingsOpen) ?? null;
  }, [floorCards, hallSettingsOpen]);

  const hallSettingsDraft = hallSettingsFloor
    ? floorDrafts[hallSettingsFloor.floor.id] ?? {
        name: hallSettingsFloor.floor.name,
        layoutRows: hallSettingsFloor.floor.layout_rows,
        layoutColumns: hallSettingsFloor.floor.layout_columns,
      }
    : null;

  const selectedSeatFloor = useMemo(() => {
    if (!selectedSeat) return null;
    return floorCards.find((item) => item.floor.id === (selectedSeat.floor_id ?? "main-floor")) ?? activeFloorCard ?? null;
  }, [activeFloorCard, floorCards, selectedSeat]);

  const totals = useMemo(() => {
    return seats.reduce(
      (acc, seat) => {
        acc[seat.status] = (acc[seat.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [seats]);

  async function assignSeat(seatId: string) {
    if (!selectedAssignmentId) {
      setError("Select a student first, then choose a seat.");
      return;
    }

    setMessage(null);
    setError(null);
    try {
      await apiFetch("/owner/seats/assign", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: selectedAssignmentId,
          seatId,
        }),
      });
      setMessage("Seat assignment saved.");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Seat assignment failed.");
    }
  }

  async function createFloor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const result = await apiFetch<{ success: boolean; data: FloorRow }>("/owner/floors", {
        method: "POST",
        body: JSON.stringify({
          name: floorName,
          floorNumber,
          layoutColumns,
          layoutRows,
        }),
      });
      setSelectedFloorId(result.data.id);
      setMessage(`New floor created. "${result.data.name}" is now selected for seat-bank creation.`);
      await loadData();
    } catch (submitError) {
      const rawMessage = submitError instanceof Error ? submitError.message : "Floor create failed.";
      if (rawMessage.includes("Floor number already exists")) {
        const suggestion = suggestNextFloor(floors);
        setFloorNumber(suggestion.floorNumber);
        setFloorName(suggestion.floorName);
        setError(`That floor number is already in use. The next available option has been filled in: ${suggestion.floorName}.`);
        return;
      }
      setError(rawMessage);
    }
  }

  async function saveFloorLayout(floorId: string) {
    const draft = floorDrafts[floorId];
    if (!draft) return;

    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/owner/floors/${floorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          layoutColumns: draft.layoutColumns,
          layoutRows: draft.layoutRows,
        }),
      });
      setMessage("Floor layout updated.");
      await loadData();
      setHallSettingsOpen((current) => (current === floorId ? null : current));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Floor update failed.");
    }
  }

  async function saveFloorMeta(floorId: string, nextMeta: FloorRow["layout_meta"]) {
    const floor = floors.find((item) => item.id === floorId);
    if (!floor) return;

    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/owner/floors/${floorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: floor.name,
          layoutColumns: floor.layout_columns,
          layoutRows: floor.layout_rows,
          aisleCells: nextMeta?.aisleCells ?? [],
          sectionColors: nextMeta?.sectionColors ?? {},
        }),
      });
      setMessage("Floor painter changes saved.");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Floor metadata update failed.");
    }
  }

  function updateAisleDraft(floorId: string, cellKey: string, mode: "add" | "remove") {
    setFloorMetaDrafts((current) => {
      const existing = current[floorId] ?? { aisleCells: [], sectionColors: {} };
      const nextSet = new Set(existing.aisleCells);
      if (mode === "add") nextSet.add(cellKey);
      else nextSet.delete(cellKey);
      return {
        ...current,
        [floorId]: {
          aisleCells: Array.from(nextSet),
          sectionColors: existing.sectionColors,
        },
      };
    });
  }

  function deleteSectionColor(floorId: string, sectionName: string) {
    const draft = floorMetaDrafts[floorId] ?? { aisleCells: [], sectionColors: {} };
    const nextColors = { ...draft.sectionColors };
    delete nextColors[sectionName];
    setFloorMetaDrafts((current) => ({
      ...current,
      [floorId]: {
        aisleCells: draft.aisleCells,
        sectionColors: nextColors,
      },
    }));
    void saveFloorMeta(floorId, {
      aisleCells: draft.aisleCells,
      sectionColors: nextColors,
    });
  }

  async function createSeats(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedFloorId) {
      setError("Select a floor first or create a new floor before adding a seat bank.");
      return;
    }

    try {
      const result = await apiFetch<{ success: boolean; data: { createdCount: number } }>("/owner/seats", {
        method: "POST",
        body: JSON.stringify({
          floorId: selectedFloorId === "main-floor" ? undefined : selectedFloorId || undefined,
          sectionName,
          seatPrefix,
          startNumber,
          seatCount,
          rowStart,
          colStart,
          columnsPerRow,
        }),
      });
      setMessage(`${result.data.createdCount} seats added successfully.`);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Seat create failed.");
    }
  }

  async function createSingleSeat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!selectedFloorId) {
      setError("Select a floor before creating a single seat.");
      return;
    }

    if (!manualSeatCode.trim()) {
      setError("Enter a seat code like G-12 or A7.");
      return;
    }

    try {
      await apiFetch("/owner/seats", {
        method: "POST",
        body: JSON.stringify({
          floorId: selectedFloorId === "main-floor" ? undefined : selectedFloorId || undefined,
          sectionName,
          seatPrefix,
          customSeatCode: manualSeatCode.trim(),
          startNumber: 1,
          seatCount: 1,
          rowStart,
          colStart,
          columnsPerRow: 1,
        }),
      });
      setMessage(`Seat ${manualSeatCode} created successfully.`);
      setManualSeatCode("");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Seat create failed.");
    }
  }

  async function createSeatAtCell(floorId: string, posX: number, posY: number) {
    const nextSeatCode = buildNextSeatCode(existingSeatNumbers, seatPrefix);
    setMessage(null);
    setError(null);

    try {
      const result = await apiFetch<{ success: boolean; data: { createdCount: number; seatNumbers: string[] } }>("/owner/seats", {
        method: "POST",
        body: JSON.stringify({
          floorId: floorId === "main-floor" ? undefined : floorId,
          sectionName,
          seatPrefix,
          customSeatCode: nextSeatCode,
          startNumber: 1,
          seatCount: 1,
          rowStart: posY,
          colStart: posX,
          columnsPerRow: 1,
        }),
      });
      setManualSeatCode(result.data.seatNumbers[0] ?? nextSeatCode);
      setMessage(`New seat ${result.data.seatNumbers[0] ?? nextSeatCode} created at X${posX} Y${posY}.`);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Seat create failed.");
    }
  }

  async function updateSeatAction(status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED", markFree = false) {
    if (!selectedSeat) return;

    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/owner/seats/${selectedSeat.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          seatCode: drawerSeatCode,
          sectionName: drawerSectionName,
          status,
          reservedUntil: status === "RESERVED" ? drawerReservedUntil : "",
          posX: selectedSeat.pos_x,
          posY: selectedSeat.pos_y,
          markFree,
        }),
      });
      setMessage("Seat updated successfully.");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Seat update failed.");
    }
  }

  async function moveSeatToPosition(seatId: string, posX: number, posY: number) {
    const seat = seats.find((item) => item.id === seatId);
    if (!seat) return;

    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/owner/seats/${seat.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          posX,
          posY,
        }),
      });
      setRecentlyMovedSeatId(seat.id);
      setMessage(`Seat ${seat.seat_number} moved to X${posX} Y${posY}.`);
      setHoverCellKey(null);
      window.setTimeout(() => setRecentlyMovedSeatId((current) => (current === seat.id ? null : current)), 1800);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Seat move failed.");
    }
  }

  async function applyDeskPreset(floorId: string, preset: "2" | "4" | "6") {
    const floorSeats = seats
      .filter((seat) => (floorId === "main-floor" ? !seat.floor_id : seat.floor_id === floorId))
      .sort((a, b) => a.seat_number.localeCompare(b.seat_number));
    if (floorSeats.length === 0) return;

    const size = preset === "2" ? 2 : preset === "4" ? 4 : 6;
    const positions = floorSeats.map((seat, index) => {
      const cluster = Math.floor(index / size);
      const offset = index % size;
      const clusterWidth = size === 2 ? 2 : size === 4 ? 2 : 3;
      const clusterHeight = size === 2 ? 1 : 2;
      const baseX = (cluster % 3) * (clusterWidth + 2) + 1;
      const baseY = Math.floor(cluster / 3) * (clusterHeight + 2) + 1;
      const localX = size === 6 ? offset % 3 : offset % 2;
      const localY = size === 2 ? 0 : Math.floor(offset / clusterWidth);
      return {
        seat,
        posX: baseX + localX,
        posY: baseY + localY,
      };
    });

    setMessage(null);
    setError(null);
    try {
      await Promise.all(
        positions.map((item) =>
          apiFetch(`/owner/seats/${item.seat.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              posX: item.posX,
              posY: item.posY,
            }),
          }),
        ),
      );
      setMessage(`Applied ${size}-seat desk preset.`);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Desk preset apply failed.");
    }
  }

  async function applyRoomLayoutPreset(
    floorId: string,
    preset: { cluster: "2" | "4" | "6"; sectionName: string; sectionColor: string; id: string },
  ) {
    const floorSeats = seats
      .filter((seat) => (floorId === "main-floor" ? !seat.floor_id : seat.floor_id === floorId))
      .sort((a, b) => a.seat_number.localeCompare(b.seat_number));
    if (floorSeats.length === 0) {
      setError("Create seats on this floor first, then apply a room layout.");
      return;
    }

    const size = preset.cluster === "2" ? 2 : preset.cluster === "4" ? 4 : 6;
    const positions = floorSeats.map((seat, index) => {
      const cluster = Math.floor(index / size);
      const offset = index % size;
      const clusterWidth = size === 2 ? 2 : size === 4 ? 2 : 3;
      const clusterHeight = size === 2 ? 1 : 2;
      const gapX = preset.id === "window-wing" ? 3 : 2;
      const baseX = (cluster % 3) * (clusterWidth + gapX) + 1;
      const baseY = Math.floor(cluster / 3) * (clusterHeight + 2) + 1;
      const localX = size === 6 ? offset % 3 : offset % 2;
      const localY = size === 2 ? 0 : Math.floor(offset / clusterWidth);
      return {
        seat,
        posX: baseX + localX,
        posY: baseY + localY,
      };
    });

    const sectionColors = {
      ...(floorMetaDrafts[floorId]?.sectionColors ?? {}),
      [preset.sectionName]: preset.sectionColor,
    };

    setMessage(null);
    setError(null);
    try {
      await Promise.all(
        positions.map((item) =>
          apiFetch(`/owner/seats/${item.seat.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              sectionName: preset.sectionName,
              posX: item.posX,
              posY: item.posY,
            }),
          }),
        ),
      );
      if (floorId !== "main-floor") {
        await saveFloorMeta(floorId, {
          aisleCells: floorMetaDrafts[floorId]?.aisleCells ?? [],
          sectionColors,
        });
      } else {
        await loadData();
      }
      setPaintSectionName(preset.sectionName);
      setPaintSectionColor(preset.sectionColor);
      setMessage(`${preset.sectionName} layout applied successfully.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Room layout apply failed.");
    }
  }

  async function paintSeatSection(seat: SeatRow) {
    if (plannerTool !== "paint") return;
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/owner/seats/${seat.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          seatCode: seat.seat_number,
          sectionName: paintSectionName,
          posX: seat.pos_x,
          posY: seat.pos_y,
        }),
      });

      const floorId = seat.floor_id ?? "main-floor";
      const currentFloor = floorCards.find((item) => item.floor.id === floorId)?.floor;
      const nextMeta = {
        aisleCells: floorMetaDrafts[floorId]?.aisleCells ?? currentFloor?.layout_meta?.aisleCells ?? [],
        sectionColors: {
          ...(floorMetaDrafts[floorId]?.sectionColors ?? currentFloor?.layout_meta?.sectionColors ?? {}),
          [paintSectionName]: paintSectionColor,
        },
      };
      setFloorMetaDrafts((current) => ({
        ...current,
        [floorId]: {
          aisleCells: nextMeta.aisleCells ?? [],
          sectionColors: nextMeta.sectionColors ?? {},
        },
      }));
      if (seat.floor_id) {
        await saveFloorMeta(seat.floor_id, nextMeta);
      } else {
        await loadData();
      }
      setMessage(`Painted ${seat.seat_number} as ${paintSectionName}.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Section paint failed.");
    }
  }

  async function swapSeatPositions(sourceSeatId: string, targetSeatId: string) {
    const sourceSeat = seats.find((seat) => seat.id === sourceSeatId);
    const targetSeat = seats.find((seat) => seat.id === targetSeatId);
    if (!sourceSeat || !targetSeat || sourceSeat.id === targetSeat.id) {
      return;
    }

    setMessage(null);
    setError(null);
    try {
      await Promise.all([
        apiFetch(`/owner/seats/${sourceSeat.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            posX: targetSeat.pos_x,
            posY: targetSeat.pos_y,
          }),
        }),
        apiFetch(`/owner/seats/${targetSeat.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            posX: sourceSeat.pos_x,
            posY: sourceSeat.pos_y,
          }),
        }),
      ]);
      setRecentlyMovedSeatId(sourceSeat.id);
      setMessage(`Layout updated: ${sourceSeat.seat_number} swapped with ${targetSeat.seat_number}.`);
      setHoverCellKey(null);
      window.setTimeout(() => setRecentlyMovedSeatId((current) => (current === sourceSeat.id ? null : current)), 1800);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Seat layout update failed.");
    }
  }

  async function nudgeSelectedSeat(deltaX: number, deltaY: number) {
    if (!selectedSeat) return;
    await moveSeatToPosition(selectedSeat.id, Math.max(1, selectedSeat.pos_x + deltaX), Math.max(1, selectedSeat.pos_y + deltaY));
  }

  async function centerSelectedSeat() {
    if (!selectedSeat || !selectedSeatFloor) return;
    const nextX = Math.max(1, Math.ceil(selectedSeatFloor.floor.layout_columns / 2));
    const nextY = Math.max(1, Math.ceil(selectedSeatFloor.floor.layout_rows / 2));
    await moveSeatToPosition(selectedSeat.id, nextX, nextY);
  }

  function updateFloorDraft(floorId: string, partial: Partial<{ name: string; layoutRows: number; layoutColumns: number }>) {
    setFloorDrafts((current) => ({
      ...current,
      [floorId]: {
        name: partial.name ?? current[floorId]?.name ?? "",
        layoutRows: partial.layoutRows ?? current[floorId]?.layoutRows ?? 1,
        layoutColumns: partial.layoutColumns ?? current[floorId]?.layoutColumns ?? 1,
      },
    }));
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.25rem] border border-[var(--lp-border)] bg-[linear-gradient(135deg,#16b871_0%,#9cead4_100%)] p-4 text-white shadow-[0_18px_34px_rgba(22,184,113,0.16)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/75">Seat inventory live</p>
            <h3 className="mt-1 text-xl font-black tracking-tight">Keep seat inventory calm, then place unallotted students only when you are ready</h3>
            <p className="mt-1 text-sm leading-6 text-white/85">
              This page now defaults to assignment mode first. Open setup or layout tools only when the hall itself needs changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-[0.95rem] bg-white/12 px-4 py-2.5 text-sm font-black">
              {totals.AVAILABLE ?? 0} free
            </div>
            <div className="rounded-[0.95rem] bg-white px-4 py-2.5 text-sm font-black text-[#139b62]">
              {totals.OCCUPIED ?? 0} occupied
            </div>
          </div>
        </div>
      </section>
      <DashboardCard title="Workspace mode" subtitle="Assignment stays primary. Setup and layout open only when the hall needs structural changes.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {([
              ["setup", "Setup"],
              ["layout", "Layout"],
              ["assign", "Assign"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setWorkspaceMode(value)}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                  workspaceMode === value
                    ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)] shadow-[0_10px_18px_rgba(210,114,61,0.12)]"
                    : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-[var(--lp-border)] bg-slate-50 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]">
              Active: {workspaceMode}
            </div>
            <InlineHelp
              title="Workspace mode"
              points={[
                "Assign is the daily mode for placing unallotted students.",
                "Setup is only for floors and new seats.",
                "Layout is only for moving desks, aisles, and section colors.",
              ]}
            />
          </div>
        </div>
      </DashboardCard>
      <div className="sticky top-[88px] z-10">
      <DashboardCard
        title={workspaceMode === "setup" ? "Setup ribbon" : workspaceMode === "layout" ? "Layout ribbon" : "Assignment ribbon"}
        subtitle={
          workspaceMode === "setup"
            ? "Create floors, seat banks, and single seats from one compact ribbon."
            : workspaceMode === "layout"
              ? "Switch between templates, layout tools, and section painting here."
              : "Keep unallotted-student assignment focused and close to the planner, while hall-edit tools stay hidden."
        }
      >
        <div className="grid gap-4">
          {error ? (
            <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          ) : null}

          {workspaceMode === "setup" ? (
            <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-[var(--lp-border)] bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-black text-[var(--lp-text)]">Create only what you need</p>
              <p className="mt-1 text-sm text-slate-500">Open one form at a time to keep the planner clean.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-2">
                {[
                  ["floor", "Floor"],
                  ["bank", "Bank"],
                  ["single", "Single"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRibbonTab(value as typeof ribbonTab);
                      setSetupRibbonOpen(true);
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${
                      ribbonTab === value
                        ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)] shadow-[0_10px_18px_rgba(210,114,61,0.12)]"
                        : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSetupRibbonOpen((current) => !current)}
                className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
              >
                {setupRibbonOpen ? "Hide form" : "Open form"}
              </button>
            </div>
          </div>

          {setupRibbonOpen && ribbonTab === "floor" ? (
            <form id="seat-create-floor" onSubmit={createFloor} className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
              <div className="lg:col-span-5 rounded-[1rem] border border-dashed border-[var(--lp-border)] bg-[#fff9f2] px-3 py-2 text-sm text-[var(--lp-muted)]">
                The next floor number is suggested automatically from existing floors. If it is a duplicate, the next available floor is suggested.
              </div>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Floor Name
                <input value={floorName} onChange={(event) => setFloorName(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Floor name" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Floor No.
                <input value={floorNumber} onChange={(event) => setFloorNumber(Number(event.target.value) || 0)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Floor number" type="number" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Rows
                <input value={layoutRows} onChange={(event) => setLayoutRows(Number(event.target.value) || 1)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Rows" type="number" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Columns
                <input value={layoutColumns} onChange={(event) => setLayoutColumns(Number(event.target.value) || 1)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Columns" type="number" />
              </label>
              <button type="submit" className="rounded-[1rem] bg-[var(--lp-accent-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--lp-accent)]">Create floor</button>
            </form>
          ) : null}

          {setupRibbonOpen && ribbonTab === "bank" ? (
            <form id="seat-create-bank" onSubmit={createSeats} className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
              <div className="lg:col-span-9 rounded-[1rem] border border-dashed border-[var(--lp-border)] bg-[#fff9f2] px-3 py-2 text-sm text-[var(--lp-muted)]">
                Pick a floor and create a bulk seat bank with prefix, count, row start, column start, and columns per row.
              </div>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Floor
                <select value={selectedFloorId} onChange={(event) => setSelectedFloorId(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none">
                  <option value="">Choose floor</option>
                  {floorCards.map((item) => (
                    <option key={item.floor.id} value={item.floor.id}>
                      {item.floor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Section
                <input value={sectionName} onChange={(event) => setSectionName(event.target.value)} list="seat-sections-ribbon" className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Room / section name" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Prefix
                <input value={seatPrefix} onChange={(event) => setSeatPrefix(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Seat prefix" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Start
                <input value={startNumber} onChange={(event) => setStartNumber(Number(event.target.value) || 1)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Start number" type="number" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Count
                <input value={seatCount} onChange={(event) => setSeatCount(Number(event.target.value) || 1)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Seat count" type="number" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Row
                <input value={rowStart} onChange={(event) => setRowStart(Number(event.target.value) || 1)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Row start" type="number" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Column
                <input value={colStart} onChange={(event) => setColStart(Number(event.target.value) || 1)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Column start" type="number" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Per Row
                <input value={columnsPerRow} onChange={(event) => setColumnsPerRow(Number(event.target.value) || 1)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Columns per row" type="number" />
              </label>
              <button type="submit" disabled={!selectedFloorId} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#eff7f0] px-5 py-2.5 text-sm font-semibold text-[var(--lp-primary)] disabled:cursor-not-allowed disabled:opacity-50">Create seat bank</button>
              <datalist id="seat-sections-ribbon">
                {sectionOptions.map((section) => (
                  <option key={section} value={section} />
                ))}
              </datalist>
            </form>
          ) : null}

          {setupRibbonOpen && ribbonTab === "single" ? (
            <form id="seat-create-single" onSubmit={createSingleSeat} className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <div className="lg:col-span-4 rounded-[1rem] border border-dashed border-[var(--lp-border)] bg-[#fff9f2] px-3 py-2 text-sm text-[var(--lp-muted)]">
                Create one exact custom seat here with its code and target floor.
              </div>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Seat Code
                <input value={manualSeatCode} onChange={(event) => setManualSeatCode(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Exact seat code e.g. G-12" />
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Floor
                <select value={selectedFloorId} onChange={(event) => setSelectedFloorId(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none">
                  <option value="">Choose floor</option>
                  {floorCards.map((item) => (
                    <option key={item.floor.id} value={item.floor.id}>
                      {item.floor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                Section
                <input value={sectionName} onChange={(event) => setSectionName(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm font-medium text-[var(--lp-text)] outline-none" placeholder="Room / section name" />
              </label>
              <button type="submit" disabled={!selectedFloorId} className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--lp-primary)] disabled:cursor-not-allowed disabled:opacity-50">Create one seat</button>
            </form>
          ) : null}
          {!setupRibbonOpen ? (
            <div className="rounded-[1.25rem] border border-dashed border-[var(--lp-border)] bg-white px-4 py-5 text-sm text-[var(--lp-muted)]">
                The setup form is hidden. Open the matching tab only when you need a new floor, seat bank, or single seat.
            </div>
          ) : null}
            </>
          ) : null}

          {workspaceMode !== "setup" ? (
          <div className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-[rgba(255,255,255,0.92)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-accent)]">Tool palette</p>
                <p className="mt-1 text-sm text-[var(--lp-muted)]">Keep the canvas primary and open secondary tools only when needed.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    ["templates", "Templates"],
                    ["layout", "Layout"],
                    ["paint", "Paint"],
                    ["students", "Unallotted"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setPlannerRibbonTab(value as typeof plannerRibbonTab);
                        setPlannerToolbarOpen(true);
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${
                        plannerRibbonTab === value
                          ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)] shadow-[0_10px_18px_rgba(210,114,61,0.12)]"
                          : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPlannerToolbarOpen((current) => !current)}
                  className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
                >
                  {plannerToolbarOpen ? "Hide panel" : "Open panel"}
                </button>
              </div>
            </div>

            {plannerToolbarOpen && plannerRibbonTab === "templates" ? (
              <div className="grid gap-3 xl:grid-cols-[auto_1fr]">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "2")} className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">2 Seat Desk</button>
                  <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "4")} className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">4 Seat Table</button>
                  <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "6")} className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">6 Seat Table</button>
                </div>
                <div className="grid gap-3 xl:grid-cols-3">
                  {roomLayoutPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectedFloorId && void applyRoomLayoutPreset(selectedFloorId, preset)}
                      disabled={!selectedFloorId}
                      className="rounded-[1rem] border border-[var(--lp-border)] bg-white p-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[var(--lp-text)]">{preset.title}</p>
                          <p className="mt-1 text-xs text-[var(--lp-muted)]">{preset.subtitle}</p>
                        </div>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--lp-accent-soft)] text-sm font-black text-[var(--lp-accent)]">+</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {plannerToolbarOpen && plannerRibbonTab === "layout" ? (
              <div className="grid gap-3 xl:grid-cols-[auto_auto_1fr]">
                <button type="button" onClick={() => setLayoutMode((current) => !current)} className={`rounded-[1rem] px-4 py-2.5 text-sm font-black ${layoutMode ? "bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}>
                  {layoutMode ? "Planner Active" : "Enable Planner"}
                </button>
                <div className="rounded-[1rem] bg-[#f5faf6] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-muted)]">Socket</p>
                  <p className="mt-1 text-sm font-black text-[var(--lp-text)]">{liveStatus}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[["move", "Move"], ["aisle", "Aisle"], ["paint", "Paint"]].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setPlannerTool(value as typeof plannerTool)} className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${plannerTool === value ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}>{label}</button>
                  ))}
                </div>
              </div>
            ) : null}

            {plannerToolbarOpen && plannerRibbonTab === "paint" ? (
              <div className="grid gap-3 xl:grid-cols-[1fr_auto_1fr]">
                <input value={paintSectionName} onChange={(event) => setPaintSectionName(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-3 py-3 text-sm outline-none" placeholder="Section name" />
                <input type="color" value={paintSectionColor} onChange={(event) => setPaintSectionColor(event.target.value)} className="h-12 w-20 rounded-[1rem] border border-[var(--lp-border)] bg-white p-1" />
                <div className="flex flex-wrap gap-2">
                  {Object.entries(activeRibbonSectionColors).length ? Object.entries(activeRibbonSectionColors).map(([section, color]) => (
                    <button key={section} type="button" onClick={() => { setPaintSectionName(section); setPaintSectionColor(color); setPlannerTool("paint"); }} className="rounded-full px-3 py-2 text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
                      {section}
                    </button>
                  )) : <p className="text-sm text-[var(--lp-muted)]">Saved section colors appear here.</p>}
                </div>
              </div>
            ) : null}

            {plannerToolbarOpen && plannerRibbonTab === "students" ? (
              <div className="grid gap-3">
                <select value={selectedAssignmentId} onChange={(event) => setSelectedAssignmentId(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm outline-none">
                  <option value="">Select unallotted student</option>
                  {unallottedStudents.map((student) => (
                    <option key={student.assignment_id} value={student.assignment_id}>
                      {student.student_name} | {student.plan_name} | {student.payment_status}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {unallottedStudents.map((student) => (
                    <div
                      key={student.assignment_id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/assignment-id", student.assignment_id);
                        setSelectedAssignmentId(student.assignment_id);
                        const preview = makeSeatDragPreview(student.student_name);
                        event.dataTransfer.setDragImage(preview, 54, 36);
                        window.setTimeout(() => preview.remove(), 0);
                      }}
                        className={`min-w-[240px] cursor-grab rounded-[1rem] border px-4 py-3 active:cursor-grabbing ${selectedAssignmentId === student.assignment_id ? "border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)]" : "border-slate-200 bg-white"}`}
                    >
                      <p className="font-black text-slate-950">{student.student_name}</p>
                      <p className="text-sm text-slate-500">{student.plan_name} | {student.payment_status}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          ) : null}
        </div>
      </DashboardCard>
      </div>

      <section className={`grid gap-4 ${workspaceMode === "assign" ? "xl:grid-cols-[1.5fr_0.85fr]" : "xl:grid-cols-[1.6fr_0.8fr]"}`}>
        <DashboardCard
          title={workspaceMode === "setup" ? "Planner preview" : workspaceMode === "layout" ? "Planner studio" : "Assignment canvas"}
          subtitle={
            workspaceMode === "setup"
              ? "The room preview becomes active as soon as the setup is ready."
              : workspaceMode === "layout"
                ? "Move seats, paint sections, and apply layouts from one compact canvas."
                : "Focused canvas for unallotted-student placement."
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1rem] bg-[#f5faf6] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-muted)]">Socket</p>
                <p className="mt-1 text-lg font-black text-[var(--lp-text)]">{liveStatus}</p>
              </div>
              <div className="rounded-[1rem] bg-[#f5faf6] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-muted)]">Active mode</p>
                <p className="mt-1 text-lg font-black text-[var(--lp-text)]">
                  {workspaceMode === "setup" ? "Setup" : workspaceMode === "layout" ? "Layout" : "Assign"}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <InlineHelp
                title={workspaceMode === "setup" ? "Setup help" : workspaceMode === "layout" ? "Layout help" : "Assign help"}
                points={
                  workspaceMode === "setup"
                    ? ["Create the floor first.", "Add a seat bank or single seats next.", "Switch to layout when the room structure is ready."]
                    : workspaceMode === "layout"
                      ? ["Select a seat to move or inspect it.", "Use aisle and paint tools only where needed.", "Apply presets after the base layout feels right."]
                      : ["Pick a student from the tray.", "Drop onto a seat or use the assign action.", "Update seat state from the inspector when needed."]
                }
              />
            </div>

            {workspaceMode === "layout" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  ["move", "Move"],
                  ["aisle", "Aisle"],
                  ["paint", "Paint"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlannerTool(value as typeof plannerTool)}
                    className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${plannerTool === value ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "2")} className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">2 Seat Desk</button>
                <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "4")} className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">4 Seat Table</button>
                <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "6")} className="rounded-full border border-[var(--lp-border)] bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">6 Seat Table</button>
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {roomLayoutPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectedFloorId && void applyRoomLayoutPreset(selectedFloorId, preset)}
                    disabled={!selectedFloorId}
                    className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 text-left shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:border-[var(--lp-primary)] hover:shadow-[0_16px_28px_rgba(210,114,61,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--lp-text)]">{preset.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--lp-muted)]">{preset.subtitle}</p>
                      </div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lp-primary)] text-lg font-black text-white">
                        +
                      </span>
                    </div>
                    <div className="mt-3 rounded-[1rem] bg-[#f7f4ee] p-3">
                      <RoomLayoutThumbnail presetId={preset.id} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]" style={{ backgroundColor: `${preset.sectionColor}33`, color: preset.sectionColor }}>
                        {preset.sectionName}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--lp-primary)]">Apply layout</span>
                    </div>
                  </button>
                ))}
              </div>
              {plannerTool === "paint" ? (
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input value={paintSectionName} onChange={(event) => setPaintSectionName(event.target.value)} className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-3 py-3 text-sm outline-none" placeholder="Section name" />
                  <input type="color" value={paintSectionColor} onChange={(event) => setPaintSectionColor(event.target.value)} className="h-12 w-16 rounded-[1rem] border border-[var(--lp-border)] bg-white p-1" />
                </div>
              ) : null}
            </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {["AVAILABLE", "OCCUPIED", "RESERVED", "DISABLED"].map((status) => (
                <div key={status} className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-muted)]">{status}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{totals[status] ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Action flow" subtitle="Compact assignment support without turning the seat desk into a bulky roster page.">
          <div className="grid gap-3">
            <div className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm text-[var(--lp-text-soft)]">
              {workspaceMode === "assign"
                ? "Use the planner for placement and keep the queue limited to unallotted students only."
                : "Seat controls no longer sit in a bulky side inspector. Tap any seat to open its action sheet."}
            </div>
            <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[var(--lp-text)]">Unallotted queue</p>
                  <p className="mt-1 text-xs text-[var(--lp-text-soft)]">Keep visible here so owners can pick a student quickly and move straight into seat placement.</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">
                  {unallottedStudents.length} ready
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {unallottedStudents.slice(0, 5).map((student) => (
                  <button
                    key={student.assignment_id}
                    type="button"
                    onClick={() => {
                      setWorkspaceMode("assign");
                      setSelectedAssignmentId(student.assignment_id);
                    }}
                    className={`grid gap-1 rounded-[0.75rem] border px-3 py-2 text-left ${
                      selectedAssignmentId === student.assignment_id ? "border-[var(--lp-accent)] bg-[var(--lp-accent-soft)]/35" : "border-[var(--lp-border)] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-[var(--lp-text)]">{student.student_name}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${student.payment_status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {student.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--lp-text-soft)]">{student.plan_name} • Ends {formatSeatDateTime(student.ends_at)}</p>
                  </button>
                ))}
                {unallottedStudents.length === 0 ? <p className="text-sm text-[var(--lp-text-soft)]">No unallotted students right now. Use Admissions for new students or Students for seat changes.</p> : null}
              </div>
            </div>
          </div>
        </DashboardCard>
      </section>

      <div className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[var(--lp-text)]">Seat filters</p>
            <p className="mt-1 text-sm text-slate-500">Keep filters closed unless you need a narrower view.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#fff4eb] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--lp-primary)]">
              {seatFilter}
            </span>
            <button
              type="button"
              onClick={() => setSeatFiltersOpen((current) => !current)}
              className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
            >
              {seatFiltersOpen ? "Hide filters" : "Show filters"}
            </button>
          </div>
        </div>
        {seatFiltersOpen ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              ["ALL", "All seats"],
              ["AVAILABLE", "Free"],
              ["OCCUPIED", "Occupied"],
              ["RESERVED", "Reserved"],
              ["DUE", "Due students"],
              ["EXPIRING", "Expiring soon"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeatFilter(value as typeof seatFilter)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                  seatFilter === value ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section id="seat-planner" className={`grid gap-6 ${workspaceMode === "assign" ? "xl:grid-cols-[1.22fr_0.78fr]" : ""}`}>
        <div className="grid gap-6">
          {floorCards.length > 1 ? (
            <div className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-accent)]">Floor switcher</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-black text-slate-950">{activeFloorCard?.floor.name ?? "No floor selected"}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {activeFloorCard ? `${activeFloorCard.seats.length} seats` : "0 seats"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {activeFloorCard ? `${activeFloorCard.columns} x ${activeFloorCard.rows}` : "--"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFloorSwitcherOpen((current) => !current)}
                  className="rounded-full border border-[var(--lp-border)] bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
                >
                  {floorSwitcherOpen ? "Hide floors" : "Switch floor"}
                </button>
              </div>
              {floorSwitcherOpen ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--lp-border)] pt-3">
                  {floorCards.map((item) => {
                    const active = activeFloorCard?.floor.id === item.floor.id;
                    return (
                      <button
                        key={item.floor.id}
                        type="button"
                        onClick={() => setSelectedFloorId(item.floor.id)}
                        className={`rounded-full border px-3 py-2 text-left transition ${
                          active
                            ? "border-[var(--lp-primary)] bg-[#fff1e6] text-[var(--lp-primary)]"
                            : "border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                        }`}
                      >
                        <span className="text-sm font-black">{item.floor.name}</span>
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                          {item.seats.length} seats
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {visibleFloorCards.map((item) => {
            const isHallSettingsOpen = hallSettingsOpen === item.floor.id;
            const zones = Array.from(new Set(item.seats.map((seat) => inferZone(seat))));
            const aisleCells = new Set(floorMetaDrafts[item.floor.id]?.aisleCells ?? item.floor.layout_meta?.aisleCells ?? []);
            const sectionColors = floorMetaDrafts[item.floor.id]?.sectionColors ?? item.floor.layout_meta?.sectionColors ?? {};
            const seatByCell = new Map(item.seats.map((seat) => [`${seat.pos_x}-${seat.pos_y}`, seat]));
            const cells = Array.from({ length: item.rows * item.columns }, (_, index) => {
              const y = Math.floor(index / item.columns) + 1;
              const x = (index % item.columns) + 1;
              return { x, y, key: `${x}-${y}`, seat: seatByCell.get(`${x}-${y}`) };
            });

            return (
              <DashboardCard key={item.floor.id} title="Active floor workspace" subtitle="Only one floor stays open, so the planner feels lighter and easier to edit.">
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-[var(--lp-border)] bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[var(--lp-text)]">{item.floor.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1">{item.columns} cols</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{item.rows} rows</span>
                        <span className="rounded-full bg-white px-2.5 py-1">{item.seats.length} seats</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.floor.id !== "main-floor" ? (
                        <button
                          type="button"
                          onClick={() => setHallSettingsOpen((current) => (current === item.floor.id ? null : item.floor.id))}
                          className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
                        >
                          {isHallSettingsOpen ? "Hide hall" : "Hall settings"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPlannerLegendOpen((current) => !current)}
                        className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-primary)]"
                      >
                        {plannerLegendOpen ? "Hide legend" : "Show legend"}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-full w-max rounded-[1.75rem] border border-[var(--lp-border)] bg-[radial-gradient(circle_at_top,#ffffff_0%,#fcf7ef_100%)] p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-muted)]">Floor Planner</p>
                          <p className="text-sm text-slate-500">{item.columns} columns • {item.rows} rows • drag seats to shape the room</p>
                          </div>
                          <InlineHelp
                            title="Planner help"
                            points={[
                              "Click a seat to edit it from the inspector.",
                              "Use layout mode for moving, aisles, and section colors.",
                              "Create missing seats from empty cells only when needed.",
                            ]}
                          />
                        </div>
                        <button type="button" onClick={() => setSelectedFloorId(item.floor.id)} className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${selectedFloorId === item.floor.id ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}>
                          {selectedFloorId === item.floor.id ? "Editing this floor" : "Use this floor"}
                        </button>
                      </div>

                      {plannerLegendOpen ? (
                        <>
                          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                            <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-700">Free desk</span>
                            <span className="rounded-full bg-rose-100 px-3 py-2 text-rose-700">Occupied desk</span>
                            <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-700">Reserved desk</span>
                            <span className="rounded-full bg-slate-200 px-3 py-2 text-slate-600">Aisle / empty tile</span>
                            {message ? <span className="rounded-full bg-[#fff4eb] px-3 py-2 text-[var(--lp-primary)]">Saved: {message}</span> : null}
                          </div>

                          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                            {zones.map((zone) => (
                              <span key={zone} className={`rounded-full px-3 py-2 ${getZoneTone(zone)}`}>
                                {zone}
                              </span>
                            ))}
                          </div>

                          {Object.keys(sectionColors).length > 0 ? (
                            <div className="mb-4 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-muted)]">Section Legend</p>
                                <span className="text-[11px] text-slate-500">Tap a chip to load its color</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(sectionColors).map(([section, color]) => (
                                  <div key={section} className="flex items-center gap-2 rounded-full border border-[var(--lp-border)] bg-[#fffaf4] px-2 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaintSectionName(section);
                                        setPaintSectionColor(color);
                                        setPlannerTool("paint");
                                      }}
                                      className="rounded-full px-3 py-1 text-[11px] font-bold text-white"
                                      style={{ backgroundColor: color }}
                                    >
                                      {section}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteSectionColor(item.floor.id, section)}
                                      className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      <div
                        className="grid gap-2 overflow-visible rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,242,231,0.92))] p-3"
                        style={{ gridTemplateColumns: `repeat(${item.columns}, minmax(${getPlannerColumnWidth(item.columns)}px, 1fr))` }}
                      >
                        {cells.map((cell) => {
                          const seat = cell.seat;
                          const isAisleCell = aisleCells.has(cell.key);
                          return (
                            <div
                              key={cell.key}
                              onMouseDown={() => {
                                if (plannerTool === "aisle" && !seat && item.floor.id !== "main-floor") {
                                  const mode = isAisleCell ? "remove" : "add";
                                  updateAisleDraft(item.floor.id, cell.key, mode);
                                  setActiveAislePaint({ floorId: item.floor.id, mode });
                                }
                              }}
                              onClick={() => {
                                if (plannerTool !== "aisle" && layoutMode && selectedSeat && !seat) {
                                  void moveSeatToPosition(selectedSeat.id, cell.x, cell.y);
                                  return;
                                }

                                if (plannerTool !== "aisle" && !selectedSeat && !seat && !isAisleCell && workspaceMode !== "assign") {
                                  void createSeatAtCell(item.floor.id, cell.x, cell.y);
                                }
                              }}
                              onPointerDown={(event) => {
                                if (plannerTool === "aisle" && !seat && item.floor.id !== "main-floor") {
                                  event.preventDefault();
                                  const mode = isAisleCell ? "remove" : "add";
                                  updateAisleDraft(item.floor.id, cell.key, mode);
                                  setActiveAislePaint({ floorId: item.floor.id, mode });
                                }
                              }}
                              onPointerMove={(event) => {
                                if (!activeAislePaint || activeAislePaint.floorId !== item.floor.id || seat) return;
                                if (event.pointerType !== "touch" && event.buttons !== 1) return;
                                updateAisleDraft(item.floor.id, cell.key, activeAislePaint.mode);
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setHoverCellKey(cell.key);
                              }}
                              onDragLeave={() => {
                                if (hoverCellKey === cell.key) {
                                  setHoverCellKey(null);
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                const assignmentId = event.dataTransfer.getData("text/assignment-id");
                                const sourceSeatId = event.dataTransfer.getData("text/seat-id");

                                if (assignmentId && workspaceMode === "assign" && seat) {
                                  if (seat.status !== "AVAILABLE") {
                                    setError("Choose a free seat to place the selected student.");
                                    return;
                                  }
                                  setSelectedAssignmentId(assignmentId);
                                  setSelectedSeatId(seat.id);
                                  void assignSeat(seat.id);
                                  return;
                                }

                                if (assignmentId && workspaceMode === "assign" && !seat && !isAisleCell) {
                                  setSelectedAssignmentId(assignmentId);
                                  setError("This tile does not have a real seat yet. Add the seat first in setup or layout mode.");
                                  return;
                                }

                                if (sourceSeatId && layoutMode && seat) {
                                  setSelectedSeatId(seat.id);
                                  void swapSeatPositions(sourceSeatId, seat.id);
                                  return;
                                }

                                if (sourceSeatId && layoutMode && !seat) {
                                  void moveSeatToPosition(sourceSeatId, cell.x, cell.y);
                                }
                              }}
                              className={`relative min-h-[5rem] rounded-[0.85rem] border border-dashed p-1 transition ${!seat ? "border-[var(--lp-border)] bg-white/60" : "border-transparent bg-transparent p-0"} ${!seat && !isAisleCell && workspaceMode !== "assign" ? "cursor-pointer hover:border-[var(--lp-primary)] hover:bg-[#fff7ef]" : ""} ${hoverCellKey === cell.key ? "z-20 scale-[1.02] border-[var(--lp-primary)] bg-[#fff1e6]" : "z-0"} ${isAisleCell ? "border-slate-400 bg-[repeating-linear-gradient(45deg,#ece5da,#ece5da_10px,#f8f2ea_10px,#f8f2ea_20px)]" : ""}`}
                            >
                              {seat ? (
                                <button
                                  draggable={layoutMode}
                                  onClick={() => {
                                    if (plannerTool === "paint") {
                                      void paintSeatSection(seat);
                                      return;
                                    }
                                    setSelectedSeatId(seat.id);
                                    setSelectedFloorId(item.floor.id);
                                  }}
                                  onDragStart={(event) => {
                                    if (!layoutMode) {
                                      event.preventDefault();
                                      return;
                                    }
                                    event.dataTransfer.setData("text/seat-id", seat.id);
                                    setDragSeatId(seat.id);
                                    const preview = makeSeatDragPreview(seat.seat_number);
                                    event.dataTransfer.setDragImage(preview, 54, 36);
                                    window.setTimeout(() => preview.remove(), 0);
                                  }}
                                  onDragEnd={() => setDragSeatId(null)}
                                  className={`group relative flex h-full w-full min-w-0 flex-col items-center overflow-hidden rounded-[0.8rem] border px-2 py-2 text-left transition hover:z-40 hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,23,42,0.10)] ${seatToneClasses[seat.status] ?? seatToneClasses.AVAILABLE} ${selectedSeatId === seat.id ? "z-50 ring-2 ring-[var(--lp-primary)]" : "z-10"} ${dragSeatId === seat.id ? "opacity-70" : ""} ${recentlyMovedSeatId === seat.id ? "animate-pulse ring-2 ring-emerald-400" : ""}`}
                                  style={sectionColors[seat.section_name ?? ""] ? { boxShadow: `0 0 0 2px ${sectionColors[seat.section_name ?? ""]} inset` } : undefined}
                                >
                                  <div className="flex w-full min-w-0 items-center justify-between gap-1">
                                    <span className="min-w-0 truncate text-[10px] font-black leading-none text-slate-700">{seat.seat_number}</span>
                                    <SeatStatusGlyph status={seat.status} />
                                  </div>
                                  <div className="mt-1 flex min-h-[2.75rem] w-full items-center justify-center rounded-[0.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82))] px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                                    <SeatPodIcon status={seat.status} occupied={Boolean(seat.student_name)} />
                                  </div>
                                  <div className="mt-1 flex w-full min-w-0 items-center justify-between gap-1">
                                    <span className={`max-w-[2.45rem] truncate rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                                      seat.status === "AVAILABLE"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : seat.status === "OCCUPIED"
                                          ? "bg-rose-100 text-rose-700"
                                          : seat.status === "RESERVED"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-200 text-slate-600"
                                    }`}>
                                      {seat.status === "AVAILABLE" ? "Free" : seat.status === "OCCUPIED" ? "Live" : seat.status === "RESERVED" ? "Hold" : "Off"}
                                    </span>
                                    {seat.student_name ? (
                                      <p className="max-w-[2rem] truncate rounded-full bg-[var(--lp-accent-soft)] px-1.5 py-0.5 text-[8px] font-black text-[var(--lp-accent)] shadow-[0_6px_12px_rgba(210,114,61,0.10)]">{formatStudentInitials(seat.student_name)}</p>
                                    ) : <p className="rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-bold text-slate-400 shadow-[0_4px_8px_rgba(15,23,42,0.06)]">Tap</p>}
                                  </div>
                                </button>
                              ) : (
                                <div className={`flex h-full flex-col items-center justify-center rounded-[0.8rem] p-1.5 text-[9px] text-slate-400 ${layoutMode ? "animate-pulse" : ""} ${isAisleCell ? "bg-transparent" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,231,0.92))]"}`}>
                                  <span className="text-[8px] font-semibold uppercase tracking-[0.12em]">{isAisleCell ? "Aisle" : "Empty"}</span>
                                  {!isAisleCell && workspaceMode !== "assign" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void createSeatAtCell(item.floor.id, cell.x, cell.y);
                                        }}
                                        className="mt-1 rounded-full border border-[var(--lp-primary)] bg-white px-2 py-1.5 text-center text-[8px] font-black uppercase tracking-[0.08em] text-[var(--lp-primary)]"
                                        aria-label={`Create seat at X${cell.x} Y${cell.y}`}
                                      >
                                        +
                                      </button>
                                      <span className="mt-1 text-[7px] font-semibold text-[var(--lp-primary)]">Add seat</span>
                                    </>
                                  ) : (
                                    <div className="mt-1 flex flex-col items-center gap-1 text-center">
                                      <span className="rounded-full bg-slate-200 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-600">
                                        No seat
                                      </span>
                                      <span className="text-[8px] text-slate-500">Add in setup</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            );
          })}
          {!loading && floorCards.length === 0 ? (
            <DashboardCard title="No seats found" subtitle="Create floors and seat banks from the setup tools above.">
              <p className="text-sm leading-7 text-slate-600">No seat data is available for the current library or active filter.</p>
            </DashboardCard>
          ) : null}
        </div>

        {workspaceMode === "assign" ? (
          <div className="grid gap-6 xl:sticky xl:top-[84px] xl:self-start">
            <DashboardCard title="Assignment tray" subtitle="Only unallotted students stay here, so the tray stays compact and useful.">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">Unallotted students</p>
                    <p className="mt-1 text-sm text-slate-500">Open this only while you are placing ready students into seats.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignmentTrayOpen((current) => !current)}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700"
                  >
                    {assignmentTrayOpen ? "Hide tray" : "Open tray"}
                  </button>
                </div>
                {assignmentTrayOpen ? (
                  <>
                    <select
                      value={selectedAssignmentId}
                      onChange={(event) => setSelectedAssignmentId(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
                    >
                      <option value="">Select unallotted student</option>
                      {unallottedStudents.map((student) => (
                        <option key={student.assignment_id} value={student.assignment_id}>
                          {student.student_name} | {student.plan_name} | {student.payment_status}
                        </option>
                      ))}
                    </select>

                    <div className="max-h-[24rem] overflow-auto rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-3">
                      <div className="space-y-3">
                        {unallottedStudents.map((student) => (
                          <div
                            key={student.assignment_id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/assignment-id", student.assignment_id);
                              setSelectedAssignmentId(student.assignment_id);
                              const preview = makeSeatDragPreview(student.student_name);
                              event.dataTransfer.setDragImage(preview, 54, 36);
                              window.setTimeout(() => preview.remove(), 0);
                            }}
                            className={`cursor-grab rounded-[1rem] border px-4 py-3 active:cursor-grabbing ${selectedAssignmentId === student.assignment_id ? "border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)]" : "border-slate-200 bg-white"}`}
                          >
                            <p className="font-black text-slate-950">{student.student_name}</p>
                            <p className="text-sm text-slate-500">{student.plan_name} | {student.payment_status}</p>
                            <p className="text-xs text-slate-400">{student.payment_status} - Valid till {student.ends_at}</p>
                          </div>
                        ))}
                        {unallottedStudents.length === 0 ? <p className="px-2 py-6 text-center text-sm text-slate-500">No unallotted students waiting for seat placement.</p> : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                    The tray is hidden. Open it only while assigning seats.
                  </div>
                )}
              </div>
            </DashboardCard>
          </div>
        ) : null}
      </section>

      {hallSettingsFloor && hallSettingsDraft ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/20 px-3 pb-3 pt-16 backdrop-blur-sm lg:items-center lg:justify-center lg:p-6">
          <div className="w-full max-w-lg rounded-[0.75rem] border border-[var(--lp-border)] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-accent)]">Hall settings</p>
                <h3 className="mt-1 text-lg font-semibold text-[var(--lp-text)]">{hallSettingsFloor.floor.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setHallSettingsOpen(null)}
                className="rounded-[0.5rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--lp-text-soft)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium text-[var(--lp-text-soft)]">
                Floor name
                <input
                  value={hallSettingsDraft.name}
                  onChange={(event) => updateFloorDraft(hallSettingsFloor.floor.id, { name: event.target.value })}
                  className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-3 py-2 text-sm text-[var(--lp-text)] outline-none focus:border-[var(--lp-primary)]"
                  placeholder="Floor name"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-[var(--lp-text-soft)]">
                  Columns
                  <input
                    type="number"
                    min={1}
                    value={hallSettingsDraft.layoutColumns}
                    onChange={(event) => updateFloorDraft(hallSettingsFloor.floor.id, { layoutColumns: Number(event.target.value) || 1 })}
                    className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-3 py-2 text-sm text-[var(--lp-text)] outline-none focus:border-[var(--lp-primary)]"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-[var(--lp-text-soft)]">
                  Rows
                  <input
                    type="number"
                    min={1}
                    value={hallSettingsDraft.layoutRows}
                    onChange={(event) => updateFloorDraft(hallSettingsFloor.floor.id, { layoutRows: Number(event.target.value) || 1 })}
                    className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-3 py-2 text-sm text-[var(--lp-text)] outline-none focus:border-[var(--lp-primary)]"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--lp-border)] pt-4">
              <button
                type="button"
                onClick={() => setHallSettingsOpen(null)}
                className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveFloorLayout(hallSettingsFloor.floor.id)}
                className="rounded-[0.5rem] bg-[var(--lp-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Save hall
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {actionSheetOpen && selectedSeat ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--lp-border)] bg-[rgba(255,255,255,0.98)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-18px_40px_rgba(15,23,42,0.12)] backdrop-blur lg:left-auto lg:right-4 lg:top-[84px] lg:bottom-auto lg:w-[360px] lg:rounded-[0.75rem] lg:border lg:px-4 lg:pb-4">
          <div className="grid gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-accent)]">Seat action sheet</p>
                <p className="mt-1 text-lg font-semibold text-[var(--lp-text)]">{selectedSeat.seat_number}</p>
                <p className="text-sm text-[var(--lp-muted)]">{selectedSeat.floor_name ?? "Main floor"} | {selectedSeat.section_name ?? "Main section"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--lp-accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-accent)]">
                  {selectedSeat.status}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActionSheetOpen(false);
                    setSelectedSeatId(null);
                  }}
                  className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--lp-text-soft)]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-2 rounded-[0.5rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] p-3 text-sm text-[var(--lp-text-soft)]">
              <div className="flex items-center justify-between gap-3">
                <span>Occupant</span>
                <span className="font-semibold text-[var(--lp-text)]">{selectedSeat.student_name ?? "Not assigned"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Plan</span>
                <span className="font-semibold text-[var(--lp-text)]">{selectedSeat.plan_name ?? "Not allotted"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Payment</span>
                <span className="font-semibold text-[var(--lp-text)]">{selectedSeat.payment_status ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Valid till</span>
                <span className="font-semibold text-[var(--lp-text)]">{selectedSeat.ends_at ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Reserve timer</span>
                <span className="font-semibold text-[var(--lp-text)]">{formatReserveTimer(selectedSeat.reserved_until)}</span>
              </div>
            </div>

            {workspaceMode === "assign" && selectedAssignmentId ? (
              <div className="grid gap-2 rounded-[0.5rem] border border-[var(--lp-border)] bg-white p-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--lp-text)]">Place selected student</p>
                  <p className="text-sm text-[var(--lp-muted)]">{selectedAssignmentStudent?.student_name ?? "Selected student"} will be placed on this seat.</p>
                </div>
                <button
                  type="button"
                  disabled={selectedSeat.status !== "AVAILABLE" || selectedAssignmentStudent?.admission_status === "SEAT_ALLOTTED"}
                  onClick={() => void assignSeat(selectedSeat.id)}
                  className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {selectedSeat.status === "AVAILABLE" ? "Allot this seat" : "Choose a free seat"}
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[var(--lp-text)]">Advanced controls</p>
                <p className="text-sm text-[var(--lp-muted)]">Open only when you need to edit state or position.</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectorControlsOpen((current) => !current)}
                className="rounded-[0.5rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--lp-text-soft)]"
              >
                {inspectorControlsOpen ? "Hide controls" : "Open controls"}
              </button>
            </div>

            {inspectorControlsOpen ? (
              <div className="grid gap-3">
                <input value={drawerSeatCode} onChange={(event) => setDrawerSeatCode(event.target.value)} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Seat code" />
                <input value={drawerSectionName} onChange={(event) => setDrawerSectionName(event.target.value)} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" placeholder="Room / section" />
                {(workspaceMode === "layout" || selectedSeat.status === "RESERVED") ? (
                  <input type="datetime-local" value={drawerReservedUntil} onChange={(event) => setDrawerReservedUntil(event.target.value)} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 outline-none" />
                ) : null}

                {workspaceMode === "layout" ? (
                  <div className="grid grid-cols-3 gap-2 rounded-[0.5rem] border border-[var(--lp-border)] bg-white p-3">
                    <div />
                    <button type="button" onClick={() => void nudgeSelectedSeat(0, -1)} className="rounded-[0.5rem] border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold">Up</button>
                    <div />
                    <button type="button" onClick={() => void nudgeSelectedSeat(-1, 0)} className="rounded-[0.5rem] border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold">Left</button>
                    <button type="button" onClick={() => void centerSelectedSeat()} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--lp-accent)]">Center</button>
                    <button type="button" onClick={() => void nudgeSelectedSeat(1, 0)} className="rounded-[0.5rem] border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold">Right</button>
                    <div />
                    <button type="button" onClick={() => void nudgeSelectedSeat(0, 1)} className="rounded-[0.5rem] border border-[var(--lp-border)] px-3 py-2 text-sm font-semibold">Down</button>
                    <div />
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => void updateSeatAction("RESERVED")} className="rounded-[0.5rem] border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">Reserve till</button>
                  <button type="button" onClick={() => void updateSeatAction("DISABLED")} className="rounded-[0.5rem] border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Block seat</button>
                  <button type="button" onClick={() => void updateSeatAction("AVAILABLE", true)} className="rounded-[0.5rem] border border-[var(--lp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--lp-text)]">Mark free</button>
                  <button type="button" onClick={() => void updateSeatAction(selectedSeat.status as "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED")} className="rounded-[0.5rem] border border-[var(--lp-accent)] bg-[var(--lp-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--lp-accent)]">Save edits</button>
                </div>
              </div>
            ) : null}

            {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
            {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
