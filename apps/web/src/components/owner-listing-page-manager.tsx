"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { OwnerMarketplaceListingManager } from "./owner-marketplace-listing-manager";

type OwnerSettingsResponse = {
  success: boolean;
  data: {
    library_name: string;
    address: string;
    city: string;
    area: string | null;
  };
};

export function OwnerListingPageManager() {
  const [settings, setSettings] = useState<OwnerSettingsResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await apiFetch<OwnerSettingsResponse>("/owner/settings");
        setSettings(response.data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load listing setup.");
      }
    }

    void loadSettings();
  }, []);

  if (!settings) {
    return <p className="text-sm text-slate-500">{error ?? "Loading listing workspace..."}</p>;
  }

  return (
    <OwnerMarketplaceListingManager
      libraryName={settings.library_name}
      address={settings.address}
      city={settings.city}
      area={settings.area}
    />
  );
}
