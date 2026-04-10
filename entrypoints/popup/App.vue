<script lang="ts" setup>
import { ref, onMounted, toRaw } from "vue";
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

let tab: Browser.tabs.Tab | undefined;

// favicon
const favicon = ref<Favicon>({ src: "", data: "" });

// webPage
let url = "";
let title = "";
const status = ref<Status>("read");

onMounted(async () => {
  await loadCurTab();

  if (tab) {
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
    }
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

  await saveWebPage({
    url: url,
    title: title,
    status: status.value,
    readCount: status.value === "read" ? 1 : 0,
  });

  window.close();
}
</script>

<template>
  <div class="flex flex-col">
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
          <input :value="title" class="flex-1 rounded" readonly />
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
  </div>
</template>
