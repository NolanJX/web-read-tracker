import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ["storage", "tabs"],
    browser_specific_settings: {
      gecko: {
        id: "web-read-tracker@example.org",
      },
    },
  },
  modules: ["@wxt-dev/module-vue", "@wxt-dev/unocss"],
  unocss: {
    excludeEntrypoints: ["background"],
  },
});
