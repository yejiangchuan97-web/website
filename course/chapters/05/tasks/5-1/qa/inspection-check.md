# 现场检查台组件检查

2026-10-22。模块入口为 `src/inspection.js`，所有图形内联，无网络和 WebGL 依赖。

## 图形与模型

- Anatomy kit 生成 43 个有体积的零件：4 个胶脚、4 个轴套、2 根底部支承梁、1 块模板、4 根边框、8 个垫圈、8 个螺钉头、6 个垫块、6 根钢筋。
- `node qa/build-inspection-fixture.mjs` 可重新生成 `FIGURE` 数据并保留交互代码。依赖已安装的 Anatomy skill；可用 `ANATOMY_SKILL_DIR` 指定位置。
- 实际执行了 `A.settle`、`A.audit` 和 `A.auditOrExit`：43 solids / 43 items / 132 order rules，输出 `audit passed`；支撑、穿插、深度顺序、stand-in、wobble 等检查均为 0。
- 审计范围为静态 kit 实体。绑丝为 SVG 表面标记，动态卷尺和局部剖面另按同一数值模型绘制，不声称它们接受了全动态几何审计。
- 图示模型每世界单位对应 4 mm；钢筋直径 16 mm；下层中心高度 50 mm，故外缘至模板为 42 mm；两根被量钢筋中心距为 480 mm，设计比较值为 400 mm。这些均明确标成教学设定。

## 已执行的功能检查

- 在离线预览页完成 `missing / spacing / cover / loose` 四项动作；回调依次获得四个 ID，未使用文字选择题。
- 漏绑位置以现场交点点击标记；量尺读数为 480 mm；切剖面后放置垫块，读数为 42 mm；松扣观察只记录“待人工检查”。
- 开启 reduced-motion 后重复四动作，状态与回调正确。
- 390 px 宽度检查：`documentElement.scrollWidth === innerWidth === 390`，按钮可容纳，工具栏自动换行。
- 销毁、重新创建两次，各触发一次完成操作：回调次数为 2；未残留旧实例点击或键盘监听。
- `destroy()` 使用 AbortController 清理监听、取消动画并断开 IntersectionObserver。关闭弹窗、离屏或页面隐藏时暂停卷尺动画；重新可见并返回量间距工具时自动继续。
- `node --check` 检查组件及可复现构建脚本通过。

Ego 浏览器的截图调用返回 `Page.captureScreenshot` 超时；这次组件检查未取得可读截图。整体页面的后续视觉检查由主任务统一完成，不将此记录作为截图验收。
