多缸柴油机交互实验室 — 完整源码

打开方式
1. 解压全部文件后，双击 index.html。
2. diesel-standalone.html 为同一版本的单文件网页，可单独复制、离线打开。
3. 使用支持 WebGL 的现代浏览器。无需安装依赖、构建或连接网络。

源码结构
index.html                  页面结构
src/style.css               全部页面样式与响应式布局
src/engine-lab.js           三维模型、动画、拆装、交互、音效与时序面板
src/three.js                原网页内嵌的 Three.js 库（MIT，许可声明保留在文件中）
diesel-standalone.html      全部源码内嵌的单文件版本

编辑提示
修改拆分版时，编辑 index.html、style.css 和 engine-lab.js。
拆分版与单文件版分别保存；修改拆分版不会自动同步至单文件版。
多缸模型以 createMultiEngine 函数为入口，控制连接从“Connect the multi-cylinder”注释开始。

包含原有单缸与挖掘机演示，以及新增四缸、六缸模式、34组主要部件拆装与720°工作时序。
本项目为教学示意模型，未按制造级细化全部零件。
