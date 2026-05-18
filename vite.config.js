import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    base: "./",
    plugins: [react()],
    server: {
        host: "0.0.0.0",
    },
    build: {
        // lark SDK 内部打包了 antd 组件（UIBuilder 依赖），体积不可控，调高阈值
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            external: ["#minpath", "#minproc", "#minurl"],
            output: {
                manualChunks: {
                    // React 核心单独拆分，缓存友好
                    "vendor-react": ["react", "react-dom"],
                    // Semi UI 组件库单独拆分
                    "vendor-semi": ["@douyinfe/semi-ui", "@douyinfe/semi-foundation"],
                    // 飞书 SDK 单独拆分（内含 antd 组件，约 800KB，无法 tree-shake）
                    "vendor-lark": ["@lark-base-open/js-sdk"],
                },
            },
        },
    },
});
