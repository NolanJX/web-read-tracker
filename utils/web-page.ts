export const STATUSES = ["read", "reading", "unread"] as const;
export type Status = (typeof STATUSES)[number];

export interface WebPage {
  url: string; // ID
  title: string;
  status: Status;
  readCount: number;
  createdAt: number;
  updatedAt: number;
}

const webPages = storage.defineItem<WebPage[]>("local:webPages", {
  fallback: [],
});

export async function findAllWebPages(): Promise<WebPage[]> {
  return await webPages.getValue();
}

export async function findWebPage(url: string): Promise<WebPage | undefined> {
  const existing = await findAllWebPages();
  return existing.find((w) => w.url === url);
}

export async function saveWebPage(
  webPage: Partial<WebPage> &
    Pick<WebPage, "url" | "title" | "status" | "readCount">,
): Promise<WebPage> {
  const existing = await findAllWebPages();
  const index = existing.findIndex((w) => w.url === webPage.url);

  const now = Date.now();

  if (index >= 0) {
    webPage = { ...existing[index], updatedAt: now, ...webPage } as WebPage;
    existing[index] = webPage;
  } else {
    webPage = {
      createdAt: now,
      updatedAt: now,
      ...webPage,
    } as WebPage;
    existing.push(webPage);
  }

  await webPages.setValue(existing);
  return webPage;
}

export async function saveManyWebPages(
  items: (Partial<WebPage> &
    Pick<WebPage, "url" | "title" | "status" | "readCount">)[],
): Promise<WebPage[]> {
  const existing = await findAllWebPages();
  const saved: WebPage[] = [];

  const now = Date.now();

  for (const item of items) {
    let webPage: WebPage;
    const index = existing.findIndex((w) => w.url === item.url);

    if (index >= 0) {
      webPage = { ...existing[index], updatedAt: now, ...item } as WebPage;
      existing[index] = webPage;
    } else {
      webPage = { createdAt: now, updatedAt: now, ...item } as WebPage;
      existing.push(webPage);
    }

    saved.push(webPage);
  }

  await webPages.setValue(existing);
  return saved;
}

export async function deleteWebPages(
  urls: string[],
): Promise<{ deleted: WebPage[]; remaining: WebPage[] }> {
  const deleted: WebPage[] = [];
  const remaining: WebPage[] = [];

  const existing = await findAllWebPages();
  for (const w of existing) {
    (urls.includes(w.url) ? deleted : remaining).push(w);
  }

  await webPages.setValue(remaining);
  return { deleted, remaining };
}
