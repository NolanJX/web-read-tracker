import { Domain } from "./favicon";

type BaseNode = {
  id: string; // UUID
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type FolderNode = BaseNode & { type: "Folder" };
export type DomainNode = BaseNode & { type: "Domain"; domain: Domain };
export type WebPageNode = BaseNode & { type: "WebPage"; webPageId: string };

export type Node = FolderNode | DomainNode | WebPageNode;
export const ROOT_ID = "root";

const nodes = storage.defineItem<Node[]>("local:nodes", {
  fallback: [],
});

export async function findAllNodes(): Promise<Node[]> {
  return await nodes.getValue();
}

export async function createRootNode(): Promise<FolderNode> {
  const now = Date.now();
  const node = {
    id: ROOT_ID,
    name: "Root",
    parentId: null,
    order: 0,
    createdAt: now,
    updatedAt: now,
    type: "Folder",
  };

  await nodes.setValue([node]);
  return node;
}

async function saveNode(
  node: Partial<Node> & Pick<Node, "name" | "parentId" | "order" | "type">,
): Promise<Node> {
  const existing = await nodes.getValue();
  const now = Date.now();

  if (node.id != null) {
    const index = existing.findIndex((n) => n.id === node.id);
    if (index >= 0) {
      node = { ...existing[index], updatedAt: now, ...node } as Node;
      existing[index] = node;
    } else {
      node = {
        createdAt: now,
        updatedAt: now,
        ...node,
      } as Node;
      existing.push(node);
    }
  } else {
    node = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...node,
    } as Node;
    existing.push(node);
  }

  await nodes.setValue(existing);
  return node;
}

export async function saveFolderNode(
  node: Partial<FolderNode> & Pick<FolderNode, "name" | "parentId" | "order">,
): Promise<FolderNode> {
  return (await saveNode({ ...node, type: "Folder" })) as FolderNode;
}

export async function saveDomainNode(
  node: Partial<DomainNode> &
    Pick<DomainNode, "name" | "parentId" | "order" | "domain">,
): Promise<DomainNode> {
  return (await saveNode({ ...node, type: "Domain" })) as DomainNode;
}

export async function saveWebPageNode(
  node: Partial<WebPageNode> &
    Pick<WebPageNode, "name" | "parentId" | "order" | "webPageId">,
): Promise<WebPageNode> {
  return (await saveNode({ ...node, type: "WebPage" })) as WebPageNode;
}
