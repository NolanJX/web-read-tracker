import { createApp } from "vue";
import { type Favicon } from "@/utils/favicon";
import { type Status } from "@/utils/web-page";
import App from "@/components/WebPageEditor.vue";

interface PopupMessage {
  favicon: Favicon;
  webPage: {
    url: string;
    title: string;
    status: Status;
    readCount: number;
    hasIncrementedReadCount: boolean;
  };
}

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    let popupMessage!: PopupMessage;

    const ui = await createShadowRootUi(ctx, {
      name: "web-page-editor",
      position: "modal",
      zIndex: 2 ** 31 - 1,
      onMount: (container) => {
        const app = createApp(App, {
          initialFavicon: popupMessage.favicon,
          url: popupMessage.webPage.url,
          title: popupMessage.webPage.title,
          initialStatus: popupMessage.webPage.status,
          initialReadCount: popupMessage.webPage.readCount,
          initialHasIncrementedReadCount:
            popupMessage.webPage.hasIncrementedReadCount,
        });
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });

    browser.runtime.onMessage.addListener((message: PopupMessage) => {
      popupMessage = message;
      ui.mount();
    });
  },
});
