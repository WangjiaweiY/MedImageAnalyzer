# MedImageAnalyzer
医学病理影像分析系统是一个多免疫组化病理图像智能分析系统的用户界面，主要用于图像文件上传、目录管理、图像展示与交互以及免疫组化分析结果的查询。页面整体采用响应式布局，集成了丰富的交互功能，旨在为用户提供便捷高效的图像处理和分析体验。

------

## 页面结构

- **顶部导航栏**
   顶部区域包含系统的 logo（“多免疫组化病理图像智能分析系统”），以及多个操作按钮，包括：
  - **图模式切换按钮：** 提供 1、2、4、9 图模式切换，用户可根据需求选择不同的展示模式。
  - **同步按钮：** 用于开启或关闭图像展示区域的缩放与平移同步功能。
  - **配准按钮：** 弹出配准对话框，供用户选择文件夹进行图像配准操作。
  - **用户信息区：** 显示当前登录用户，并支持上传文件夹以及用户下拉菜单操作（例如个人设置、退出登录）。
- **侧边栏（文件目录列表）**
   侧边栏展示上传的文件夹列表，每个文件夹均可进行以下操作：
  - **展开/收起：** 点击文件夹名称显示或隐藏其下的子文件（DZI 图像文件）。
  - **操作菜单：** 提供删除文件夹、查询分析结果等快捷操作。
  - **文件操作：** 对每个子文件可以进行删除、免疫组化分析、以及单个文件分析结果查询。
- **主体区域（图像展示区）**
   主展示区域根据所选的图模式动态分为 1/2/4/9 个展示框，支持：
  - **图像加载：** 每个展示框通过 OpenSeadragon 加载对应的 DZI 图像资源。
  - **交互体验：** 支持鼠标悬停时显示文件名称的 tooltip，以及选中某个展示框进行交互操作。
  - **同步操作：** 当开启同步功能时，所有展示框之间的缩放和平移操作可保持一致。
- **状态栏**
   用于实时显示上传或配准状态，包含操作进度、已用时信息以及操作结果（成功或失败），仅在相应操作进行或完成后显示。
- **配准弹出框**
   当点击配准按钮后，弹出对话框展示可进行配准的文件夹列表，用户可以选择目标文件夹并启动配准操作。
- **结果弹窗**
   支持以弹窗形式展示免疫组化分析的结果。结果可以以表格形式显示多条记录，也可以展示单个对象的详细信息。

------

## 主要功能

- **文件夹上传与处理**
   支持通过文件夹上传方式将本地图像数据提交至后端，页面在上传过程中会实时显示进度和状态信息。
- **目录管理与文件操作**
   用户可以浏览上传的文件夹目录，展开查看文件列表，并对文件夹或单个文件执行删除、查询分析结果等操作。
- **图像展示与交互**
   集成 OpenSeadragon 实现 DZI 图像的加载与浏览，提供多种图模式切换，用户可以选择展示区域并对图像进行缩放、平移等操作。
   同时支持鼠标悬停时显示当前展示图像的文件名称，提升用户操作体验。
- **免疫组化分析**
   页面内嵌免疫组化分析接口，用户可直接触发对指定图像的分析，并通过弹窗查询和展示分析结果。
- **图像同步功能**
   当开启同步后，各个展示框之间的缩放与平移操作会保持一致，方便用户同时对比多个图像的细节。
- **用户操作与权限管理**
   顶部导航栏提供用户信息展示及下拉菜单，支持用户进行个人设置、退出登录等操作，同时集成上传按钮方便数据提交。

------

## 技术栈

- **Vue 3 & Composition API：** 使用 Vue.js 框架构建响应式前端页面，并利用 Composition API 管理组件状态与逻辑。
- **Naive UI：** 基于 Naive UI 组件库构建布局和 UI 元素，如按钮、列表、下拉菜单等，确保界面美观且易于交互。
- **OpenSeadragon：** 集成 OpenSeadragon 实现 DZI 图像的高效加载和浏览，支持大图无损缩放和平移。
- **现代 JavaScript (ES6+)：** 利用现代 JavaScript 特性实现业务逻辑、事件处理及数据交互。

------

## 用户交互流程

1. **登录后进入主界面：** 用户通过登录后进入系统，页面顶部显示欢迎信息。

   ![](./imgs/main.png)

2. **文件上传：** 用户点击上传按钮选择本地文件夹，上传过程中状态栏显示实时进度。

   ![](./imgs/upload.png)

3. **目录浏览：** 左侧侧边栏展示上传文件夹，用户可展开文件夹查看具体图像文件，并进行删除或分析操作。

   ![](./imgs/list.png)

4. **图像展示：** 右侧展示区域支持多种图模式，用户点击对应的展示框加载所选图像。

   ![](./imgs/show.png)

5. **图像同步与配准：** 用户可以通过同步按钮开启同步功能，并通过配准按钮发起图像配准操作，配准进度与结果通过状态栏和弹窗反馈给用户。

   ![](./imgs/register.png)

6. **分析结果查询：** 通过侧边栏或文件操作菜单查询免疫组化分析结果，以弹窗形式呈现详细的分析数据。

   ![](./imgs/ihcfileshow.png)
​   ![](.\/imgs/ihcfoldershow.png)
