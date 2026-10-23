# Hero 实体与局部特写检查

本记录对应最终透明软管与气流版本，构建哈希见下方。完整8组浏览器结果已合并保留：Hero交互在该版本重新运行，其余7组沿用此前通过的完整回归结果，具体时间和范围见 `hero-check-record.md`。

气流新增专项检查见 `hero-flow-results.json`：通过实际故障修复、恢复打磨流程，等待1.5秒后检查。双主题气流粒子透明度约0.8497、软管透明度约0.30且不写入深度；60个粒子坐标持续变化。隔离后粒子隐藏，帧计数分别655→655、669→669，场景停止连续渲染。

气流未显示时10次换姿态的几何计数恒为158；气流首次显示后计数为159，这是新增Points几何的延迟GPU分配，不是泄漏。没有把158硬改成159。

最终集尘双主题特写已查看：透明软管保留连续外形和接头关系。恢复后气流近景中可辨青色点沿管内进入接口，未见穿过桶壁；此特写为相机靠近、1×像素截图。4个轮胎世界轴、软管实际首尾环、34组姿态与减少动态效果检查均重新通过。

执行时间：2026-10-22T15:26:52.685Z

自动检查结果：通过

状态扫描：34 组。检查关节定长、法向退让传递、磨头分层位置、软管端点与脱管间隙。

几何内存计数：158 → 158 → 158 → 158 → 158 → 158 → 158 → 158 → 158 → 158

减少动态效果：确认不持续渲染，工具坐标不变

局部图使用相机靠近主对象、1×像素截图，不称作4×像素放大导出。截图的视觉质量需要实际查看。

| 部件 | 主题 | 文件 |
| --- | --- | --- |
| head | light | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/head-light-camera-closeup.png |
| arm | light | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/arm-light-camera-closeup.png |
| base | light | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/base-light-camera-closeup.png |
| extractor | light | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/extractor-light-camera-closeup.png |
| overview | light | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/final-overview-light.png |
| dust | light | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/final-dust-light.png |
| head | dark | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/head-dark-camera-closeup.png |
| arm | dark | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/arm-dark-camera-closeup.png |
| base | dark | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/base-dark-camera-closeup.png |
| extractor | dark | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/extractor-dark-camera-closeup.png |
| overview | dark | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/final-overview-dark.png |
| dust | dark | C:/Users/Administrator/Documents/GitHub/website/任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/qa/hero-artifacts/geometry/final-dust-dark.png |

构建SHA-256：

- index.html: 76cfaf9b2c6225c849af26949010adc754c613e966fa5c3dbaf17a85f68dfbda
- dark.html: 1ed7029d99fa818e6ff8afac6e2af07d9f214c5031342327d026facf1be2de1e

实际网格审计：通过工厂包装读取机器人对象，轮轴取轮胎世界矩阵，软管端点取TubeGeometry首尾环10个独立顶点的中心。

| 指标 | 最大值 |
| --- | --- |
| 轮轴竖向分量 | 2.220446049250313e-16 |
| 连杆长度误差 / m | 3.3306690738754696e-16 |
| 软管网格首环接口误差 / m | 2.025935513343283e-8 |
| 软管网格末环预期位置误差 / m | 1.9711392131154598e-8 |
