import { createRootNode } from "@/utils/node";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== "install") return;
    await createRootNode();
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "fetchFavicon") {
      const url = message.url;

      fetch(url)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            sendResponse({ url, data: reader.result as string });
          };
          reader.onerror = () => {
            sendResponse({ url, data: "" });
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          sendResponse({ url, data: "" });
        });

      return true;
    }
  });
});
