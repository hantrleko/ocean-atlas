# 深海图鉴 · Ocean Atlas

博物馆式的海洋生物 3D 图鉴。用 Vite + Three.js 在浏览器里旋转、缩放并阅读十一种物种（小飞象章鱼、鮟鱇鱼、吸血鬼乌贼、桶眼鱼、宽咽鱼、鹦鹉螺、海月水母、僧帽水母、座头鲸、绿海龟、无沟双髻鲨）。网格模型在 `public/models/*.glb`。

线上站点：https://hantrleko.github.io/ocean-atlas/

```bash
npm ci
npm run dev      # 本地预览
npm run build    # 输出 dist/
```

`vite.config.js` 已设置 `base: './'`，构建结果可直接作为 GitHub Pages 项目站点的根目录。Pages 从 `gh-pages` 分支的 `/` 发布。
