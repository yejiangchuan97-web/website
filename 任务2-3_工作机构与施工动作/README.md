# 三维机械教学实验台 · 完整源码

已接入[第二章总览](../第二章_动力与工作机构/index.html)。推荐使用根目录[工作机构](index.html)与[四杆扩展](fourbar.html)，顶部可切换第二章五个实验。`node build.cjs` 同时更新这两个入口和原 `dist/` 单文件页；原路径继续可用。

这是当前已交付版本，包含两个模型放大后的独立演示、暂停、反向、单步和倍速控制，以及固定机架、拖动曲柄、连续分支、连杆点轨迹和镜像夹持工具的四杆扩展页。扩展页新增传动角、受力箭头、切向 / 径向分力、垂直力臂，以及 A/B 与 B/C 两类共线姿态的实时讲解。

## 直接使用

用 Edge 或 Chrome 打开 dist/mechanism-classroom.html。该文件包含完整 HTML、样式、脚本与三维库，可离线运行，无须安装依赖或启动服务器。

四杆扩展页为 dist/fourbar-linkage.html，可直接打开，也可从总实验台的“四杆扩展”进入。两份 HTML 都包含所需的三维库；放在同一目录时可以相互导航。

## 编辑与构建

安装 Node.js 后，在本目录运行：

    node build.cjs

生成文件为 dist/mechanism-classroom.html 和 dist/fourbar-linkage.html。构建脚本只使用 Node.js 内置模块，不需要 npm install，支持将整个目录移动到其他位置后继续使用。

## 源码结构

- src/index.template.html：主页面结构与基础样式。
- src/app.js：四杆几何、三维场景、主界面、两个模型的独立放大演示。
- src/parts.js：零件目录、零件说明与三维放大查看。
- src/physics.js、physics.html：液压、丝杠与振动计算及物理实验面板。
- src/workshop.js、workshop.html、workshop.css：剖视、爆炸图、组装练习、主题与部件名称控制。
- src/fourbar-kinematics.js：独立纯函数求解器，圆交点、连续可达区间、分支锁定、夹爪几何及参考受力计算。
- src/fourbar-app.js、fourbar.template.html、fourbar.css：扩展页三维交互与界面。
- src/fourbar-teaching.js：随当前闭合解更新的传动角、受力可视化、讲解及教学预设。
- vendor/three.min.js：已捆绑的 Three.js r160 发行文件，MIT 许可。
- build.cjs：把上述模块合成为一个可离线使用的 HTML。
- tests/：计算与放大演示控制的校验脚本；reports/ 为最近导出时的校验记录。

项目业务脚本保留源代码，未压缩。模板中的 __APP__、__THREE__、__PARTS__、__PHYSICS__、__WORKSHOP__ 等标记由构建脚本替换，请保留这些标记。

## 校验

计算校验无需第三方依赖：

    node tests/physics.cjs

浏览器交互校验需要安装测试依赖和 Chromium：

    npm install
    npx playwright install chromium
    npm run test:ui

也可执行 npm run build 或 npm test。浏览器测试会把截图和结果写入 tests/reports/。

四杆几何检查为 node tests/fourbar-math.cjs；受力、力矩、虚功及死点检查为 node tests/fourbar-mechanics.cjs。扩展页浏览器检查为 npm run test:fourbar，教学标注交互检查为 npm run test:teaching-ui。npm test 会运行原模型、四杆几何及受力数学检查。

## 模型范围

四杆采用刚体、理想销轴和准静态受力模型，液压速度按流量与有效面积计算，丝杠采用梯形螺纹与等效摩擦模型；偏心振动另用单自由度方程积分。具体假设和参数在页面的“物理实验”中列出。几何间隙、剖视与装配路径用于原理教学，不求解接触应力、油液流场或完整碰撞。

四杆扩展页的箭头是 B 为无质量二力杆、无中间外载工况下的 ±100 N 参考轴向力，不是电机或夹持力的动力学解。μ 取 B/C 轴线的锐角，Ft = F sin(β−γ)，输出转矩 MC = Ft·C；A/B 共线的反驱死点与 B/C 共线的输出转矩退化分别讲解。接近圆交点合并前保留安全间隔并停止，自动演示不切换装配分支。角度提示阈值用于课堂观察；sin μ 表示切向分力占比，不表示能量效率。

## 第三方许可

Three.js 的版权标记保留在 vendor/three.min.js 和生成的 HTML 中，完整 MIT 许可见 vendor/THREE-LICENSE.txt。
