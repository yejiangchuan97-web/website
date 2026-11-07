# 第三方组件

- Three.js 0.160.1（r160），用于 WebGL 三维渲染。
- 项目地址：https://github.com/mrdoob/three.js
- 本地文件：`vendor/three.min.js`；许可证：`vendor/LICENSE-three.txt`（MIT）。
- 使用固定版本的传统全局脚本，以支持离线单文件分发。库内有旧打包形式的弃用提示，目前不影响本项目运行。

应用代码、模型几何和任务内容位于 `src/`。几何由 JavaScript 运行时生成，没有另行依赖的 Blender、CAD 或外部模型文件；未对这些应用代码另行指定开源许可证。第三方 MIT 许可仅适用于对应第三方组件。
