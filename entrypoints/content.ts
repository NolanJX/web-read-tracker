import { createApp } from "vue";
import { type Favicon } from "@/utils/favicon";
import { type Status } from "@/utils/web-page";
import App from "@/components/WebPageEditor.vue";

interface PopupMessage {
  isReadLayout: boolean;
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
    const zIndex = 2 ** 31 - 1;
    let popupMessage!: PopupMessage;

    const ui = await createShadowRootUi(ctx, {
      name: "web-page-editor",
      position: "modal",
      zIndex: zIndex,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onMount: (container, shadow, shadowHost) => {
        (shadow.firstElementChild as HTMLElement).style.zIndex = String(zIndex);

        const app = createApp(App, {
          initialIsReadLayout: popupMessage.isReadLayout,
          initialFavicon: popupMessage.favicon,
          url: popupMessage.webPage.url,
          title: popupMessage.webPage.title,
          initialStatus: popupMessage.webPage.status,
          initialReadCount: popupMessage.webPage.readCount,
          initialHasIncrementedReadCount:
            popupMessage.webPage.hasIncrementedReadCount,
          onClose: () => ui.remove(),
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
