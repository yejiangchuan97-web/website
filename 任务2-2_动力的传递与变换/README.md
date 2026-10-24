# 机械动力实验室 · 完整源码工程

已接入[第二章总览](../第二章_动力与工作机构/index.html)。分文件入口与离线单文件均由原构建脚本写入公共导航及课程配色，可在第二章五个实验之间切换。

三维齿轮 / 带 / 链传动、双作用液压缸和气缸教学演示。包含常显零件名称、独立零件旋转观察、输入轴切换、深浅主题及四项学生操作任务。全部运行依赖已随包附带，可离线使用。

## 上传到 GitHub

1. 解压源码 ZIP，将本目录内的文件和文件夹一起提交到仓库，保留 `src/`、`scripts/`、`vendor/`、`tests/`、`dist/` 的结构。不要只提交 ZIP：GitHub 仓库不会自动解压它。
2. 仓库应直接能看到本 README、`package.json` 和 `index.html`。
3. 在仓库设置中邀请协作者。个人仓库需要对方接受邀请；组织仓库需分配允许提交的角色，例如 Write。
4. 协作者从 `src/` 修改代码，完成后运行测试与构建，并把源码和更新后的 `index.html`、`dist/机械动力实验室.html` 一起提交。建议通过分支和 Pull Request 合并修改。

权限说明：[邀请个人仓库协作者](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository)。上传说明：[向仓库添加文件](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)。

## 直接打开

- 体验单文件版本：用 Edge / Chrome 打开 `dist/机械动力实验室.html`，不需要安装 Node.js。
- 查看分文件版本：打开根目录 `index.html`，并保持 `src/` 和 `vendor/` 文件夹在原位。
- 根目录入口可用于静态托管；本源码包本身没有创建仓库、开启 Pages 或发布站点。

## 修改、预览和生成

构建和测试需要已安装 Node.js（20 或以上；交付时使用 Node.js 24.19.0 验证）。没有需要安装的 npm 依赖，**无需 `npm install`**。

在含 `package.json` 的项目目录运行：

```sh
npm run dev
```

打开终端显示的地址，默认是 `http://127.0.0.1:4317`。使用 Ctrl+C 停止。页面按顺序直接加载 `src/` 中的样式和脚本，修改这些文件后刷新即可看到结果。修改页面模板后需重新运行 `npm run build`。预览服务不自动重载页面。

验证物理关系并重新生成发布文件：

```sh
npm test
npm run build
```

若 PowerShell 的策略阻止执行 `npm.ps1`，使用 `npm.cmd test`、`npm.cmd run build`、`npm.cmd run dev`，或直接执行：

```sh
node tests/model.test.js
node scripts/build.js
node scripts/serve.js
```

## 文件对应关系

| 文件                       | 修改内容                                                                |
| -------------------------- | ----------------------------------------------------------------------- |
| `src/index.template.html`  | 页面结构、按钮、原理说明；是生成入口的 HTML 模板                        |
| `src/style.css`            | 页面基础布局、配色、响应式显示                                          |
| `src/enhancements.css`     | 组件标签、深色主题、观察视图                                            |
| `src/learning.css`         | 学习任务和零件说明面板                                                  |
| `src/app.js`               | Three.js 场景、实际模型几何、动画、相机、输入轴、独立零件展示和控件连接 |
| `src/model.js`             | 传动关系、液压流量与压力、气体质量守恒及运动积分；内部使用 SI 单位      |
| `src/annotations.js`       | 组件名称、标签锚点与引导线                                              |
| `src/focus.js`             | 组件视角取景的备用描述                                                  |
| `src/knowledge.js`         | 每个组件的名称相关说明、作用、工作原理及参数                            |
| `src/learning.js`          | 装配、输入轴对换、液压接管、气动加载任务；评分、记录及导出              |
| `vendor/three.min.js`      | 固定版本的 Three.js 第三方渲染库，不需要日常修改                        |
| `scripts/build.js`         | 将同一套源文件生成多文件入口和离线单文件 HTML                           |
| `scripts/serve.js`         | 本地静态预览服务                                                        |
| `tests/model.test.js`      | 14 项物理关系和守恒验证                                                 |
| `index.html`               | 生成的多文件入口；修改页面结构请改模板后重新生成                        |
| `dist/机械动力实验室.html` | 生成的离线单文件；修改后需重新构建才会更新                              |

本项目没有 CAD / Blender 外部模型文件，所有齿轮、键槽、轴、轴承、缸体等几何均在 `src/app.js` 中生成。HTML 内的构建占位符仅用于拼接源码，不存在未附带的私有编译工具。截图、缓存、旧版本备份以及开发机器专用的浏览器测试脚本不属于运行依赖，无需上传。

## 协作时注意

- 当前是静态网页。GitHub 支持对源码进行版本协作；两个人打开页面后的旋钮、模型状态和实验进度不会实时同步。
- 深色主题和已完成任务使用当前浏览器的 localStorage 保存。导出的实验记录是本地文本文件。
- 修改模型或任务后，除 `npm test` 外，还应在浏览器检查三种装置切换、深浅主题、组件独立观察、输入轴切换和四项任务流程。物理单元测试不覆盖所有视觉和交互行为。
- 页面“原理与说明”列出了教学模型假设：齿轮采用渐开线，带假定无滑动；链按节线近似；液压为不可压缩准静态模型；气动为等温双腔集中参数模型。调整代码时请保持动画、单位和仪表读数的一致性。

第三方组件授权见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 `vendor/LICENSE-three.txt`。
