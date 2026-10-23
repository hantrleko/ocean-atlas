# 深海图鉴 · Ocean Atlas

博物馆式的海洋生物 3D 图鉴。用 Vite + Three.js 在浏览器里按科目（软骨鱼纲、辐鳍鱼纲、肉鳍鱼纲、鲸目、龟鳖目、头足纲、刺胞动物、栉水母、甲壳类、棘皮动物）浏览三十三种物种，旋转、缩放并阅读。网格模型在 `public/models/*.glb`。窄屏用左侧抽屉和底部详情面板。

静态 GLB 在运行时叠加程序化活体运动（`src/aliveMotion.js`）：按物种做顶点起伏，并带有起伏、偏航和姿态循环。每种生物会按程序循环切换具名行为（狩猎、求偶、觅食、诱捕、隐匿、展示、跃出等），并加大俯仰、横滚以及振幅与频率调制。画布下方的行为标签可锁定当前物种的具名姿态，或回到自动循环。

每种物种有自己的取景（`src/framing.js`：距离、视野、目标点）。甘氏巨螯蟹、多棘海盘车、雀尾螳螂虾、大王具足虫、紫海胆沿用原来的共享机位。

右下角「潜水员」打开比例对比：旁边站一名身高 **1.75 米** 的低面潜水员，物种按 `src/sizes.js` 里的成体典型尺寸缩放（全长、壳径、伞径、翼展、腿展等）。尺寸依据 FishBase 常见体长、NOAA Fisheries、IUCN 与 Smithsonian Ocean / FAO 的成体描述，不是纪录极值。狮鬃水母按伞径（模型里的触手是缩短的），僧帽水母按浮囊长。

窄屏只下载当前物种的 GLB，切换后卸掉上一个；桌面仍会预取下一种。环境与环境音按栖息地分开：深海、暮光带、浅海珊瑚礁、开阔大洋、海面、近岸底栖、深海底栖、近岸浅海。

海马、真蛸、大王乌贼、多棘海盘车已换上加大振幅的骨骼剪辑，行为 id 与剪辑名一致（海马 grip / brood / sip / dance，真蛸 camouflage / ink / squeeze / probe，大王乌贼 lunge / jet / duel，海盘车 crawl / evert / regenerate）。抹香鲸「喀哒定位」仍几乎不动，页面额外带动下颌。本仓库没有 blend 文件。

线上站点：https://hantrleko.github.io/ocean-atlas/

```bash
npm ci
npm run dev      # 本地预览
npm run build    # 输出 dist/
```

`vite.config.js` 已设置 `base: './'`，构建结果可直接作为 GitHub Pages 项目站点的根目录。预构建站点在 `gh-pages` 分支根目录（`index.html`、`assets/`、`models/*.glb`、`.nojekyll`）。

仓库管理员打开 [Settings → Pages](https://github.com/hantrleko/ocean-atlas/settings/pages)，Source 选 **Deploy from a branch**，分支 **gh-pages**，目录 **/ (root)**，保存。保存后 https://hantrleko.github.io/ocean-atlas/ 才会开始发布。
