"use client";

import { useEffect, useMemo, useState } from "react";
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
  if (seat.status === "RESERVED") return `Reserved • ${formatReserveTimer(seat.reserved_until)}`;
  if (seat.status === "DISABLED") return "Blocked";
  return "Free";
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
  if (columns >= 14) return 82;
  if (columns >= 12) return 88;
  if (columns >= 10) return 96;
  return 120;
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
      <svg viewBox="0 0 120 64" className="h-12 w-full text-slate-900/55" aria-hidden="true">
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
      <svg viewBox="0 0 120 64" className="h-12 w-full text-slate-900/55" aria-hidden="true">
        <rect x="12" y="10" width="7" height="44" rx="3" fill="currentColor" />
        <rect x="24" y="18" width="58" height="20" rx="8" fill="currentColor" opacity="0.18" />
        <rect x="36" y="42" width="10" height="10" rx="3" fill="currentColor" />
        <rect x="60" y="42" width="10" height="10" rx="3" fill="currentColor" />
        <rect x="86" y="16" width="16" height="28" rx="7" fill="currentColor" opacity="0.16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 64" className="h-12 w-full text-slate-900/55" aria-hidden="true">
      <rect x="28" y="18" width="64" height="20" rx="9" fill="currentColor" opacity="0.2" />
      <rect x="40" y="42" width="10" height="10" rx="3" fill="currentColor" />
      <rect x="70" y="42" width="10" height="10" rx="3" fill="currentColor" />
      <rect x="18" y="20" width="14" height="24" rx="7" fill="currentColor" opacity="0.14" />
      <rect x="88" y="20" width="14" height="24" rx="7" fill="currentColor" opacity="0.14" />
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
    if (!activeAislePaint) return;
    const handleMouseUp = () => {
      const draft = floorMetaDrafts[activeAislePaint.floorId];
      void saveFloorMeta(activeAislePaint.floorId, {
        aisleCells: draft?.aisleCells ?? [],
        sectionColors: draft?.sectionColors ?? {},
      });
      setActiveAislePaint(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
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
    };
  }, []);

  const selectedSeat = useMemo(() => seats.find((seat) => seat.id === selectedSeatId) ?? null, [seats, selectedSeatId]);

  useEffect(() => {
    if (!selectedSeat) return;
    setDrawerSeatCode(selectedSeat.seat_number);
    setDrawerSectionName(selectedSeat.section_name ?? "");
    setDrawerReservedUntil(selectedSeat.reserved_until ? selectedSeat.reserved_until.slice(0, 16) : "");
  }, [selectedSeat]);

  const availableStudents = useMemo(() => students.filter((student) => student.assignment_id), [students]);
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
          if (seatFilter === "EXPIRING") return !!seat.ends_at && seat.ends_at <= "2026-04-05";
          return seat.status === seatFilter;
        }),
      }))
      .filter((item) => item.seats.length > 0 || item.floor.id === selectedFloorId);
  }, [floors, seats, seatFilter, selectedFloorId]);

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
      setError("Pehle student select karo, phir seat choose karo.");
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
      setMessage(`New floor created. "${result.data.name}" ab seat bank create ke liye selected hai.`);
      await loadData();
    } catch (submitError) {
      const rawMessage = submitError instanceof Error ? submitError.message : "Floor create failed.";
      if (rawMessage.includes("Floor number already exists")) {
        const suggestion = suggestNextFloor(floors);
        setFloorNumber(suggestion.floorNumber);
        setFloorName(suggestion.floorName);
        setError(`Ye floor number already use ho raha hai. Ab next available floor auto-fill kar diya gaya hai: ${suggestion.floorName}.`);
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
      setError("Pehle floor select karo ya naya floor create karo, phir seat bank banao.");
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
      setError("Single seat create karne se pehle floor select karo.");
      return;
    }

    if (!manualSeatCode.trim()) {
      setError("Seat code likho, jaise G-12 ya A7.");
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
    if (!layoutMode) return;

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
      setError("Is floor par pehle seats create karo, tab room layout apply hoga.");
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
      setMessage(`${preset.sectionName} layout apply ho gaya.`);
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
    <div className="grid gap-6">
      <DashboardCard title="Seat Creation Ribbon" subtitle="MS Word jaisa top ribbon yahin se floor, seat bank, aur single seat create karo.">
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["floor", "Create Floor"],
              ["bank", "Seat Bank"],
              ["single", "Single Seat"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRibbonTab(value as typeof ribbonTab)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                  ribbonTab === value
                    ? "bg-[var(--lp-primary)] text-white shadow-[0_10px_22px_rgba(210,114,61,0.22)]"
                    : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

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

          {ribbonTab === "floor" ? (
            <form id="seat-create-floor" onSubmit={createFloor} className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
              <div className="lg:col-span-5 rounded-[1rem] border border-dashed border-[var(--lp-border)] bg-[#fff9f2] px-3 py-2 text-sm text-[var(--lp-muted)]">
                Existing floors ke basis par next floor number auto-suggest hota hai. Duplicate hua to next available floor suggest hoga.
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
              <button type="submit" className="rounded-[1rem] bg-[var(--lp-primary)] px-5 py-3 text-sm font-semibold text-white">Create floor</button>
            </form>
          ) : null}

          {ribbonTab === "bank" ? (
            <form id="seat-create-bank" onSubmit={createSeats} className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
              <div className="lg:col-span-9 rounded-[1rem] border border-dashed border-[var(--lp-border)] bg-[#fff9f2] px-3 py-2 text-sm text-[var(--lp-muted)]">
                Floor choose karke bulk seat bank banao. Prefix, count, row/column start aur columns per row yahin se set karo.
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
              <button type="submit" disabled={!selectedFloorId} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#eff7f0] px-5 py-3 text-sm font-semibold text-[var(--lp-primary)] disabled:cursor-not-allowed disabled:opacity-50">Create seat bank</button>
              <datalist id="seat-sections-ribbon">
                {sectionOptions.map((section) => (
                  <option key={section} value={section} />
                ))}
              </datalist>
            </form>
          ) : null}

          {ribbonTab === "single" ? (
            <form id="seat-create-single" onSubmit={createSingleSeat} className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
              <div className="lg:col-span-4 rounded-[1rem] border border-dashed border-[var(--lp-border)] bg-[#fff9f2] px-3 py-2 text-sm text-[var(--lp-muted)]">
                Ek exact custom seat banana ho to yahin se code likho, floor choose rakho, aur direct create karo.
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
              <button type="submit" disabled={!selectedFloorId} className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--lp-primary)] disabled:cursor-not-allowed disabled:opacity-50">Create one seat</button>
            </form>
          ) : null}
        </div>
      </DashboardCard>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <DashboardCard title="Planner controls" subtitle="Make the hall feel like a real reading floor.">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1rem] bg-[#f5faf6] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-muted)]">Socket</p>
                <p className="mt-1 text-lg font-black text-[var(--lp-text)]">{liveStatus}</p>
              </div>
              <div className="rounded-[1rem] bg-[#f5faf6] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-muted)]">Layout mode</p>
                <button type="button" onClick={() => setLayoutMode((current) => !current)} className={`mt-2 rounded-full px-3 py-2 text-xs font-bold ${layoutMode ? "bg-[var(--lp-primary)] text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}>
                  {layoutMode ? "Planner active" : "Enable planner"}
                </button>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 text-sm leading-7 text-[var(--lp-muted)]">
              <p>1. Planner mode me seat ko drag karke doosri seat par swap karo.</p>
              <p>2. Empty cell par drag/click karke seat ki exact jagah set karo.</p>
              <p>3. Aisle paint aur section paint se hall zoning bhi karo.</p>
              <p>4. Desk presets se 2/4/6 seat table style instantly apply kar sakte ho.</p>
            </div>

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
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${plannerTool === value ? "bg-slate-900 text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "2")} className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">2 Seat Desk</button>
                <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "4")} className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">4 Seat Table</button>
                <button type="button" onClick={() => selectedFloorId && void applyDeskPreset(selectedFloorId, "6")} className="rounded-full border border-[var(--lp-border)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">6 Seat Table</button>
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

        <DashboardCard title="Active students" subtitle="Drag a student onto any seat pod.">
          <div className="grid gap-3">
            <select
              value={selectedAssignmentId}
              onChange={(event) => setSelectedAssignmentId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none"
            >
              <option value="">Select student assignment</option>
              {availableStudents.map((student) => (
                <option key={student.assignment_id} value={student.assignment_id}>
                  {student.student_name} | {student.seat_number ?? "No seat"} | {student.plan_name}
                </option>
              ))}
            </select>

            <div className="max-h-[24rem] overflow-auto rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-3">
              <div className="space-y-3">
                {availableStudents.map((student) => (
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
                    className={`cursor-grab rounded-[1rem] border px-4 py-3 active:cursor-grabbing ${selectedAssignmentId === student.assignment_id ? "border-[var(--lp-primary)] bg-[#fff7ef]" : "border-slate-200 bg-white"}`}
                  >
                    <p className="font-black text-slate-950">{student.student_name}</p>
                    <p className="text-sm text-slate-500">
                      {student.seat_number ?? "No seat"} | {student.plan_name}
                    </p>
                    <p className="text-xs text-slate-400">{student.payment_status} • Valid till {student.ends_at}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardCard>
      </section>

      <div className="flex flex-wrap gap-3">
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
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              seatFilter === value ? "bg-[var(--lp-primary)] text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section id="seat-planner" className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <div className="grid gap-6">
          {floorCards.map((item) => {
            const draft = floorDrafts[item.floor.id] ?? {
              name: item.floor.name,
              layoutRows: item.floor.layout_rows,
              layoutColumns: item.floor.layout_columns,
            };
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
              <DashboardCard key={item.floor.id} title={item.floor.name} subtitle="Compact reading hall view with live assignment and layout editing.">
                <div className="grid gap-4">
                  {item.floor.id !== "main-floor" ? (
                    <div className="grid gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 md:grid-cols-[1.2fr_0.7fr_0.7fr_auto]">
                      <input
                        value={draft.name}
                        onChange={(event) => updateFloorDraft(item.floor.id, { name: event.target.value })}
                        className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm outline-none"
                        placeholder="Floor name"
                      />
                      <input
                        type="number"
                        value={draft.layoutColumns}
                        onChange={(event) => updateFloorDraft(item.floor.id, { layoutColumns: Number(event.target.value) || 1 })}
                        className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm outline-none"
                        placeholder="Columns"
                      />
                      <input
                        type="number"
                        value={draft.layoutRows}
                        onChange={(event) => updateFloorDraft(item.floor.id, { layoutRows: Number(event.target.value) || 1 })}
                        className="rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] px-3 py-3 text-sm outline-none"
                        placeholder="Rows"
                      />
                      <button type="button" onClick={() => void saveFloorLayout(item.floor.id)} className="rounded-[1rem] bg-[var(--lp-primary)] px-4 py-3 text-sm font-semibold text-white">
                        Save hall
                      </button>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <div className="min-w-[42rem] rounded-[1.75rem] border border-[var(--lp-border)] bg-[radial-gradient(circle_at_top,#ffffff_0%,#fcf7ef_100%)] p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-muted)]">Floor Planner</p>
                          <p className="text-sm text-slate-500">{item.columns} columns • {item.rows} rows • drag seats to design the room</p>
                        </div>
                        <button type="button" onClick={() => setSelectedFloorId(item.floor.id)} className={`rounded-full px-4 py-2 text-xs font-bold ${selectedFloorId === item.floor.id ? "bg-[var(--lp-primary)] text-white" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"}`}>
                          {selectedFloorId === item.floor.id ? "Editing this floor" : "Use this floor"}
                        </button>
                      </div>

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
                            <span className="text-[11px] text-slate-500">Tap chip to load color</span>
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

                      <div
                        className="grid gap-2 rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,242,231,0.92))] p-3"
                        style={{ gridTemplateColumns: `repeat(${item.columns}, minmax(${getPlannerColumnWidth(item.columns)}px, 1fr))` }}
                      >
                        {cells.map((cell) => {
                          const seat = cell.seat;
                          const isAisleCell = aisleCells.has(cell.key);
                          const seatShape = seat ? inferSeatShape(seat) : "Study Desk";
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

                                if (plannerTool !== "aisle" && layoutMode && !selectedSeat && !seat && !isAisleCell) {
                                  void createSeatAtCell(item.floor.id, cell.x, cell.y);
                                }
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setHoverCellKey(cell.key);
                              }}
                              onMouseEnter={() => {
                                if (activeAislePaint?.floorId === item.floor.id && !seat) {
                                  updateAisleDraft(item.floor.id, cell.key, activeAislePaint.mode);
                                }
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

                                if (assignmentId && seat) {
                                  setSelectedAssignmentId(assignmentId);
                                  setSelectedSeatId(seat.id);
                                  void assignSeat(seat.id);
                                  return;
                                }

                                if (sourceSeatId && seat) {
                                  setSelectedSeatId(seat.id);
                                  void swapSeatPositions(sourceSeatId, seat.id);
                                  return;
                                }

                                if (sourceSeatId && !seat) {
                                  void moveSeatToPosition(sourceSeatId, cell.x, cell.y);
                                }
                              }}
                              className={`relative min-h-[8.5rem] rounded-[1.1rem] border border-dashed p-2 transition ${!seat ? "border-[var(--lp-border)] bg-white/60" : "border-transparent bg-transparent p-0"} ${layoutMode && !seat ? "cursor-pointer hover:border-[var(--lp-primary)] hover:bg-[#fff7ef]" : ""} ${hoverCellKey === cell.key ? "scale-[1.02] border-[var(--lp-primary)] bg-[#fff1e6]" : ""} ${isAisleCell ? "border-slate-400 bg-[repeating-linear-gradient(45deg,#ece5da,#ece5da_10px,#f8f2ea_10px,#f8f2ea_20px)]" : ""}`}
                            >
                              {seat ? (
                                <button
                                  draggable
                                  onClick={() => {
                                    if (plannerTool === "paint") {
                                      void paintSeatSection(seat);
                                      return;
                                    }
                                    setSelectedSeatId(seat.id);
                                    setSelectedFloorId(item.floor.id);
                                  }}
                                  onDragStart={(event) => {
                                    event.dataTransfer.setData("text/seat-id", seat.id);
                                    setDragSeatId(seat.id);
                                    const preview = makeSeatDragPreview(seat.seat_number);
                                    event.dataTransfer.setDragImage(preview, 54, 36);
                                    window.setTimeout(() => preview.remove(), 0);
                                  }}
                                  onDragEnd={() => setDragSeatId(null)}
                                  className={`relative flex h-full w-full flex-col rounded-[1.1rem] border p-2.5 text-left transition hover:-translate-y-0.5 ${seatToneClasses[seat.status] ?? seatToneClasses.AVAILABLE} ${selectedSeatId === seat.id ? "ring-2 ring-[var(--lp-primary)]" : ""} ${dragSeatId === seat.id ? "opacity-70" : ""} ${recentlyMovedSeatId === seat.id ? "animate-pulse ring-2 ring-emerald-400" : ""}`}
                                  style={sectionColors[seat.section_name ?? ""] ? { boxShadow: `0 0 0 2px ${sectionColors[seat.section_name ?? ""]} inset` } : undefined}
                                >
                                  <div className="mb-2 h-2 rounded-full bg-slate-900/10" />
                                  <div className="mb-2 flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-black">{seat.seat_number}</p>
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">{seat.section_name ?? "Main"}</p>
                                    </div>
                                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                                      {seat.status}
                                    </span>
                                  </div>

                                  <div className="relative mt-1 rounded-[0.9rem] bg-white/70 px-2.5 py-2.5">
                                    <SeatSilhouette shape={seatShape} />
                                    <div className="mb-2 flex items-center gap-1">
                                      <div className="h-2 flex-1 rounded-full bg-slate-900/10" />
                                      <div className="h-2 w-8 rounded-full bg-slate-900/20" />
                                      <div className="h-2 flex-1 rounded-full bg-slate-900/10" />
                                    </div>
                                    <div className="mb-3 flex items-center justify-between">
                                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Seat Pod</span>
                                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-[10px] font-black text-white">
                                        {formatStudentInitials(seat.student_name)}
                                      </span>
                                    </div>
                                    <p className="text-[13px] font-semibold">{describeSeatState(seat)}</p>
                                    <p className="mt-1 text-xs opacity-75">{seat.plan_name ?? "No plan"} | {seat.payment_status ?? "NA"}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <span
                                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getZoneTone(inferZone(seat))}`}
                                        style={sectionColors[seat.section_name ?? ""] ? { backgroundColor: sectionColors[seat.section_name ?? ""], color: "#fff" } : undefined}
                                      >
                                        {inferZone(seat)}
                                      </span>
                                      <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">{seatShape}</span>
                                      <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">{getClusterType(cell.x)}</span>
                                    </div>
                                    <div className="mt-3 h-2 rounded-full bg-slate-900/15" />
                                  </div>

                                  <div className="mt-3 flex items-center justify-between text-[11px] opacity-80">
                                    <span>X{seat.pos_x} | Y{seat.pos_y}</span>
                                    <span>{seat.ends_at ?? "-"}</span>
                                  </div>
                                  <div className="mt-2 h-2 rounded-full bg-slate-900/10" />
                                </button>
                              ) : (
                                <div className={`flex h-full flex-col justify-between rounded-[1rem] p-2.5 text-[11px] text-slate-400 ${layoutMode ? "animate-pulse" : ""} ${isAisleCell ? "bg-transparent" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,231,0.92))]"}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold uppercase tracking-[0.18em]">{isAisleCell ? "Aisle" : "Empty cell"}</span>
                                    <span>{cell.x},{cell.y}</span>
                                  </div>
                                  <div className="grid gap-2">
                                    <div className="rounded-full border border-dashed border-slate-300 px-3 py-2 text-center">
                                      {isAisleCell ? "Walking path" : layoutMode ? "Drop seat here" : "Aisle / space"}
                                    </div>
                                    {!isAisleCell ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void createSeatAtCell(item.floor.id, cell.x, cell.y);
                                        }}
                                        className="rounded-full border border-[var(--lp-primary)] bg-white px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lp-primary)]"
                                      >
                                        + Create seat here
                                      </button>
                                    ) : null}
                                  </div>
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
              <p className="text-sm leading-7 text-slate-600">Current filter ya library me abhi koi seat data available nahi hai.</p>
            </DashboardCard>
          ) : null}
        </div>

        <div className="grid gap-6">
          <DashboardCard title="Seat action drawer" subtitle="Fine tune position, reserve state, and seat identity.">
            <div className="grid gap-4">
              {selectedSeat ? (
                <>
                  <div className="rounded-[1.25rem] border border-[var(--lp-border)] bg-[#fff7ef] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-[var(--lp-text)]">{selectedSeat.seat_number}</p>
                        <p className="text-sm text-[var(--lp-muted)]">{selectedSeat.floor_name ?? "Main floor"} • {selectedSeat.section_name ?? "Main section"}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                        {selectedSeat.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">{formatReserveTimer(selectedSeat.reserved_until)}</p>
                  </div>

                  <input value={drawerSeatCode} onChange={(event) => setDrawerSeatCode(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Seat code" />
                  <input value={drawerSectionName} onChange={(event) => setDrawerSectionName(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" placeholder="Room / section" />
                  <input type="datetime-local" value={drawerReservedUntil} onChange={(event) => setDrawerReservedUntil(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none" />

                  <div className="grid gap-3 md:grid-cols-2">
                    <input value={selectedSeat.pos_x} readOnly className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="Pos X" />
                    <input value={selectedSeat.pos_y} readOnly className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="Pos Y" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-3">
                    <div />
                    <button type="button" onClick={() => void nudgeSelectedSeat(0, -1)} className="rounded-[1rem] border border-[var(--lp-border)] px-3 py-3 text-sm font-semibold">Up</button>
                    <div />
                    <button type="button" onClick={() => void nudgeSelectedSeat(-1, 0)} className="rounded-[1rem] border border-[var(--lp-border)] px-3 py-3 text-sm font-semibold">Left</button>
                    <button type="button" onClick={() => void moveSeatToPosition(selectedSeat.id, selectedSeat.pos_x, selectedSeat.pos_y)} className="rounded-[1rem] bg-[#eff7f0] px-3 py-3 text-sm font-semibold text-[var(--lp-primary)]">Center</button>
                    <button type="button" onClick={() => void nudgeSelectedSeat(1, 0)} className="rounded-[1rem] border border-[var(--lp-border)] px-3 py-3 text-sm font-semibold">Right</button>
                    <div />
                    <button type="button" onClick={() => void nudgeSelectedSeat(0, 1)} className="rounded-[1rem] border border-[var(--lp-border)] px-3 py-3 text-sm font-semibold">Down</button>
                    <div />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button type="button" onClick={() => void updateSeatAction("RESERVED")} className="rounded-[1rem] bg-amber-500 px-4 py-3 text-sm font-semibold text-white">Reserve till</button>
                    <button type="button" onClick={() => void updateSeatAction("DISABLED")} className="rounded-[1rem] bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Block seat</button>
                    <button type="button" onClick={() => void updateSeatAction("AVAILABLE", true)} className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--lp-text)]">Mark free</button>
                    <button type="button" onClick={() => void updateSeatAction(selectedSeat.status as "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED")} className="rounded-[1rem] border border-[var(--lp-border)] bg-[#eff7f0] px-4 py-3 text-sm font-semibold text-[var(--lp-primary)]">Save edits</button>
                  </div>
                  {selectedAssignmentId ? (
                    <button type="button" onClick={() => void assignSeat(selectedSeat.id)} className="rounded-[1rem] bg-[var(--lp-primary)] px-4 py-3 text-sm font-semibold text-white">
                      Allot selected student to this seat
                    </button>
                  ) : null}

                  <div className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white p-4 text-sm leading-7 text-slate-600">
                    <p>Student: {selectedSeat.student_name ?? "Not assigned"}</p>
                    <p>Plan: {selectedSeat.plan_name ?? "Not allotted"}</p>
                    <p>Payment: {selectedSeat.payment_status ?? "-"}</p>
                    <p>Valid till: {selectedSeat.ends_at ?? "-"}</p>
                    <p>Last check-in: {selectedSeat.last_check_in_at ? new Date(selectedSeat.last_check_in_at).toLocaleString() : "No entry yet"}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm leading-7 text-slate-600">Seat pod select karo. Yahin se hall planner ke exact controls milenge.</p>
              )}

              {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
              {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
              {loading ? <p className="text-sm text-slate-500">Loading live seat map...</p> : null}
            </div>
          </DashboardCard>
        </div>
      </section>
    </div>
  );
}
