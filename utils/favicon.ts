export type Domain = string;

export interface Favicon {
  src: string;
  data: string; // Base64
}

const domainToFavicon = new Map<
  Domain,
  WxtStorageItem<Favicon | null, Record<Domain, never>>
>();

export function resolveDomain(url: string) {
  return new URL(url).hostname as Domain;
}

function obtainStorageItem(
  domain: Domain,
): WxtStorageItem<Favicon | null, Record<Domain, never>> {
  let item = domainToFavicon.get(domain);
  if (item === undefined) {
    item = storage.defineItem<Favicon | null>(`local:favicon:${domain}`);
    domainToFavicon.set(domain, item);
  }
  return item;
}

export async function findFavicon(
  domain: Domain,
): Promise<Favicon | undefined> {
  return (await obtainStorageItem(domain).getValue()) ?? undefined;
}

export async function saveFavicon(
  domain: Domain,
  favicon: Favicon,
): Promise<void> {
  await obtainStorageItem(domain).setValue(favicon);
}

export async function deleteFavicons(domains: Domain[]): Promise<void> {
  await Promise.all(
    domains.map((domain) => obtainStorageItem(domain).removeValue()),
  );
}

export async function fetchFavicon(url: string): Promise<Favicon> {
  const response = await browser.runtime.sendMessage({
    type: "fetchFavicon",
    url,
  });
  return { src: response.url, data: response.data };
}

export async function migrateFaviconStorage(): Promise<void> {
  // const domainToFavicon = storage.defineItem<Record<Domain, Favicon>>("local:domainToFavicon", { fallback: {} });

  const oldStorage = await storage.getItem("local:domainToFavicon");
  if (oldStorage === null || Object.keys(oldStorage).length === 0) return;

  await storage.setItems(
    Object.entries(oldStorage).map(([domain, favicon]) => ({
      key: `local:favicon:${domain}`,
      value: favicon,
    })),
  );
  await storage.removeItem("local:domainToFavicon");
}
