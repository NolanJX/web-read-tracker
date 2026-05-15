<script lang="ts" setup>
import { ref, computed, toRaw, reactive, onMounted } from "vue";
import "virtual:uno.css";
import { type Favicon, saveFavicon, findFavicon } from "@/utils/favicon";
import { type Status, STATUSES, saveWebPage } from "@/utils/web-page";
import {
  type Node,
  type FlatTreeNode,
  type NodeIcon,
  ROOT_ID,
  buildNodeTree,
  flattenNodeTree,
  findAllNodes,
  saveManyNodes,
  resolveNodeIcons,
} from "@/utils/node";

const props = defineProps<{
  initialIsReadLayout: boolean;
  initialFavicon: Favicon;
  url: string;
  title: string;
  initialStatus: Status;
  initialReadCount: number;
  initialHasIncrementedReadCount: boolean;
  onClose: () => void;
}>();

const isReadLayout = ref(props.initialIsReadLayout);
const isSaving = ref(false);

// favicon
const favicon = ref<Favicon>(props.initialFavicon);

// webPage
const status = ref<Status>(props.initialStatus);
const readCount = ref(props.initialReadCount);

const hasIncrementedReadCount = ref(props.initialHasIncrementedReadCount);
const displayReadCount = computed(() => {
  if (hasIncrementedReadCount.value) {
    return `${readCount.value - 1} + 1`;
  }
  return `${readCount.value}`;
});

// nodes
const root = ref<Node | undefined>();
const nodes = ref<Node[]>([]);
const newNodeIds = reactive(new Set<string>());

const flatTreeNodes = computed<FlatTreeNode[]>(() => {
  if (root.value === undefined) return [];
  const nodeTree = buildNodeTree(root.value, nodes.value);
  return flattenNodeTree(nodeTree);
});

const nodeIconMap = reactive(new Map<string, NodeIcon>());
const nodeDivMap = new Map<string, HTMLDivElement>();

onMounted(async () => {
  nodes.value = await findAllNodes();
  root.value = nodes.value.find((node) => node.id === ROOT_ID)!;

  const nodeIcons = await resolveNodeIcons(nodes.value);
  nodeIcons.forEach((nodeIcon, nodeId) => nodeIconMap.set(nodeId, nodeIcon));

  scrollToSameDomainNode();
});

function resolveDomain(url: string) {
  return new URL(url).hostname;
}

function extractMainDomain(hostname: string) {
  const splits = hostname.split(".");
  return splits.slice(-2).join(".");
}

function scrollToSameDomainNode() {
  const domain = resolveDomain(props.url);
  const mainDomain = extractMainDomain(domain);

  const matched = flatTreeNodes.value.find((flatTreeNode) => {
    if (flatTreeNode.node.parentId !== ROOT_ID) return false;
    if (flatTreeNode.node.type === "Domain")
      return extractMainDomain(flatTreeNode.node.domain) === mainDomain;
    if (flatTreeNode.node.type === "WebPage")
      return (
        extractMainDomain(resolveDomain(flatTreeNode.node.webPageUrl)) ===
        mainDomain
      );
    return false;
  });
  if (matched === undefined) return;

  const el = nodeDivMap.get(matched.node.id)!;
  el.scrollIntoView();
}

function existsLinkedNode(nodes: Node[]) {
  return nodes.some(
    (node) => node.type === "WebPage" && node.webPageUrl === props.url,
  );
}

function findAllDescendantNodeIds(nodeId: string): string[] {
  const children = nodes.value.filter((node) => node.parentId === nodeId);
  return children.flatMap((child) => [
    child.id,
    ...findAllDescendantNodeIds(child.id),
  ]);
}

function handleCancel() {
  props.onClose();
}

async function handleConfirm() {
  if (isSaving.value) return;
  isSaving.value = true;

  if (!existsLinkedNode(nodes.value)) {
    showMissingLinkedNodeTip.value = true;
    setTimeout(() => (showMissingLinkedNodeTip.value = false), 5000);

    isSaving.value = false;
    return;
  }

  console.time("[WebPageEditor] handleConfirm");

  if (favicon.value.data) {
    const domain = resolveDomain(props.url);
    const existing = await findFavicon(domain);

    if (existing === undefined) {
      console.time("[WebPageEditor] saveFavicon");
      await saveFavicon(domain, toRaw(favicon.value));
      console.timeEnd("[WebPageEditor] saveFavicon");
    }
  }

  if (status.value === "read" && readCount.value === 0) {
    readCount.value = 1;
  }

  console.time("[WebPageEditor] saveWebPage");
  await saveWebPage({
    url: props.url,
    title: props.title,
    status: status.value,
    readCount: readCount.value,
  });
  console.timeEnd("[WebPageEditor] saveWebPage");

  console.time("[WebPageEditor] saveManyNodes");
  await saveManyNodes(nodes.value);
  console.timeEnd("[WebPageEditor] saveManyNodes");

  console.timeEnd("[WebPageEditor] handleConfirm");

  isSaving.value = false;
  props.onClose();
}

function handleIncrReadCount() {
  ++readCount.value;
  hasIncrementedReadCount.value = true;
}

function handleCreateChildNode(nodeId: string) {
  newNode.value.name = props.title;
  newNode.value.parentId = nodeId;
  newNode.value.type = "WebPage";

  showCreateDialog.value = true;
}

function handleDeleteNode(nodeId: string) {
  const idsToDelete = [nodeId, ...findAllDescendantNodeIds(nodeId)];
  nodes.value = nodes.value.filter((node) => !idsToDelete.includes(node.id));
  for (const id of idsToDelete) {
    newNodeIds.delete(id);
    nodeIconMap.delete(id);
  }
}

function handleCreateVirtualNode() {
  const siblingNodes = nodes.value.filter(
    (n) => n.parentId === newNode.value.parentId,
  );
  const order = siblingNodes.length;

  const now = Date.now();
  const base = {
    id: crypto.randomUUID(),
    name: newNode.value.name,
    parentId: newNode.value.parentId,
    order: order,
    createdAt: now,
    updatedAt: now,
    type: newNode.value.type,
  };

  let node!: Node;
  let nodeIcon!: NodeIcon;

  switch (newNode.value.type) {
    case "Folder":
      node = { ...base, type: "Folder" };
      nodeIcon = { type: "text", data: "📁" };
      break;
    case "Domain":
      node = { ...base, type: "Domain", domain: resolveDomain(props.url) };
      nodeIcon = favicon.value.data
        ? { type: "img", data: favicon.value.data }
        : { type: "text", data: "🌐" };
      break;
    case "WebPage":
      node = { ...base, type: "WebPage", webPageUrl: props.url };
      nodeIcon = favicon.value.data
        ? { type: "img", data: favicon.value.data }
        : { type: "text", data: "📄" };
      break;
  }

  nodes.value.push(node);
  newNodeIds.add(node.id);
  nodeIconMap.set(node.id, nodeIcon);

  showCreateDialog.value = false;
}

// UI
const showCreateDialog = ref(false);
const showMissingLinkedNodeTip = ref(false);
const newNode = ref<Pick<Node, "name" | "parentId" | "type">>({
  name: "",
  parentId: ROOT_ID,
  type: "WebPage",
});
</script>

<template>
  <div class="flex-center fixed inset-0">
    <div class="flex max-h-3/4 w-2/5 flex-col rounded border bg-white">
      <!-- Title Bar -->
      <div class="flex items-center justify-between border-b">
        <span class="text-sm">Web Page Editor</span>
        <button @click="handleCancel" class="text-sm">&times;</button>
      </div>

      <!-- Web Page Panel -->
      <div class="flex border-b">
        <!-- Read Status Layout -->
        <template v-if="isReadLayout">
          <!-- Left Icon Section -->
          <div class="flex-center rounded">
            <img
              v-if="favicon.data"
              :src="favicon.data"
              alt=""
              class="h-4 w-4"
            />
            <span v-else>📄</span>
          </div>
          <!-- Right Form Section -->
          <div class="flex flex-1 flex-col">
            <div class="flex items-center">
              <label class="text-sm" for="title">Title</label>
              <input
                :value="title"
                id="title"
                class="flex-1 rounded"
                readonly
              />
            </div>
            <div class="flex justify-between">
              <span class="text-sm">
                Read {{ displayReadCount }} times in total
              </span>
              <button
                @click="handleIncrReadCount"
                :disabled="hasIncrementedReadCount"
                class="rounded border disabled:opacity-50"
              >
                +1
              </button>
            </div>
          </div>
        </template>

        <!-- Non-read Status Layout -->
        <template v-else>
          <!-- Left Icon Section -->
          <div class="flex-center rounded">
            <img
              v-if="favicon.data"
              :src="favicon.data"
              alt=""
              class="h-4 w-4"
            />
            <span v-else>📄</span>
          </div>
          <!-- Right Form Section -->
          <div class="flex flex-1 flex-col">
            <div class="flex items-center">
              <label class="text-sm" for="title">Title</label>
              <input
                :value="title"
                id="title"
                class="flex-1 rounded"
                readonly
              />
            </div>
            <div class="flex items-center">
              <span class="text-sm">Status</span>
              <div class="flex justify-evenly">
                <label v-for="item in STATUSES" :key="item">
                  <input v-model="status" :value="item" type="radio" />
                  {{ item }}
                </label>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Node Tree -->
      <div class="overflow-y-auto border-b pr-4">
        <div
          v-for="item in flatTreeNodes"
          :key="item.node.id"
          :ref="(el) => nodeDivMap.set(item.node.id, el as HTMLDivElement)"
          :style="{ marginLeft: `${item.depth}rem` }"
          class="flex justify-between"
          :class="{ 'bg-gray': newNodeIds.has(item.node.id) }"
        >
          <div class="flex min-w-0 items-center">
            <img
              v-if="nodeIconMap.get(item.node.id)?.type === 'img'"
              :src="nodeIconMap.get(item.node.id)!.data"
              alt=""
              class="h-4 w-4"
            />
            <span v-else>{{ nodeIconMap.get(item.node.id)?.data }}</span>
            <span :title="item.node.name" class="truncate text-sm">
              {{ item.node.name }}
            </span>
          </div>
          <div class="flex">
            <button @click="handleCreateChildNode(item.node.id)">+</button>
            <button
              v-if="newNodeIds.has(item.node.id)"
              @click="handleDeleteNode(item.node.id)"
            >
              &times;
            </button>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex items-center justify-end">
        <span v-if="showMissingLinkedNodeTip" class="text-red text-sm">
          At least one linked node required
        </span>
        <button @click="handleCancel" class="rounded border">Cancel</button>
        <button @click="handleConfirm" class="rounded border">Confirm</button>
      </div>

      <!-- New Node Dialog -->
      <div v-if="showCreateDialog" class="flex-center fixed inset-0 z-1">
        <div class="flex flex-col rounded border bg-white">
          <div class="flex items-center justify-between border-b">
            <span class="text-sm">New Node</span>
            <button @click="showCreateDialog = false" class="text-sm">
              &times;
            </button>
          </div>
          <div class="flex items-center text-sm">
            <select v-model="newNode.type">
              <option value="Folder">Folder</option>
              <option value="Domain">Domain</option>
              <option value="WebPage">WebPage</option>
            </select>
            <input v-model="newNode.name" class="flex-1 rounded border" />
          </div>
          <div class="flex justify-end">
            <button @click="showCreateDialog = false">Cancel</button>
            <button
              @click="handleCreateVirtualNode"
              :disabled="!newNode.name.trim()"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
