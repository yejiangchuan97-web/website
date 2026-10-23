# 三维铺砖实训：当前版本检查记录

日期：2026-10-23。对象：本目录 index.html / dark.html，由 src/hero.*、game.model.mjs、robot3d.js、scene3d.js 构建。此记录取代旧版 SVG 教学台的检查结论；旧记录保留作为历史。

## 已执行的检查

| 项目 | 结果与范围 |
| --- | --- |
| 状态与基础公式 | `node --test qa/hero-model.test.mjs qa/game-model.test.mjs qa/app-state.test.mjs`，33 项通过。新版操作模型 16 项；另含原基础模型及旧 app 的测试，旧 app 测试不代表新版 DOM 覆盖 |
| 三维几何关系 | `node qa/hero-geometry-check.mjs`，379 项通过。关节长度、可达性、杯唇平面、气管端口、试提翻转、卸载、重新接近、剖面自由行程及基层接触关系 |
| 桌面完整通关 | 1600 × 900，真实按钮操作：偏心试提失败→对中四盘成功→搬运→识别→遮挡→独立滑移→恢复视野→重新识别→纠偏→验收砖缝→落砖→力反馈压实→靠尺→卸载，最终 3/3 |
| 压实失败与恢复 | 初始浅压不能通过；目标力合适而基层高 2 mm 时完成面失败；过压记录跨页签保留；整备清除记录；重复确认不重播卸盘；重新接近时接触力为零 |
| 手机 | 390 × 844：场景、面板、试提失败/成功、自动返回场景、搬运、定位识别；未发现横向溢出。未声称真实触屏硬件测试或手机完整三关通关 |
| 深色 | 全景、近看、四盘接触、拆解、试提；开始试提自动重新装配；界面与场景主题一致 |
| 减少动态效果 | WebGL 与禁用 WebGL 两种模式均完成完整三关；离散试提/搬运/卸载及单步纠偏/下压可达同一结果 |
| 无 WebGL | 同一操作模型配二维备用图完成通关。注入禁用 WebGL 时 Three.js 报一次预期的 context 创建失败，备用页面继续正常工作 |
| 交互与异常 | 键盘转动、鼠标拖动通过；模拟 context loss 后停止作业推进、保持砖位、提示刷新，后续作业指令被保持 |
| 视觉 | 已逐张查看本轮生成的图片；检查浅/深主题全景、接触细节、拆解、偏心掀边、错缝/遮挡/恢复、压实剖面、卸盘成品和手机布局。4× 图包含浅色全工位、浅/深吸盘接触区及深色剖面 |
| 构建 | 仓库入口 `node scripts/build.mjs 6-2 --ui` 成功；浅/深 HTML 均内嵌 Three.js 与页面代码，可直接 file:// 打开 |

## 可复现的浏览器动作

使用 anatomy 技能的 `scripts/drive.mjs`，在本任务目录运行。例如：

```powershell
node C:/Users/Administrator/.codex/skills/anatomy/scripts/drive.mjs index.html --actions qa/hero-visual-actions.json --width 1600 --height 900
```

- `hero-visual-actions.json`：桌面完整三关。
- `hero-mobile-actions.json`：加 `--width 390 --height 844`。
- `hero-press-actions.json`：过浅、标高失败、过压及恢复。
- `hero-dark-actions.json`：目标改为 `dark.html`。
- `hero-reduced-actions.json`：加 `--reduced`。
- `hero-fallback-actions.json`：加 `--reduced --no-webgl`。
- `hero-inspect-actions.json`：全景、接触细节、键盘/拖动及 context loss。
- `hero-section-actions.json`：加 `--reduced`，复核基层高出时实际实体接触及高差。

浏览器自动化建议串行运行。本轮并行检查时有一次动画等待超时，单独重跑通过；未据此认定页面故障。测试展开可滚动面板后应先 scroll 目标按钮；之前有一次误点屏外按钮导致检查超时，修正动作后通过。Ego 浏览器页面可读取和操作，但截图接口多次超时，因此最终视觉与交互采用明确调用的 anatomy 离线 capture/drive 工具完成；不将该截图超时算作页面故障。收尾时原 Ego 检查空间已不存在，未新建或操作用户其他空间；最终构建的验证依据是上述 anatomy 浏览器结果。

## 主要图片

图片位于本地 `qa/hero-artifacts/`，为可重生成检查产物。

- `overview-light.png`、`overview-dark.png`：全工位及操作布局。
- `head-light.png`、`contact-light-4x.png`、`contact-dark-4x.png`：杯唇、接头、气管、弹性机构与砖面。
- `failed-lift.png`：偏心试提的掀边动作。
- `alignment-before.png`、`occluded-slip.png`、`alignment-after.png`：真实砖位与观测的区别。
- `section-pass.png`、`force-ok-height-wrong.png`、`overpressure.png`：压力与完成面分别判断。
- `completed-floor.png`：工具升起，砖保留在铺贴位，测力归零。
- `mobile-scene.png`、`mobile-controls.png`、`mobile-alignment.png`：手机场景、面板与识别。
- `fallback-section.png`：无 WebGL 的二维备用图。

## 验证边界

379 项几何检查不是全网格碰撞证明，未声称软管全过程无碰撞或完成 SVG Anatomy 审计。关节最大长度误差约 4.44e-16 m；正常接触杯唇最大平面误差约 2.78e-17 m。初始场景会裁去地面模型的部分外围以放大主体；近看与俯视也按教学目的裁切或隐去部分臂段。

本页不是厂商控制软件。F=kδ、吸盘支承区、压力下降比例、定位及压实窗口均为教学设定，不代表施工验收限值或真实砂浆/粘结预测。本轮尝试打开既有官方参考链接时网络检索服务连接失败，未声称重新核验厂商网页的当前内容。

