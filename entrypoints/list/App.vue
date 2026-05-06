<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { findFavicon } from "@/utils/favicon";
import {
  type Status,
  type WebPage,
  STATUSES,
  findAllWebPages,
} from "@/utils/web-page";
import {
  type Node,
  type NodeTree,
  ROOT_ID,
  findAllNodes,
  buildNodeTree,
} from "@/utils/node";
import TreeNode from "@/components/TreeNode.vue";

const TABS = ["all", ...STATUSES] as const;
type Tab = (typeof TABS)[number];

const isLoading = ref(true);
const activeTab = ref<Tab>("all");

type NodeIcon = { type: "text"; data: string } | { type: "img"; data: string };
const nodeIconMap = ref<Map<string, NodeIcon>>(new Map());

const webPageMap = ref<Map<string, WebPage>>(new Map());
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

  const [webPages, nodes] = await Promise.all([
    findAllWebPages(),
    findAllNodes(),
  ]);

  webPageMap.value = new Map(webPages.map((w) => [w.url, w]));
  nodeIconMap.value = new Map(
    await Promise.all(
      nodes.map(async (n) => [n.id, await resolveNodeIcon(n)] as const),
    ),
  );

  const root = nodes.find((n) => n.id === ROOT_ID)!;
  const rootTree = buildNodeTree(root, nodes);
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
