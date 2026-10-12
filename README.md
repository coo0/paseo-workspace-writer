# paseo-workspace-writer

一个用于 Paseo 的工作区 ID 写入插件。当 Paseo 创建 agent 或 agent 开始新一轮 turn 时，插件会把该 agent 的 `workspaceId` 写入其工作目录下的 `.paseo-workspace-id`，方便在该目录中读取工作区标识。

项目目前是基于插件脚手架的轻量实现，核心逻辑位于服务端入口；客户端入口保留空实现以满足 Paseo 对双端入口的要求，不提供 UI。仓库中仍保留了一些未接入的示例代码。

## 核心功能

插件监听两个服务端事件，并复用同一套写入逻辑：

- `agent.created`：创建 agent 时写入一次。
- `agent.turn_started`：每次 turn 开始时再次写入，使用该事件携带的 agent 数据更新文件。

每次写入执行以下操作：

1. 检查 agent 是否具有 `workspaceId` 和 `cwd`；任一缺失时直接跳过。
2. 递归创建 `cwd` 对应目录（如果目录不存在）。
3. 在该目录中写入 `.paseo-workspace-id`，内容为工作区 ID，末尾带一个换行符。

例如，agent 的工作目录为 `/path/to/project`、工作区 ID 为 `example-workspace-id` 时，会生成：

```text
/path/to/project/.paseo-workspace-id
```

文件内容：

```text
example-workspace-id
```

已有同名文件会被覆盖。若多个 agent 使用同一目录，最后一次成功写入的值会保留。

写入异常会被捕获，不向 Paseo 主流程抛出，也不会输出错误日志。插件没有单独的失败重试机制，但后续 turn 开始时会再次尝试写入。它不会主动扫描既有 agent，也不单独监听工作目录或工作区变更；这些值以创建或 turn 开始事件中的 agent 数据为准。

## 技术栈

| 组件 | 版本要求 / 声明 | 用途 |
| --- | --- | --- |
| Paseo | `>=0.11.2` | 插件运行宿主 |
| `@getpaseo/plugin` | `0.11.2` | 插件 SDK |
| TypeScript | `^5.9.3` | 类型检查与源码开发 |
| React | `19.1.0` | 客户端示例 |
| React Native | `0.81.5` | 客户端示例界面 |
| TanStack React Query | `^5.90.11` | 示例中的异步请求状态 |
| Zod | `^4.4.3` | 项目声明的依赖 |

服务端使用 Node.js 的 `node:fs` 和 `node:path`。仓库没有明确指定 Node.js 版本，开发环境应与所使用的 Paseo 版本兼容。

## 目录结构

```text
paseo-workspace-writer/
├── index.server.ts        # 监听 agent 创建和 turn 开始事件，写入工作区 ID
├── index.client.tsx       # Paseo 所需的客户端入口，不提供 UI
├── client/
│   ├── greeting.tsx      # 遗留的 greeting RPC 示例界面，当前未接入
│   └── web.ts            # 在浏览器或原生环境打开外部链接的辅助函数
├── paseo-plugin.json     # 插件 ID 和 Paseo 版本要求
├── package.json          # 依赖、包文件声明与类型检查脚本
├── package-lock.json     # npm 依赖锁定文件
├── tsconfig.json         # TypeScript 配置
├── OVERVIEW.md           # 尚未替换的脚手架说明模板
└── README.md             # 项目说明
```

`.paseo-workspace-id` 是插件写入的运行产物，不是源码配置文件。

`package.json` 的 `files` 还声明了 `server/`、`shared/`、`index.client.ts` 和 `index.server.tsx` 等路径；这些路径在当前项目中不存在。该列表属于包文件声明，不代表这些模块已经实现。

## 安装依赖与开发

在项目根目录执行：

```bash
npm install
```

运行类型检查：

```bash
npm run typecheck
```

该命令执行 `tsc --noEmit`，只检查类型，不生成编译产物。

仓库目前没有 `start`、`build` 或 `test` 脚本，也没有独立应用启动命令。插件需要由 Paseo 的插件运行环境加载。仓库未提供可核实的安装、注册或启用命令，请按所使用的 Paseo 版本提供的插件管理流程操作。

插件清单中的 ID 为 `paseo-workspace-writer`，最低宿主版本要求为 Paseo `0.11.2`。

## 配置与使用验证

核心写入逻辑没有自定义配置项，无需 API key 或数据库。工作区 ID 和目标目录均来自 Paseo 传入的 agent 数据。

加载并启用插件后，在 Paseo 中创建一个具有 `workspaceId` 和 `cwd` 的 agent，或让既有 agent 开始新一轮 turn，然后在对应工作目录中查看生成文件：

```bash
cat /path/to/project/.paseo-workspace-id
```

将 `/path/to/project` 替换为该 agent 的实际工作目录。文件内容应与该 agent 的工作区 ID 一致。

由于写入失败不会产生错误日志，文件未生成时，可先核对 agent 是否具有上述两个字段，并检查工作目录的写入权限。仅加载插件不会立即为既有 agent 补写文件；该 agent 下一轮 turn 开始时会触发写入。

要验证每轮更新，可在首次写入后删除或修改 `.paseo-workspace-id`，再让同一 agent 开始新一轮 turn；目录可写且字段有效时，文件应重新生成或覆盖为当前工作区 ID。

## 当前状态与已知问题

当前版本为 `0.0.0`，`package.json` 设置了 `private: true`。服务端已有工作区 ID 写入逻辑，并在 agent 创建和每次 turn 开始时执行；项目尚未通过类型检查，也未提供自动化测试。

本次运行 `npm run typecheck` 返回退出码 `2`，错误如下：

```text
client/greeting.tsx(6,29): error TS2307: Cannot find module '../shared/greeting' or its corresponding type declarations.
client/greeting.tsx(27,49): error TS2339: Property 'message' does not exist on type '{}'.
index.server.ts(2,42): error TS2307: Cannot find module 'node:fs' or its corresponding type declarations.
index.server.ts(3,22): error TS2307: Cannot find module 'node:path' or its corresponding type declarations.
```

相关情况：

- `client/greeting.tsx` 引用了不存在的 `shared/greeting` 模块，其 greeting RPC 示例并不完整，且未由当前客户端入口接入。
- 项目未声明 `@types/node` 开发依赖，当前类型检查无法解析服务端使用的 Node.js 模块类型。
- `OVERVIEW.md` 仍为脚手架模板，包文件声明也存在未对应到实际文件的条目。

后续完善时，可先清理或补齐客户端示例、补齐 Node.js 类型声明，并核对包文件列表，再添加针对缺失字段、文件覆盖和写入失败场景的测试。本说明文档描述的是当前源码行为；本次未在 Paseo 宿主中进行端到端运行验证。
