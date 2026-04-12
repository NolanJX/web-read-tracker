<script lang="ts" setup>
import { ref, onMounted, toRaw, computed } from "vue";
import { type Browser, browser } from "wxt/browser";
import {
  type Favicon,
  findFavicon,
  fetchFavicon,
  saveFavicon,
} from "@/utils/favicon";
import {
  type Status,
  STATUSES,
  findWebPage,
  saveWebPage,
} from "@/utils/web-page";
import {
  type Node,
  ROOT_ID,
  findWebPageNodesByUrl,
  findAllNodes,
  saveWebPageNode,
  saveNode,
} from "@/utils/node";

let tab!: Browser.tabs.Tab;
const isReadLayout = ref(false);

// favicon
const favicon = ref<Favicon>({ src: "", data: "" });

// webPage
let url = "";
let title = "";
const status = ref<Status>("read");
const readCount = ref(0);

const hasIncrementedReadCount = ref(false);
const displayReadCount = computed(() => {
  if (hasIncrementedReadCount.value) {
    return `${readCount.value - 1} + 1`;
  }
  return `${readCount.value}`;
});

// nodes
const nodes = ref<Node[]>([]);

onMounted(async () => {
  await loadCurTab();

  url = cleanUrl(tab.url!);
  title = tab.title!;

  const domain = resolveDomain(url);
  const existingFavicon = await findFavicon(domain);

  if (existingFavicon !== undefined) {
    favicon.value = existingFavicon;
  } else {
    favicon.value = await fetchFavicon(tab.favIconUrl!);
  }

  const existingWebPage = await findWebPage(url);

  if (existingWebPage) {
    status.value = existingWebPage.status;
    readCount.value = existingWebPage.readCount;

    if (existingWebPage.status === "read") {
      isReadLayout.value = true;
    }

    nodes.value = await findWebPageNodesByUrl(url);
  }
});

async function loadCurTab() {
  [tab] = await browser.tabs.query({ currentWindow: true, active: true });
}

function cleanUrl(url: string) {
  const { origin, pathname } = new URL(url);
  return `${origin}${pathname}`;
}

function resolveDomain(url: string) {
  return new URL(url).hostname;
}

function handlerCancel() {
  window.close();
}

async function handlerConfirm() {
  if (favicon.value.data) {
    const domain = resolveDomain(url);
    await saveFavicon(domain, toRaw(favicon.value));
  }

  if (status.value === "read" && readCount.value === 0) {
    readCount.value = 1;
  }

  await saveWebPage({
    url: url,
    title: title,
    status: status.value,
    readCount: readCount.value,
  });

  if (nodes.value.length === 0) {
    const existingNodes = await findAllNodes();
    const rootChildren = existingNodes.filter((n) => n.parentId === ROOT_ID);

    const node = await saveWebPageNode({
      name: title,
      parentId: ROOT_ID,
      order: rootChildren.length,
      webPageUrl: url,
    });
    nodes.value.push(node);
  }

  for (const node of nodes.value) {
    await saveNode(node);
  }

  window.close();
}

function handlerIncrReadCount() {
  ++readCount.value;
  hasIncrementedReadCount.value = true;
}

async function handlerShowMore() {
  await browser.tabs.sendMessage(tab.id!, {
    favicon: toRaw(favicon.value),
    webPage: {
      url: url,
      title: title,
      status: status.value,
      readCount: readCount.value,
      hasIncrementedReadCount: hasIncrementedReadCount.value,
    },
  });

  window.close();
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Read Status Layout -->
    <template v-if="isReadLayout">
      <!-- Main Panel -->
      <div class="flex">
        <!-- Left Icon Section -->
        <div class="flex-center rounded">
          <img v-if="favicon.data" :src="favicon.data" alt="" />
          <span v-else>📄</span>
        </div>
        <!-- Right Form Section -->
        <div class="flex flex-1 flex-col">
          <div class="flex items-center">
            <label class="text-sm" for="title">Title</label>
            <input :value="title" id="title" class="flex-1 rounded" readonly />
          </div>
          <span class="text-sm">
            Read {{ displayReadCount }} times in total
          </span>
        </div>
      </div>
      <!-- Action Bar -->
      <div class="flex justify-end">
        <button
          @click="handlerIncrReadCount"
          :disabled="hasIncrementedReadCount"
          class="rounded border disabled:opacity-50"
        >
          +1
        </button>
        <button @click="handlerCancel" class="rounded border">Cancel</button>
        <button @click="handlerConfirm" class="rounded border">Confirm</button>
      </div>
      <!-- Navigation Bar -->
      <div class="flex">
        <button @click="handlerShowMore" class="w-full rounded border">
          More
        </button>
      </div>
    </template>

    <!-- Non-read Status Layout -->
    <template v-else>
      <!-- Main Panel -->
      <div class="flex">
        <!-- Left Icon Section -->
        <div class="flex-center rounded">
          <img v-if="favicon.data" :src="favicon.data" alt="" />
          <span v-else>📄</span>
        </div>
        <!-- Right Form Section -->
        <div class="flex flex-1 flex-col">
          <div class="flex items-center">
            <label class="text-sm" for="title">Title</label>
            <input :value="title" id="title" class="flex-1 rounded" readonly />
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
      </div>
      <!-- Action Bar -->
      <div class="flex justify-end">
        <button @click="handlerCancel" class="rounded border">Cancel</button>
        <button @click="handlerConfirm" class="rounded border">Confirm</button>
      </div>
      <!-- Navigation Bar -->
      <div class="flex">
        <button @click="handlerShowMore" class="w-full rounded border">
          More
        </button>
      </div>
    </template>
  </div>
</template>
