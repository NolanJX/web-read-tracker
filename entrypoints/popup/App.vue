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
  ROOT_ID,
  existsWebPageNodeByUrl,
  findAllNodes,
  saveWebPageNode,
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

let linkedNodeExists = false;

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

    linkedNodeExists = await existsWebPageNodeByUrl(url);
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

function handleCancel() {
  window.close();
}

async function handleConfirm() {
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

  if (!linkedNodeExists) {
    const nodes = await findAllNodes();
    const rootChildren = nodes.filter((n) => n.parentId === ROOT_ID);

    await saveWebPageNode({
      name: title,
      parentId: ROOT_ID,
      order: rootChildren.length,
      webPageUrl: url,
    });
  }

  window.close();
}

function handleIncrReadCount() {
  ++readCount.value;
  hasIncrementedReadCount.value = true;
}

async function handleShowMore() {
  await browser.tabs.sendMessage(tab.id!, {
    isReadLayout: isReadLayout.value,
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

function handleViewList() {
  window.open(browser.runtime.getURL("/list.html"));
  window.close();
}
</script>

<template>
  <div class="m-3 flex flex-col gap-y-4 p-3">
    <!-- Main Panel -->
    <div class="flex gap-x-4">
      <!-- Left Icon Section -->
      <div
        class="flex-center outline-blue h-16 w-16 shrink-0 rounded outline-2"
      >
        <img
          v-if="favicon.data"
          :src="favicon.data"
          alt=""
          class="h-full w-full object-contain"
        />
        <span v-else class="text-4xl">📄</span>
      </div>
      <!-- Right Form Section -->
      <div class="flex flex-1 flex-col gap-y-2">
        <div class="flex items-center gap-x-2">
          <label class="text-base" for="title">Title</label>
          <input
            :value="title"
            id="title"
            class="flex-1 rounded text-sm"
            readonly
          />
        </div>
        <span v-if="isReadLayout" class="text-base">
          Read {{ displayReadCount }} times in total
        </span>
        <div v-else class="flex items-center gap-x-2">
          <span class="text-base">Status</span>
          <div class="flex justify-evenly gap-x-2">
            <label v-for="item in STATUSES" :key="item" class="text-sm">
              <input v-model="status" :value="item" type="radio" />
              {{ item }}
            </label>
          </div>
        </div>
      </div>
    </div>
    <!-- Action Bar -->
    <div class="flex justify-between">
      <div class="flex gap-x-2">
        <button @click="handleViewList" class="rounded border text-base">
          View List
        </button>
        <button @click="handleShowMore" class="rounded border text-base">
          More
        </button>
      </div>
      <div class="flex gap-x-2">
        <button
          v-if="isReadLayout"
          @click="handleIncrReadCount"
          :disabled="hasIncrementedReadCount"
          class="rounded border text-base disabled:opacity-50"
        >
          +1
        </button>
        <button @click="handleCancel" class="rounded border text-base">
          Cancel
        </button>
        <button @click="handleConfirm" class="rounded border text-base">
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>
