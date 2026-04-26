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
export type WebPageNode = BaseNode & { type: "WebPage"; webPageUrl: string };

export type Node = FolderNode | DomainNode | WebPageNode;
export const ROOT_ID = "root";

const nodes = storage.defineItem<Node[]>("local:nodes", {
  fallback: [],
});

export async function findAllNodes(): Promise<Node[]> {
  return await nodes.getValue();
}

export async function findWebPageNodesByUrl(
  webPageUrl: string,
): Promise<WebPageNode[]> {
  const existing = await findAllNodes();
  return existing.filter(
    (n) => n.type === "WebPage" && n.webPageUrl === webPageUrl,
  );
}

export async function existsWebPageNodeByUrl(
  webPageUrl: string,
): Promise<boolean> {
  const existing = await findAllNodes();
  return existing.some(
    (n) => n.type === "WebPage" && n.webPageUrl === webPageUrl,
  );
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

export async function saveNode(
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
    Pick<WebPageNode, "name" | "parentId" | "order" | "webPageUrl">,
): Promise<WebPageNode> {
  return (await saveNode({ ...node, type: "WebPage" })) as WebPageNode;
}

export async function deleteNodeAndDescendants(
  id: string,
): Promise<{ deleted: Node[]; remaining: Node[] }> {
  const existing = await findAllNodes();
  const idsToDelete: string[] = [];

  function collectIds(id: string) {
    idsToDelete.push(id);
    existing.filter((n) => n.parentId === id).forEach((n) => collectIds(n.id));
  }

  collectIds(id);

  const deleted: Node[] = [];
  const remaining: Node[] = [];

  for (const n of existing) {
    (idsToDelete.includes(n.id) ? deleted : remaining).push(n);
  }

  await nodes.setValue(remaining);
  return { deleted, remaining };
}

export interface NodeTree {
  root: Node;
  subtrees: NodeTree[];
}

export function buildNodeTree(root: Node, nodes: Node[]): NodeTree {
  const children = nodes
    .filter((n) => n.parentId === root.id)
    .sort((a, b) => a.order - b.order);
  const subtrees = children.map((n) => buildNodeTree(n, nodes));

  return { root, subtrees };
}

export interface FlatTreeNode {
  node: Node;
  depth: number;
}

export function flattenNodeTree(
  nodeTree: NodeTree,
  rootDepth: number = 0,
): FlatTreeNode[] {
  const flatTreeNodes: FlatTreeNode[] = [
    { node: nodeTree.root, depth: rootDepth },
  ];

  for (const subtree of nodeTree.subtrees) {
    flatTreeNodes.push(...flattenNodeTree(subtree, rootDepth + 1));
  }

  return flatTreeNodes;
}
