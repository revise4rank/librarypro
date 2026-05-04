"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../lib/api";
import { getGalleryUrl } from "../lib/public-library";
import { Surface } from "./shell";

const filterOptions = ["AC", "WiFi", "Girls Only Zone", "Power Backup", "Locker", "QR Entry"];
const fallbackImages = ["/library-gallery/study-hall.svg", "/library-gallery/reading-zone.svg", "/library-gallery/reception.svg"];
const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price low-high" },
  { value: "nearest", label: "Nearest" },
  { value: "rating_desc", label: "Highest rated" },
] as const;
const quickFilters = [
  { value: "all", label: "All libraries" },
  { value: "top", label: "Top libraries" },
  { value: "offers", label: "Offers" },
  { value: "available", label: "Available seats" },
  { value: "nearby", label: "Near me" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];
type QuickFilterValue = (typeof quickFilters)[number]["value"];

type LibrarySearchItem = {
  library_id?: string;
  library_name: string;
  library_slug: string;
  city: string;
  area: string | null;
  available_seats: number;
  starting_price: string;
  offer_text: string | null;
  subdomain: string;
  hero_title: string;
  hero_tagline: string | null;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  amenities: string[] | null;
  gallery_images: string[] | null;
  business_hours: string | null;
  landmark: string | null;
  distance_km?: string | null;
  rating?: number | null;
  reviews?: number | null;
  latest_review_snippet?: string | null;
  quietness?: string | null;
};

type SearchResponse = {
  success: boolean;
  data: LibrarySearchItem[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type SuggestionsResponse = {
  success: boolean;
  data: string[];
};

function tileImageFor(library: LibrarySearchItem, index: number) {
  const source = library.gallery_images?.[0] ?? fallbackImages[index % fallbackImages.length];
  return getGalleryUrl(source, index);
}

function locationFor(library: LibrarySearchItem) {
  return [library.area, library.city].filter(Boolean).join(", ") || library.landmark || "Location available on details";
}

export function MarketplaceSearch() {
  const [query, setQuery] = useState("Indore");
  const [area, setArea] = useState("Vijay Nagar");
  const [minPrice, setMinPrice] = useState("500");
  const [maxPrice, setMaxPrice] = useState("1200");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["AC", "WiFi"]);
  const [results, setResults] = useState<LibrarySearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortValue>("relevance");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("all");

  async function runSearch(overrides?: { lat?: number; lng?: number; page?: number; query?: string }) {
    setLoading(true);
    setError(null);

    const activePage = overrides?.page ?? page;
    const activeQuery = overrides?.query ?? query;
    const activeLat = overrides?.lat ?? coords?.lat;
    const activeLng = overrides?.lng ?? coords?.lng;
    const params = new URLSearchParams();

    if (activeQuery) params.set("city", activeQuery);
    if (area) params.set("area", area);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (availableOnly) params.set("availableOnly", "true");
    if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));
    params.set("page", String(activePage));
    params.set("limit", "20");
    if (activeLat) params.set("lat", String(activeLat));
    if (activeLng) params.set("lng", String(activeLng));
    if (activeLat && activeLng) params.set("radiusKm", "5");

    try {
      const response = await fetch(`${API_URL}/public/libraries/search?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as SearchResponse;
      if (!response.ok) {
        throw new Error("Failed to load marketplace libraries.");
      }
      setResults(json.data);
      setPagination(json.meta ?? { total: json.data.length, page: activePage, limit: 20, totalPages: 1 });
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
      setResults([]);
      setPagination({ total: 0, page: 1, limit: 20, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runSearch({ page });
  }, [page]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setApiSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/public/libraries/suggestions?q=${encodeURIComponent(trimmed)}&limit=6`, {
          cache: "no-store",
        });
        const json = (await response.json()) as SuggestionsResponse;
        if (response.ok) {
          setApiSuggestions(json.data);
        }
      } catch {
        setApiSuggestions([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  function toggleAmenity(value: string) {
    setSelectedAmenities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function searchFromFirstPage(overrides?: { lat?: number; lng?: number; query?: string }) {
    setPage(1);
    void runSearch({ ...overrides, page: 1 });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Browser geolocation is not available.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoords(nextCoords);
        searchFromFirstPage(nextCoords);
      },
      () => {
        setError("Location access denied. Showing normal city search results.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const localSuggestions = Array.from(
    new Set(
      results
        .flatMap((library) => [library.library_name, library.city, library.area ?? "", library.subdomain])
        .filter(Boolean)
        .filter((item) => item.toLowerCase().includes(query.toLowerCase())),
    ),
  ).slice(0, 6);
  const suggestions = Array.from(new Set([...apiSuggestions, ...localSuggestions])).slice(0, 6);

  const sortedResults = useMemo(() => {
    const items = [...results];
    switch (sortBy) {
      case "price_asc":
        return items.sort((left, right) => Number(left.starting_price) - Number(right.starting_price));
      case "nearest":
        return items.sort((left, right) => Number(left.distance_km ?? Number.POSITIVE_INFINITY) - Number(right.distance_km ?? Number.POSITIVE_INFINITY));
      case "rating_desc":
        return items.sort((left, right) => Number(right.rating ?? 0) - Number(left.rating ?? 0));
      default:
        return items.sort((left, right) => right.available_seats - left.available_seats);
    }
  }, [results, sortBy]);

  const visibleResults = useMemo(() => {
    switch (quickFilter) {
      case "top":
        return sortedResults.filter((library) => Number(library.rating ?? 0) >= 4 || Number(library.reviews ?? 0) > 0);
      case "offers":
        return sortedResults.filter((library) => Boolean(library.offer_text));
      case "available":
        return sortedResults.filter((library) => library.available_seats > 0);
      case "nearby":
        return sortedResults.filter((library) => Boolean(library.distance_km));
      default:
        return sortedResults;
    }
  }, [quickFilter, sortedResults]);

  const quickCounts = {
    all: sortedResults.length,
    top: sortedResults.filter((library) => Number(library.rating ?? 0) >= 4 || Number(library.reviews ?? 0) > 0).length,
    offers: sortedResults.filter((library) => Boolean(library.offer_text)).length,
    available: sortedResults.filter((library) => library.available_seats > 0).length,
    nearby: sortedResults.filter((library) => Boolean(library.distance_km)).length,
  } satisfies Record<QuickFilterValue, number>;

  const amenityCounts = filterOptions.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item] = sortedResults.filter((library) => (library.amenities ?? []).includes(item)).length;
    return accumulator;
  }, {});

  const filterPanel = (
    <Surface title="Advanced filters" subtitle="Use only when city search is not enough">
      <div className="grid gap-3">
        <label className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3">
          <span className="lp-label text-[var(--lp-accent)]">City</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
        </label>
        <label className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3">
          <span className="lp-label text-[var(--lp-accent)]">Locality</span>
          <input value={area} onChange={(event) => setArea(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3">
            <span className="lp-label text-[var(--lp-accent)]">Min budget</span>
            <input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
          </label>
          <label className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3">
            <span className="lp-label text-[var(--lp-accent)]">Max budget</span>
            <input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--lp-text)]">
          <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
          Show only libraries with available seats
        </label>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((filter) => {
            const active = selectedAmenities.includes(filter);
            return (
              <button
                key={filter}
                type="button"
                onClick={() => toggleAmenity(filter)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "border border-[#b7d1bb] bg-[#e6f3e8] text-[var(--lp-primary)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-muted)]"}`}
              >
                {filter} ({amenityCounts[filter] ?? 0})
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              searchFromFirstPage();
              setIsMobileFiltersOpen(false);
            }}
            className="lp-button lp-button-primary"
          >
            Search libraries
          </button>
          <button type="button" onClick={useMyLocation} className="lp-button">
            Near me
          </button>
        </div>
        {coords ? <p className="text-sm text-[var(--lp-muted)]">Nearby search enabled within 5 km.</p> : null}
        {error ? <p className="text-sm font-semibold text-amber-700">{error}</p> : null}
      </div>
    </Surface>
  );

  return (
    <div className="grid gap-4 pb-24 xl:pb-0">
      <div className="grid gap-4">
        <section className="sticky top-[50px] z-20 rounded-xl border border-[var(--lp-border)] bg-[rgba(255,255,255,0.96)] p-3 shadow-sm backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(180px,0.55fr)_minmax(150px,0.45fr)_auto] xl:items-end">
            <div className="relative">
              <div className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3">
                <p className="lp-label text-[var(--lp-accent)]">Marketplace search</p>
                <input
                  value={query}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by city, library name, locality"
                  className="mt-1 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none"
                />
              </div>
              {showSuggestions && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-xl border border-[var(--lp-border)] bg-white p-2 shadow-sm">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={() => {
                        setQuery(item);
                        setShowSuggestions(false);
                        searchFromFirstPage({ query: item });
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--lp-text)] hover:bg-[#f4faf5]"
                    >
                      <span>{item}</span>
                      <span className="text-xs font-semibold text-[var(--lp-accent)]">suggestion</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <label className="rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3">
              <span className="lp-label text-[var(--lp-accent)]">Locality</span>
              <input
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="Vijay Nagar"
                className="mt-1 w-full bg-transparent text-sm font-semibold text-[var(--lp-text)] outline-none"
              />
            </label>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortValue)}
              className="h-full min-h-14 rounded-lg border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--lp-primary)] outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button type="button" onClick={() => searchFromFirstPage()} className="lp-button lp-button-primary">
                Search now
              </button>
              <button type="button" onClick={() => setIsMobileFiltersOpen(true)} className="lp-button">
                Filters
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {quickFilters.map((filter) => {
              const active = quickFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setQuickFilter(filter.value);
                    if (filter.value === "nearby" && !coords) {
                      useMyLocation();
                    }
                  }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-[#0F172A] text-white"
                      : "border border-[var(--lp-border)] bg-white text-[var(--lp-muted)] hover:bg-slate-50"
                  }`}
                >
                  {filter.label} ({quickCounts[filter.value]})
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--lp-border)] bg-[rgba(251,254,251,0.96)] p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="lp-label text-[var(--lp-accent)]">Libraries</p>
              <h2 className="mt-1 text-xl font-extrabold">Browse library tiles</h2>
            </div>
            <p className="text-sm font-semibold text-[var(--lp-muted)]">
              {loading ? "Loading..." : `${visibleResults.length} shown`}
            </p>
          </div>
        </section>

        {loading ? <Surface title="Loading libraries"><p className="text-sm text-slate-500">Fetching live marketplace data...</p></Surface> : null}
        {!loading && visibleResults.length === 0 ? (
          <Surface title="No published libraries found" subtitle="Try a different city, locality, or filter set.">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setArea("");
                  setSelectedAmenities([]);
                  setAvailableOnly(false);
                  setQuickFilter("all");
                  searchFromFirstPage();
                }}
                className="lp-button lp-button-primary"
              >
                Reset filters
              </button>
              <button type="button" onClick={useMyLocation} className="lp-button">
                Search near me
              </button>
            </div>
          </Surface>
        ) : null}

        {!loading ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleResults.map((library, index) => (
                <Link
                  key={`${library.subdomain}-${library.library_slug}`}
                  href={`/libraries/${library.library_slug}`}
                  aria-label={`Open ${library.library_name} details`}
                  className="group overflow-hidden rounded-xl border border-[var(--lp-border)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={tileImageFor(library, index)}
                      alt={`${library.library_name} preview`}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="grid gap-1 p-3">
                    <h3 className="truncate text-base font-bold tracking-tight text-[var(--lp-text)]">{library.library_name}</h3>
                    <p className="truncate text-sm text-[var(--lp-muted)]">{locationFor(library)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {pagination.totalPages > 1 ? (
              <div className="flex flex-col gap-3 rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-[var(--lp-muted)]">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:flex">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--lp-primary)] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                    className="rounded-xl bg-[var(--lp-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--lp-border)] bg-[rgba(248,252,248,0.96)] p-3 shadow-sm backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-[1280px] grid-cols-3 gap-2 sm:flex sm:gap-3">
          <button type="button" onClick={() => setIsMobileFiltersOpen(true)} className="rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-3 text-sm font-semibold text-[var(--lp-primary)]">
            Open filters
          </button>
          <button type="button" onClick={useMyLocation} className="rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-3 text-sm font-semibold text-[var(--lp-primary)]">
            Near me
          </button>
          <button type="button" onClick={() => searchFromFirstPage()} className="rounded-xl bg-[var(--lp-primary)] px-3 py-3 text-sm font-semibold text-white">
            Search
          </button>
        </div>
      </div>

      {isMobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(18,29,21,0.24)] px-3 py-4 xl:hidden">
          <div className="mx-auto flex max-h-[calc(100vh-2rem)] max-w-[1280px] flex-col overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[#f8fcf8] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--lp-border)] px-5 py-4">
              <div>
                <p className="lp-label text-[var(--lp-accent)]">Mobile filters</p>
                <h3 className="mt-1 text-xl font-extrabold text-[var(--lp-text)]">Refine marketplace search</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-primary)]"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {filterPanel}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
