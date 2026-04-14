<script lang="ts" setup>
import { ref, computed, toRaw, reactive, watchEffect, onMounted } from "vue";
import "virtual:uno.css";
import { type Favicon, saveFavicon, findFavicon } from "@/utils/favicon";
import { type Status, STATUSES, saveWebPage } from "@/utils/web-page";
import {
  type Node,
  type FlatTreeNode,
  ROOT_ID,
  buildNodeTree,
  flattenNodeTree,
  findAllNodes,
  saveNode,
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

const flatTreeNodes = computed<FlatTreeNode[]>(() => {
  if (root.value === undefined) return [];
  const nodeTree = buildNodeTree(root.value, nodes.value);
  return flattenNodeTree(nodeTree);
});

type NodeIcon = { type: "text"; data: string } | { type: "img"; data: string };
const nodeIconMap = reactive(new Map<string, NodeIcon>());

watchEffect(() => {
  for (const item of flatTreeNodes.value) {
    if (!nodeIconMap.has(item.node.id)) {
      resolveNodeIcon(item.node).then((nodeIcon) =>
        nodeIconMap.set(item.node.id, nodeIcon),
      );
    }
  }
});

onMounted(async () => {
  nodes.value = await findAllNodes();
  root.value = nodes.value.find((n) => n.id === ROOT_ID)!;
});

function resolveDomain(url: string) {
  return new URL(url).hostname;
}

function handleCancel() {
  props.onClose();
}

async function handleConfirm() {
  if (favicon.value.data) {
    const domain = resolveDomain(props.url);
    await saveFavicon(domain, toRaw(favicon.value));
  }

  if (status.value === "read" && readCount.value === 0) {
    readCount.value = 1;
  }

  await saveWebPage({
    url: props.url,
    title: props.title,
    status: status.value,
    readCount: readCount.value,
  });

  for (const node of nodes.value) {
    await saveNode(node);
  }

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

  switch (newNode.value.type) {
    case "Folder":
      node = { ...base, type: "Folder" };
      break;
    case "Domain":
      node = { ...base, type: "Domain", domain: resolveDomain(props.url) };
      break;
    case "WebPage":
      node = { ...base, type: "WebPage", webPageUrl: props.url };
      break;
  }

  nodes.value.push(node);
  showCreateDialog.value = false;
}

// UI
const showCreateDialog = ref(false);
const newNode = ref<Pick<Node, "name" | "parentId" | "type">>({
  name: "",
  parentId: ROOT_ID,
  type: "WebPage",
});

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
</script>

<template>
  <div class="flex-center fixed inset-0">
    <div class="flex flex-col rounded border bg-white">
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
            <img v-if="favicon.data" :src="favicon.data" alt="" />
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
            <img v-if="favicon.data" :src="favicon.data" alt="" />
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
      <div class="border-b">
        <div
          v-for="item in flatTreeNodes"
          :key="item.node.id"
          :style="{ marginLeft: `${item.depth}rem` }"
          class="flex justify-between"
        >
          <div class="flex items-center">
            <img
              v-if="nodeIconMap.get(item.node.id)?.type === 'img'"
              :src="nodeIconMap.get(item.node.id)!.data"
              alt=""
              class="h-4 w-4"
            />
            <span v-else>{{ nodeIconMap.get(item.node.id)?.data }}</span>
            <span class="text-sm">{{ item.node.name }}</span>
          </div>
          <div class="flex">
            <button @click.stop="handleCreateChildNode(item.node.id)">+</button>
            <button>&times;</button>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex justify-end">
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
