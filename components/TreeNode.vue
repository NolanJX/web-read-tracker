<script setup lang="ts">
import { ref } from "vue";
import { type Status, type WebPage } from "@/utils/web-page";
import { deleteFavicons } from "@/utils/favicon";
import { deleteWebPages } from "@/utils/web-page";
import { type NodeTree, deleteNodeAndDescendants } from "@/utils/node";

type NodeIcon = { type: "text"; data: string } | { type: "img"; data: string };

const props = defineProps<{
  webPageMap: Map<string, WebPage>;
  nodeIconMap: Map<string, NodeIcon>;
  nodeTree: NodeTree;
}>();

const emit = defineEmits<{ deleted: [] }>();

const nodeIcon = props.nodeIconMap.get(props.nodeTree.root.id)!;
const linkedWebPage =
  props.nodeTree.root.type === "WebPage"
    ? props.webPageMap.get(props.nodeTree.root.webPageUrl)
    : undefined;

const isPendingDeletion = ref(false);
const isExpanded = ref(true);

async function handleDelete() {
  if (!isPendingDeletion.value) {
    isPendingDeletion.value = true;
    return;
  }

  const { deleted: deletedNodes, remaining: remainingNodes } =
    await deleteNodeAndDescendants(props.nodeTree.root.id);

  // From WebPageNode
  const deletedUrls = deletedNodes
    .filter((n) => n.type === "WebPage")
    .map((n) => n.webPageUrl);

  if (deletedUrls.length > 0) {
    const remainingUrls = remainingNodes
      .filter((n) => n.type === "WebPage")
      .map((n) => n.webPageUrl);
    const orphanUrls = deletedUrls.filter((u) => !remainingUrls.includes(u));

    if (orphanUrls.length > 0) {
      await deleteWebPages(orphanUrls);
    }
  }

  // From DomainNode + WebPageNode
  const deletedDomains = deletedNodes
    .filter((n) => n.type === "Domain" || n.type === "WebPage")
    .map((n) => (n.type === "Domain" ? n.domain : resolveDomain(n.webPageUrl)));

  if (deletedDomains.length > 0) {
    const remainingDomains = remainingNodes
      .filter((n) => n.type === "Domain" || n.type === "WebPage")
      .map((n) =>
        n.type === "Domain" ? n.domain : resolveDomain(n.webPageUrl),
      );
    const orphanDomains = deletedDomains.filter(
      (d) => !remainingDomains.includes(d),
    );

    if (orphanDomains.length > 0) {
      await deleteFavicons(orphanDomains);
    }
  }

  emit("deleted");
}

function onDeleted() {
  emit("deleted");
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
function getStatusColor(status: Status) {
  const map: Record<Status, string> = {
    read: "bg-green-500",
    reading: "bg-blue-500",
    unread: "bg-orange-500",
  };
  return map[status];
}
</script>

<template>
  <div class="flex flex-col gap-y-1">
    <div class="flex items-center gap-x-1 text-sm">
      <button
        v-if="props.nodeTree.subtrees.length > 0"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? "🔽" : "▶️" }}
      </button>
      <span v-else class="w-4"></span>
      <img
        v-if="nodeIcon.type === 'img'"
        :src="nodeIcon.data"
        alt=""
        class="h-4 w-4"
      />
      <span v-else>{{ nodeIcon.data }}</span>
      <span class="flex-1">{{ props.nodeTree.root.name }}</span>
      <span
        v-if="linkedWebPage !== undefined"
        :class="getStatusColor(linkedWebPage.status)"
        class="rounded px-1 text-sm text-white"
      >
        {{ title(linkedWebPage.status) }}
      </span>
      <span v-if="linkedWebPage?.status === 'read'">
        {{ `&times;${linkedWebPage.readCount}` }}
      </span>
      <button
        v-if="isPendingDeletion"
        @click="handleDelete"
        class="rounded bg-red-500 px-1 text-sm text-white"
      >
        Delete
      </button>
      <button v-else @click="handleDelete">❌</button>
    </div>
    <div
      v-if="props.nodeTree.subtrees.length > 0 && isExpanded"
      class="ml-4 flex flex-col gap-y-1 border-t border-gray-300 pt-1"
    >
      <TreeNode
        v-for="item in props.nodeTree.subtrees"
        :key="item.root.id"
        :web-page-map="props.webPageMap"
        :node-icon-map="props.nodeIconMap"
        :node-tree="item"
        @deleted="onDeleted"
        class="not-first:border-t not-first:border-gray-300 not-first:pt-1"
      >
      </TreeNode>
    </div>
  </div>
</template>
