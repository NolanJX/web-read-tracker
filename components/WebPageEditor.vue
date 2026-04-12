<script lang="ts" setup>
import { ref } from "vue";
import "virtual:uno.css";
import { type Favicon } from "@/utils/favicon";
import { type Status } from "@/utils/web-page";

const props = defineProps<{
  initialFavicon: Favicon;
  url: string;
  title: string;
  initialStatus: Status;
  initialReadCount: number;
  initialHasIncrementedReadCount: boolean;
}>();

// favicon
const favicon = ref<Favicon>(props.initialFavicon);
</script>

<template>
  <div class="flex-col-center fixed inset-0">
    <div class="flex-center rounded">
      <img v-if="favicon.data" :src="favicon.data" alt="" />
      <span v-else>📄</span>
    </div>
  </div>
</template>
