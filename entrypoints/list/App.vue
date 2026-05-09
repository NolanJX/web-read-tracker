<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { isPlainObject } from "is-plain-object";
import {
  type Domain,
  type Favicon,
  findFavicon,
  saveFavicon,
} from "@/utils/favicon";
import {
  type Status,
  type WebPage,
  STATUSES,
  findAllWebPages,
  saveManyWebPages,
} from "@/utils/web-page";
import {
  type Node,
  type NodeTree,
  ROOT_ID,
  findAllNodes,
  buildNodeTree,
  saveManyNodes,
} from "@/utils/node";
import TreeNode from "@/components/TreeNode.vue";

const TABS = ["all", ...STATUSES] as const;
type Tab = (typeof TABS)[number];

const isLoading = ref(true);
const activeTab = ref<Tab>("all");

type NodeIcon = { type: "text"; data: string } | { type: "img"; data: string };
const nodeIconMap = ref<Map<string, NodeIcon>>(new Map());

const webPages = ref<WebPage[]>([]);
const webPageMap = ref<Map<string, WebPage>>(new Map());
const nodes = ref<Node[]>([]);
const nodeTrees = ref<NodeTree[]>([]);

const filteredNodeTrees = computed(() => {
  if (activeTab.value === "all") return nodeTrees.value;
  return nodeTrees.value
    .map((t) => filterNodeTree(t, activeTab.value as Status))
    .filter((t) => t !== null);
});

onMounted(async () => {
  await loadData();
});

async function loadData(showLoading = true) {
  if (showLoading) isLoading.value = true;

  [webPages.value, nodes.value] = await Promise.all([
    findAllWebPages(),
    findAllNodes(),
  ]);

  webPageMap.value = new Map(webPages.value.map((w) => [w.url, w]));
  nodeIconMap.value = new Map(
    await Promise.all(
      nodes.value.map(async (n) => [n.id, await resolveNodeIcon(n)] as const),
    ),
  );

  const root = nodes.value.find((n) => n.id === ROOT_ID)!;
  const rootTree = buildNodeTree(root, nodes.value);
  nodeTrees.value = rootTree.subtrees;

  isLoading.value = false;
}

function filterNodeTree(nodeTree: NodeTree, status: Status): NodeTree | null {
  if (nodeTree.root.type === "WebPage") {
    const webPage = webPageMap.value.get(nodeTree.root.webPageUrl)!;
    if (webPage.status === status) return nodeTree;
    return null;
  }

  const filteredSubtrees = nodeTree.subtrees
    .map((t) => filterNodeTree(t, status))
    .filter((t): t is NodeTree => t !== null);

  if (filteredSubtrees.length === 0) return null;
  return { root: nodeTree.root, subtrees: filteredSubtrees };
}

async function resolveNodeIcon(node: Node): Promise<NodeIcon> {
  const nodeIcon = { type: "text", data: "" };

  switch (node.type) {
    case "Folder":
      nodeIcon.data = "📁";
      break;
    case "Domain": {
      const domain = node.domain;
      const favicon = await findFavicon(domain);

      if (favicon !== undefined) {
        nodeIcon.type = "img";
        nodeIcon.data = favicon.data;
      } else {
        nodeIcon.data = "🌐";
      }
      break;
    }
    case "WebPage": {
      const domain = resolveDomain(node.webPageUrl);
      const favicon = await findFavicon(domain);

      if (favicon !== undefined) {
        nodeIcon.type = "img";
        nodeIcon.data = favicon.data;
      } else {
        nodeIcon.data = "📄";
      }
      break;
    }
  }

  return nodeIcon as NodeIcon;
}

function resolveDomain(url: string) {
  return new URL(url).hostname;
}

function title(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;

  if (files === null || files.length > 1) return;

  const file = files[0];
  const text = await file.text();

  let data: {
    domainToFavicon: Record<Domain, Favicon>;
    webPages: WebPage[];
    nodes: Node[];
  };

  try {
    data = JSON.parse(text);
    if (
      !isPlainObject(data) ||
      !isPlainObject(data.domainToFavicon) ||
      !Array.isArray(data.webPages) ||
      !Array.isArray(data.nodes)
    )
      throw new Error();
  } catch {
    input.value = "";
    return;
  }

  await Promise.all(
    Object.entries(data.domainToFavicon).map(
      ([domain, favicon]: [Domain, Favicon]) => saveFavicon(domain, favicon),
    ),
  );
  await saveManyWebPages(data.webPages);
  await saveManyNodes(data.nodes);

  input.value = "";
  await loadData();
}

async function handleExport() {
  const domainToFavicon: Record<Domain, Favicon> = {};
  const domains = new Set<Domain>();

  for (const node of nodes.value) {
    if (node.type === "Domain") {
      domains.add(node.domain);
    } else if (node.type === "WebPage") {
      domains.add(resolveDomain(node.webPageUrl));
    }
  }

  for (const domain of domains) {
    const favicon = await findFavicon(domain);
    if (favicon !== undefined) domainToFavicon[domain] = favicon;
  }

  const data = {
    domainToFavicon,
    webPages: webPages.value,
    nodes: nodes.value,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "web-read-tracker.json";
  anchor.click();

  URL.revokeObjectURL(url);
}

// UI
function getTabColor(tab: Tab) {
  const map: Record<Tab, string> = {
    all: "bg-gray-500",
    read: "bg-green-500",
    reading: "bg-blue-500",
    unread: "bg-orange-500",
  };
  return map[tab];
}
</script>

<template>
  <div class="mx-auto w-2/5">
    <div class="flex justify-center gap-x-4 pt-3">
      <label
        :class="{ 'pointer-events-none opacity-50': nodeTrees.length > 0 }"
        class="flex-1 overflow-hidden rounded border text-center text-base"
      >
        Import
        <input
          @change="handleImport"
          type="file"
          accept=".json"
          class="hidden"
        />
      </label>
      <button @click="handleExport" class="flex-1 rounded border text-base">
        Export
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex justify-center gap-x-4 border-b py-3">
      <button
        v-for="item in TABS"
        :key="item"
        :class="[
          getTabColor(item),
          { 'outline-2 outline-offset-2 outline-pink-500': activeTab === item },
        ]"
        @click="activeTab = item"
        class="flex-1 rounded border text-base text-white"
      >
        {{ title(item) }}
      </button>
    </div>
    <!-- List -->
    <div class="py-3">
      <div v-if="isLoading" class="text-center text-base">Loading...</div>
      <div
        v-else-if="filteredNodeTrees.length === 0"
        class="text-center text-base"
      >
        No items yet.
      </div>
      <div v-else>
        <TreeNode
          v-for="item in filteredNodeTrees"
          :key="item.root.id"
          :web-page-map="webPageMap"
          :node-icon-map="nodeIconMap"
          :node-tree="item"
          :depth="0"
          @deleted="loadData(false)"
          class="rounded border p-1 not-first:mt-1"
        ></TreeNode>
      </div>
    </div>
  </div>
</template>
