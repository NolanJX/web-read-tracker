export type Domain = string;

export interface Favicon {
  src: string;
  data: string; // Base64
}

const domainToFavicon = storage.defineItem<Record<Domain, Favicon>>(
  "local:domainToFavicon",
  {
    fallback: {},
  },
);

export async function findFavicon(
  domain: Domain,
): Promise<Favicon | undefined> {
  const map = await domainToFavicon.getValue();
  return map[domain];
}

export async function saveFavicon(
  domain: Domain,
  favicon: Favicon,
): Promise<void> {
  const map = await domainToFavicon.getValue();
  map[domain] = favicon;
  await domainToFavicon.setValue(map);
}
