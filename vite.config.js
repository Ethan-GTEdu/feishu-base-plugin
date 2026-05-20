import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite 插件：解析 vfile 的 Node.js subpath imports (#minpath, #minproc, #minurl)
 * vfile@6 使用了 package.json "imports" 字段做条件导出，Vite 3 / Rollup 2 不支持，
 * 这里手动将 #min* 解析到对应的浏览器版本文件。
 */
function resolveVfileImports() {
    // 在 node_modules 中查找 vfile 的实际位置
    const candidates = [
        // pnpm
        "node_modules/.pnpm/vfile@6.0.3/node_modules/vfile",
        // npm / yarn hoisted
        "node_modules/vfile",
    ];

    let vfileDir = "";
    for (const c of candidates) {
        const abs = path.resolve(__dirname, c);
        if (fs.existsSync(path.join(abs, "lib/minpath.browser.js"))) {
            vfileDir = abs;
            break;
        }
    }

    // 如果都找不到，尝试递归搜索
    if (!vfileDir) {
        const pnpmDir = path.resolve(__dirname, "node_modules/.pnpm");
        if (fs.existsSync(pnpmDir)) {
            const entries = fs.readdirSync(pnpmDir);
            for (const entry of entries) {
                if (entry.startsWith("vfile@")) {
                    const candidate = path.join(pnpmDir, entry, "node_modules/vfile");
                    if (fs.existsSync(path.join(candidate, "lib/minpath.browser.js"))) {
                        vfileDir = candidate;
                        break;
                    }
                }
            }
        }
    }

    const mapping = {
        "#minpath": "lib/minpath.browser.js",
        "#minproc": "lib/minproc.browser.js",
        "#minurl": "lib/minurl.browser.js",
    };

    return {
        name: "resolve-vfile-subpath-imports",
        resolveId(source) {
            if (mapping[source] && vfileDir) {
                return path.join(vfileDir, mapping[source]);
            }
            return null;
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    base: "/",
    plugins: [resolveVfileImports(), react()],
    server: {
        host: "0.0.0.0",
    },
    build: {
        // lark SDK 内部打包了 antd 组件（UIBuilder 依赖），体积不可控，调高阈值
        chunkSizeWarningLimit: 900,
        rollupOptions: {
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
