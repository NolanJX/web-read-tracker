<script setup lang="ts">
import { type Status, type WebPage } from "@/utils/web-page";
import { type NodeTree } from "@/utils/node";

type NodeIcon = { type: "text"; data: string } | { type: "img"; data: string };

const props = defineProps<{
  webPageMap: Map<string, WebPage>;
  nodeIconMap: Map<string, NodeIcon>;
  nodeTree: NodeTree;
}>();

const nodeIcon = props.nodeIconMap.get(props.nodeTree.root.id)!;
const linkedWebPage =
  props.nodeTree.root.type === "WebPage"
    ? props.webPageMap.get(props.nodeTree.root.webPageUrl)
    : undefined;

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
    </div>
    <div
      v-if="props.nodeTree.subtrees.length > 0"
      class="ml-4 flex flex-col gap-y-1 border-t border-gray-300 pt-1"
    >
      <TreeNode
        v-for="item in props.nodeTree.subtrees"
        :key="item.root.id"
        :web-page-map="props.webPageMap"
        :node-icon-map="props.nodeIconMap"
        :node-tree="item"
        class="not-first:border-t not-first:border-gray-300 not-first:pt-1"
      >
      </TreeNode>
    </div>
  </div>
</template>
