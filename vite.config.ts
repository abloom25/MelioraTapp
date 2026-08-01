import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 产物即 Tapp 包:单文件 main.js + styles.css 输出到包根(manifest.main / styles 指向)。
// 沙箱 CSP 不放行外部脚本与字体,所有依赖必须内联进 bundle。
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '.',
    emptyOutDir: false,
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/main.ts',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'main.js',
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.endsWith('.css') ? 'styles.css' : 'assets/[name][extname]',
      },
    },
  },
})
