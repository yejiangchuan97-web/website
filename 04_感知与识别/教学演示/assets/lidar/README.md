# PCL 公开点云示例

`sample.json` 是 PCL 官方教程数据 `table_scene_lms400.pcd` 的固定步长抽样，供形状与点云属性识读。它与网页中的教学几何仿真是不同来源。

- 官方教程：https://pointclouds.org/documentation/tutorials/statistical_outlier.html
- 固定原文件：https://raw.githubusercontent.com/PointCloudLibrary/data/084fa0e260580cc765ded83de4ec3f495f1d6f1e/tutorials/table_scene_lms400.pcd
- 数据仓库：https://github.com/PointCloudLibrary/data
- 许可：BSD-3-Clause，完整原文见同目录 `PCL-DATA-LICENSE.txt`，分发时须保留。
- 原文件 SHA256：`e285d415641e0d9de695b611db874cc8fe995e8089b77a50d6056d24d8cbcc58`。
- 原始 460,400 点；保留第 0、38、76… 个原始点，共 12,116 点。`sourceIndex` 是原文件零基索引。XYZ 和 intensity 保留原值，不补点、不平滑、不重建。
- 原文件没有 RGB；高度色、来源色等属于显示映射。
- 原文件没有声明坐标单位，完整采集履历也未在当前官方教程列出。未确认单位前，只提供原坐标点距，不作米制净宽结论；不能将其宣称为当前教学场景或当前显示雷达采集的数据。
- 仅显示时允许居中、缩放或旋转；保留原坐标，并明确显示变换。

完整原文件与转换元数据保存在 `qa/lidar/source/`，可重复生成脚本为 `qa/lidar/prepare-pcl-sample.mjs`。原始压缩数据包含零填充尾部，转换器仅按 PCD 声明的有效压缩长度解码并校验解压长度。
