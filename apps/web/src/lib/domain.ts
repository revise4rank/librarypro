const DEFAULT_BASE_DOMAIN = "librarypro.com";

export function getBaseDomain() {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN ?? DEFAULT_BASE_DOMAIN;
}

export function formatLibraryHost(subdomain?: string | null) {
  if (!subdomain) {
    return getBaseDomain();
  }

  return `${subdomain}.${getBaseDomain()}`;
}
