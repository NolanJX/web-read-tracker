import { defineConfig, presetWind4 } from "unocss";

export default defineConfig({
  presets: [presetWind4()],
  shortcuts: {
    "flex-center": "flex justify-center items-center",
    "flex-col-center": "flex flex-col justify-center items-center",
  },
});
