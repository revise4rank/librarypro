"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../lib/api";
import { formatLibraryHost } from "../lib/domain";
import { getGalleryUrl } from "../lib/public-library";
import { ContactActions } from "./contact-actions";
import { Surface } from "./shell";

const filterOptions = ["AC", "WiFi", "Girls Only Zone", "Power Backup", "Locker", "QR Entry"];
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

function formatDistance(distanceKm?: string | null) {
  if (!distanceKm) return null;
  const parsed = Number(distanceKm);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)} km away` : null;
}

export function MarketplaceSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [compareLibraryIds, setCompareLibraryIds] = useState<string[]>([]);
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<SortValue>("relevance");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("all");

  async function runSearch(overrides?: { lat?: number; lng?: number }) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (query) params.set("city", query);
    if (area) params.set("area", area);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (availableOnly) params.set("availableOnly", "true");
    if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));
    params.set("page", String(page));
    params.set("limit", "20");
    if (overrides?.lat ?? coords?.lat) params.set("lat", String(overrides?.lat ?? coords?.lat));
    if (overrides?.lng ?? coords?.lng) params.set("lng", String(overrides?.lng ?? coords?.lng));
    if ((overrides?.lat ?? coords?.lat) && (overrides?.lng ?? coords?.lng)) params.set("radiusKm", "5");

    try {
      const response = await fetch(`${API_URL}/public/libraries/search?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json() as SearchResponse;
      if (!response.ok) {
        throw new Error("Failed to load marketplace libraries.");
      }
      setResults(json.data);
      setPagination(json.meta ?? { total: json.data.length, page, limit: 20, totalPages: 1 });
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
      setResults([]);
      setPagination({ total: 0, page: 1, limit: 20, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runSearch();
  }, [page]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem("lp_marketplace_shortlist");
    if (!stored) {
      return;
    }

    try {
      setShortlistIds(JSON.parse(stored) as string[]);
    } catch {
      setShortlistIds([]);
    }
  }, []);

  useEffect(() => {
    const compare = searchParams.get("compare");
    const sort = searchParams.get("sort");

    if (compare) {
      setCompareLibraryIds(compare.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3));
    }

    if (sort && sortOptions.some((item) => item.value === sort)) {
      setSortBy(sort as SortValue);
    }
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (compareLibraryIds.length > 0) {
      nextParams.set("compare", compareLibraryIds.join(","));
    } else {
      nextParams.delete("compare");
    }

    if (sortBy !== "relevance") {
      nextParams.set("sort", sortBy);
    } else {
      nextParams.delete("sort");
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [compareLibraryIds, sortBy, pathname, router, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("lp_marketplace_shortlist", JSON.stringify(shortlistIds));
  }, [shortlistIds]);

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
        const json = await response.json() as SuggestionsResponse;
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
        void runSearch(nextCoords);
      },
      () => {
        setError("Location access denied. Showing normal city search results.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function toggleCompare(library: LibrarySearchItem) {
    const key = library.library_id ?? library.subdomain;
    setCompareLibraryIds((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      if (current.length >= 3) {
        return [...current.slice(1), key];
      }
      return [...current, key];
    });
  }

  function setCardSlide(cardKey: string, nextIndex: number) {
    setActiveSlides((current) => ({ ...current, [cardKey]: nextIndex }));
  }

  function toggleShortlist(library: LibrarySearchItem) {
    const key = library.library_id ?? library.subdomain;
    setShortlistIds((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
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

  const comparedLibraries = visibleResults.filter((library) => compareLibraryIds.includes(library.library_id ?? library.subdomain));
  const shortlistedLibraries = visibleResults.filter((library) => shortlistIds.includes(library.library_id ?? library.subdomain));
  const amenityCounts = filterOptions.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item] = sortedResults.filter((library) => (library.amenities ?? []).includes(item)).length;
    return accumulator;
  }, {});

  const filterPanel = (
    <Surface title="Advanced filters" subtitle="Use only when city search is not enough">
      <div className="grid gap-3">
        <label className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3">
          <span className="lp-label text-[var(--lp-accent)]">City</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
        </label>
        <label className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3">
          <span className="lp-label text-[var(--lp-accent)]">Locality</span>
          <input value={area} onChange={(event) => setArea(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3">
            <span className="lp-label text-[var(--lp-accent)]">Min budget</span>
            <input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
          </label>
          <label className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3">
            <span className="lp-label text-[var(--lp-accent)]">Max budget</span>
            <input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="mt-3 w-full bg-transparent text-base font-semibold text-[var(--lp-text)] outline-none" />
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-medium text-[var(--lp-text)]">
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
            onClick={() => {
              void runSearch();
              setIsMobileFiltersOpen(false);
            }}
            className="lp-button lp-button-primary"
          >
            Search libraries
          </button>
          <button onClick={useMyLocation} className="lp-button">
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
        <section className="sticky top-[50px] z-20 rounded-[1rem] border border-[var(--lp-border)] bg-[rgba(255,255,255,0.96)] p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(180px,0.55fr)_minmax(150px,0.45fr)_auto] xl:items-end">
            <div className="relative">
              <div className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3">
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
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] rounded-[1.4rem] border border-[var(--lp-border)] bg-white p-2 shadow-[0_16px_36px_rgba(18,29,21,0.10)]">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={() => {
                        setQuery(item);
                        setShowSuggestions(false);
                        setPage(1);
                        void runSearch();
                      }}
                      className="flex w-full items-center justify-between rounded-[1rem] px-3 py-3 text-left text-sm font-medium text-[var(--lp-text)] hover:bg-[#f4faf5]"
                    >
                      <span>{item}</span>
                      <span className="text-xs font-semibold text-[var(--lp-accent)]">suggestion</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <label className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3">
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
              className="h-full min-h-14 rounded-[0.75rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--lp-primary)] outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button onClick={() => void runSearch()} className="lp-button lp-button-primary">
                Search now
              </button>
              <button onClick={() => setIsMobileFiltersOpen(true)} className="lp-button">
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

        {comparedLibraries.length > 0 ? (
          <section className="rounded-[1rem] border border-[var(--lp-border)] bg-[rgba(251,254,251,0.96)] p-4 shadow-[0_10px_24px_rgba(93,138,102,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="lp-label text-[var(--lp-accent)]">Compare</p>
                <h2 className="mt-1 text-xl font-extrabold">Selected libraries</h2>
              </div>
              <button
                type="button"
                onClick={() => setCompareLibraryIds([])}
                className="lp-button"
              >
                Clear compare
              </button>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {comparedLibraries.map((library) => (
                <div key={library.library_id ?? library.subdomain} className="rounded-[0.75rem] border border-[var(--lp-border)] bg-[#f8fcf8] p-4">
                  <h3 className="text-base font-extrabold text-[var(--lp-text)]">{library.library_name}</h3>
                  <p className="mt-1 text-sm text-[var(--lp-muted)]">{library.area ?? "Prime Area"}, {library.city}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1rem] bg-white p-3">
                      <p className="lp-stat-label text-[var(--lp-accent)]">Price</p>
                      <p className="mt-2 text-lg font-extrabold">Rs. {library.starting_price}</p>
                    </div>
                    <div className="rounded-[1rem] bg-white p-3">
                      <p className="lp-stat-label text-[var(--lp-accent)]">Seats</p>
                      <p className="mt-2 text-lg font-extrabold">{library.available_seats}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[0.75rem] bg-white p-3 text-sm leading-5 text-[var(--lp-muted)]">
                    {(library.amenities ?? []).slice(0, 3).join(" | ") || "Amenities not available"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {shortlistedLibraries.length > 0 ? (
          <section className="rounded-[1rem] border border-[var(--lp-border)] bg-[rgba(251,254,251,0.96)] p-4 shadow-[0_10px_24px_rgba(93,138,102,0.06)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="lp-label text-[var(--lp-accent)]">Shortlist</p>
                <h2 className="mt-1 text-xl font-extrabold">Saved libraries</h2>
              </div>
              <button type="button" onClick={() => setShortlistIds([])} className="lp-button">
                Clear shortlist
              </button>
            </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {shortlistedLibraries.map((library) => (
                <div key={`short-${library.library_id ?? library.subdomain}`} className="rounded-[0.75rem] border border-[var(--lp-border)] bg-white p-4">
                  <p className="text-lg font-extrabold text-[var(--lp-text)]">{library.library_name}</p>
                  <p className="mt-1 text-sm text-[var(--lp-muted)]">{library.area ?? "Prime Area"}, {library.city}</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--lp-primary)]">Rs. {library.starting_price} / month</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[1rem] border border-[var(--lp-border)] bg-[rgba(251,254,251,0.96)] p-4 shadow-[0_10px_24px_rgba(93,138,102,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="lp-label text-[var(--lp-accent)]">Libraries</p>
              <h2 className="mt-1 text-xl font-extrabold">Marketplace results</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-[#edf7ef] px-4 py-2 text-sm font-semibold text-[var(--lp-primary)]">
                {loading ? "Loading..." : `${visibleResults.length} shown`}
              </span>
              <span className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-primary)]">
                {quickFilters.find((filter) => filter.value === quickFilter)?.label}
              </span>
              <span className="rounded-full border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-2 text-sm font-semibold text-[var(--lp-primary)]">
                Compare {compareLibraryIds.length}/3
              </span>
            </div>
          </div>
        </section>

        {loading ? <Surface title="Loading libraries"><p className="text-sm text-slate-500">Fetching live marketplace data...</p></Surface> : null}
        {!loading && visibleResults.length === 0 ? (
          <Surface title="No published libraries found" subtitle="The marketplace is currently showing only live API data.">
            <div className="grid gap-3 text-sm leading-7 text-[var(--lp-muted)]">
              <p>Try a different city, remove quick filters, or widen your budget/facility filters.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setArea("");
                    setSelectedAmenities([]);
                    setAvailableOnly(false);
                    setQuickFilter("all");
                    setPage(1);
                    void runSearch();
                  }}
                  className="lp-button lp-button-primary"
                >
                  Reset filters
                </button>
                <button
                  onClick={useMyLocation}
                  className="lp-button"
                >
                  Search near me
                </button>
              </div>
            </div>
          </Surface>
        ) : null}
        {!loading ? (
          <div className="grid gap-6">
            <div className="grid gap-4 2xl:grid-cols-2">
            {visibleResults.map((library) => {
              const cardKey = library.library_id ?? library.subdomain;
              const gallery = (library.gallery_images?.length ? library.gallery_images : ["/library-gallery/study-hall.svg", "/library-gallery/reading-zone.svg", "/library-gallery/reception.svg"]).map(getGalleryUrl);
              const activeSlide = activeSlides[cardKey] ?? 0;
              const isCompared = compareLibraryIds.includes(cardKey);
              const isShortlisted = shortlistIds.includes(cardKey);

              return (
                <article
                  key={`${library.subdomain}-${library.library_slug}`}
                  className="overflow-hidden rounded-[1rem] border border-[var(--lp-border)] bg-[rgba(251,254,251,0.95)] shadow-[0_12px_28px_rgba(93,138,102,0.08)]"
                >
                  <div className="border-b border-[var(--lp-border)] bg-[linear-gradient(135deg,_#dff0e2,_#eef8f0_35%,_#cde7d1)] px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="rounded-full bg-[rgba(255,255,255,0.72)] px-3 py-1 text-xs font-semibold text-[var(--lp-primary)]">
                        Public website
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCompare(library)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${isCompared ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "bg-[rgba(255,255,255,0.72)] text-[var(--lp-primary)]"}`}
                      >
                        {isCompared ? "Added to compare" : "Compare"}
                      </button>
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleShortlist(library)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${isShortlisted ? "bg-[var(--lp-accent)] text-white" : "border border-[rgba(255,255,255,0.72)] bg-white/80 text-[var(--lp-accent)]"}`}
                      >
                        {isShortlisted ? "Saved to shortlist" : "Save shortlist"}
                      </button>
                    </div>

                    <div className="mt-4 rounded-[1rem] border border-[rgba(255,255,255,0.46)] bg-[rgba(255,255,255,0.46)] p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="lp-stat-label text-[var(--lp-accent)]">Website</p>
                          <p className="mt-2 break-all text-base font-extrabold text-[var(--lp-text)] sm:text-lg">{formatLibraryHost(library.subdomain)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setCardSlide(cardKey, activeSlide === 0 ? gallery.length - 1 : activeSlide - 1)} className="rounded-full border border-[rgba(255,255,255,0.7)] bg-white/80 px-3 py-1 text-sm font-semibold text-[var(--lp-primary)]">
                            {"<"}
                          </button>
                          <button type="button" onClick={() => setCardSlide(cardKey, activeSlide === gallery.length - 1 ? 0 : activeSlide + 1)} className="rounded-full border border-[rgba(255,255,255,0.7)] bg-white/80 px-3 py-1 text-sm font-semibold text-[var(--lp-primary)]">
                            {">"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 overflow-hidden rounded-[1.3rem] bg-[rgba(255,255,255,0.76)]">
                        <img src={gallery[activeSlide]} alt={`${library.library_name} preview`} className="h-40 w-full object-cover" />
                        <div className="p-3">
                          <p className="text-xs font-semibold text-[var(--lp-primary)]">
                            Preview {activeSlide + 1} of {gallery.length}
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-[1rem] bg-white/80 p-3">
                              <p className="lp-stat-label text-[var(--lp-accent)]">Seats</p>
                              <p className="mt-2 text-sm font-bold text-[var(--lp-text)]">{library.available_seats} visible now</p>
                            </div>
                            <div className="rounded-[1rem] bg-white/80 p-3">
                              <p className="lp-stat-label text-[var(--lp-accent)]">Entry</p>
                              <p className="mt-2 text-sm font-bold text-[var(--lp-text)]">QR + login</p>
                            </div>
                            <div className="rounded-[1rem] bg-white/80 p-3">
                              <p className="lp-stat-label text-[var(--lp-accent)]">Hours</p>
                              <p className="mt-2 text-sm font-bold text-[var(--lp-text)]">{library.business_hours ?? "Daily"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-xl font-extrabold text-[var(--lp-text)]">{library.library_name}</h3>
                        <p className="mt-1 text-sm text-[var(--lp-muted)]">{library.area ?? "Prime Area"}, {library.city}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--lp-accent)]">
                          {formatDistance(library.distance_km) ?? library.landmark ?? "Marketplace listing"}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700">
                        {library.available_seats} seats left
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#cfe1d2] bg-[#f4faf5] px-3 py-1.5 text-xs font-semibold text-[var(--lp-primary)]">
                        Verified listing
                      </span>
                      <span className="rounded-full border border-[#cfe1d2] bg-[#f4faf5] px-3 py-1.5 text-xs font-semibold text-[var(--lp-primary)]">
                        QR enabled
                      </span>
                      <span className="rounded-full border border-[#cfe1d2] bg-[#f4faf5] px-3 py-1.5 text-xs font-semibold text-[var(--lp-primary)]">
                        Owner managed website
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div className="rounded-[1.2rem] bg-[#f4faf5] p-4">
                        <p className="lp-stat-label text-[var(--lp-accent)]">Trust</p>
                        <p className="mt-2 text-lg font-extrabold text-[var(--lp-text)]">{Number(library.rating ?? 0).toFixed(1)}/5</p>
                      </div>
                      <div className="rounded-[1.2rem] bg-[#f4faf5] p-4">
                        <p className="lp-stat-label text-[var(--lp-accent)]">Reviews</p>
                        <p className="mt-2 text-lg font-extrabold text-[var(--lp-text)]">{library.reviews ?? 0}</p>
                      </div>
                      <div className="rounded-[1.2rem] bg-[#f4faf5] p-4">
                        <p className="lp-stat-label text-[var(--lp-accent)]">Quietness</p>
                        <p className="mt-2 text-lg font-extrabold text-[var(--lp-text)]">{library.quietness ?? "High"}</p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
                      <p className="text-2xl font-extrabold text-[var(--lp-text)]">
                        Rs. {library.starting_price}
                        <span className="ml-1 text-sm font-medium text-[var(--lp-muted)]">/ month</span>
                      </p>
                      <div className="rounded-[1.4rem] bg-[#edf7ef] px-4 py-3 text-sm font-semibold text-[var(--lp-primary)]">
                        {library.offer_text ?? "Contact owner for current offers"}
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--lp-muted)]">{library.hero_tagline ?? library.hero_title}</p>
                    {library.latest_review_snippet ? (
                      <div className="mt-4 rounded-[0.75rem] border border-[var(--lp-border)] bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-[var(--lp-muted)]">
                        <p className="lp-stat-label text-[var(--lp-accent)]">Latest review</p>
                        <p className="mt-2">&ldquo;{library.latest_review_snippet}&rdquo;</p>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {(library.amenities ?? []).map((amenity) => (
                        <span key={amenity} className="rounded-full bg-[#edf5ee] px-3 py-2 text-xs font-medium text-[var(--lp-primary)]">
                          {amenity}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <Link href={`/libraries/${library.library_slug}`} className="lp-button lp-button-primary">
                        View Library Details
                      </Link>
                      <Link href={`/library-site?slug=${library.subdomain}`} className="lp-button">
                        Go To Library Subdomain
                      </Link>
                    </div>

                    <ContactActions
                      className="mt-4"
                      slugOrSubdomain={library.subdomain}
                      phone={library.contact_phone}
                      whatsappPhone={library.whatsapp_phone}
                      sourcePage="MARKETPLACE"
                    />
                  </div>
                </article>
              );
            })}
            </div>
            {pagination.totalPages > 1 ? (
              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-[var(--lp-muted)]">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:flex">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-[1rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--lp-primary)] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                    className="rounded-[1rem] bg-[var(--lp-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--lp-border)] bg-[rgba(248,252,248,0.96)] p-3 shadow-[0_-10px_30px_rgba(93,138,102,0.10)] backdrop-blur xl:hidden">
        <div className="mx-auto grid max-w-[1280px] grid-cols-3 gap-2 sm:flex sm:gap-3">
          <button onClick={() => setIsMobileFiltersOpen(true)} className="rounded-[1rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-3 text-sm font-semibold text-[var(--lp-primary)]">
            Open filters
          </button>
          <button onClick={useMyLocation} className="rounded-[1rem] border border-[var(--lp-border)] bg-[var(--lp-surface)] px-3 py-3 text-sm font-semibold text-[var(--lp-primary)]">
            Near me
          </button>
          <button onClick={() => void runSearch()} className="rounded-[1rem] bg-[var(--lp-primary)] px-3 py-3 text-sm font-semibold text-white">
            Search
          </button>
        </div>
      </div>

      {isMobileFiltersOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(18,29,21,0.24)] px-3 py-4 xl:hidden">
          <div className="mx-auto flex max-h-[calc(100vh-2rem)] max-w-[1280px] flex-col overflow-hidden rounded-[1rem] border border-[var(--lp-border)] bg-[#f8fcf8] shadow-[0_20px_60px_rgba(18,29,21,0.16)]">
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
