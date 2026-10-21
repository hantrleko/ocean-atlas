# 深海图鉴 · Ocean Atlas

博物馆式的海洋生物 3D 图鉴。用 Vite + Three.js 在浏览器里旋转、缩放并阅读十一种物种（小飞象章鱼、鮟鱇鱼、吸血鬼乌贼、桶眼鱼、宽咽鱼、鹦鹉螺、海月水母、僧帽水母、座头鲸、绿海龟、无沟双髻鲨）。网格模型在 `public/models/*.glb`。窄屏用左侧抽屉和底部详情面板。

静态 GLB 在运行时叠加程序化活体运动（`src/aliveMotion.js`）：按物种做顶点起伏，并带有起伏、偏航和姿态循环。每种生物会按程序循环切换具名行为（狩猎、求偶、觅食、诱捕、隐匿、展示、跃出等），并加大俯仰、横滚以及振幅与频率调制。

线上站点：https://hantrleko.github.io/ocean-atlas/

```bash
npm ci
npm run dev      # 本地预览
npm run build    # 输出 dist/
```

`vite.config.js` 已设置 `base: './'`，构建结果可直接作为 GitHub Pages 项目站点的根目录。预构建站点在 `gh-pages` 分支根目录（`index.html`、`assets/`、`models/*.glb`、`.nojekyll`）。

仓库管理员打开 [Settings → Pages](https://github.com/hantrleko/ocean-atlas/settings/pages)，Source 选 **Deploy from a branch**，分支 **gh-pages**，目录 **/ (root)**，保存。保存后 https://hantrleko.github.io/ocean-atlas/ 才会开始发布。
