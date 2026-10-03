# DSH Digit-Keys

给 DeepSeek Harness Web GUI 的**权限请求面板**与**提问卡片**加数字键操作，并把要按的数字显示出来。

只装一个 bundle：

| 插件 | 替换的内置行 | 作用 |
|---|---|---|
| `digit-keys/` | `ui-approval` + `ui-user-questions` | 权限面板 `1` 允许 / `2` 拒绝；提问卡片数字选择、`Enter` 确认、`Space` 跳过 |

## 按键语义

### 权限请求

| 键 | 行为 |
|---|---|
| `1` | 允许一次 |
| `2` | 拒绝 |
| `Enter` | 允许一次（沿用内置行为） |
| `Esc` | 拒绝（沿用内置行为） |

### 提问卡片

| 键 | 行为 |
|---|---|
| `1`–`9` | 选择对应选项（**暂存，不前进**）；多选题则切换勾选 |
| `Enter` | 确认当前题：非末题 → 下一题；末题 → 提交整批 |
| `Space` | 跳过当前题：非末题 → 下一题；末题 → 提交整批 |
| 鼠标点击 | **保持原样**（单选点击后自动跳下一题） |
| 自定义答案框内 | 数字与空格正常输入；`Enter` = 下一题 / 提交（沿用内置行为） |

计划审批（`plan-review`）一并覆盖：选项即「批准 / 继续修改」，`1` / `2` 选择、`Enter` 确认。

## 仓库结构

**仓库根目录本身就是要安装的插件包**（git 安装只认仓库根，子目录包无法直接安装）：

```
package.json                # dsh.bundle.patch + dsh.client
cordis.patch.yml            # 禁用两条内置行 + 插入本插件行
index.js
client.js                   # 生成物，勿手改
src/approval/client.js      # fork 自 @deepseek-ai/dsh-client-ui-approval@0.2.0-rc.2
src/questions/client.js     # fork 自 @deepseek-ai/dsh-client-ui-user-questions@0.2.0-rc.2
tools/build-combined.mjs    # 由两个 fork 生成根目录的 client.js
```

`src/` 与 `tools/` 只用于开发：`src/` 里是两份 fork 的**源码**（各自是独立的 `window.__ModuleLoader__.load({...})` 模块），不参与安装；`client.js` 是生成物。

## 改动清单（相对上游 0.2.0-rc.2）

**src/approval/client.js**（← `dsh-client-ui-approval`）

1. 模块 id 与 CSS 标记改为 `@local/digit-keys`；
2. `keydown` 增加 `1` / `2` 分支，原有 `Enter` / `Esc` 行为不变；
3. 两个按钮文案加前缀 `1 ` / `2 `，并加 `aria-keyshortcuts`；
4. 面板挂载时自动聚焦根节点，否则按键事件不会进入面板；根节点 `tabIndex: -1` 带来的聚焦外圈用 `style={{ outline: "none" }}` 关掉。

**src/questions/client.js**（← `dsh-client-ui-user-questions`）

1. 模块 id 与 CSS 标记改为 `@local/digit-keys`；
2. 新增 `chooseStay()`：数字键只选择、**不自动前进**（鼠标点击仍走原来的 `choose()`，保持自动跳题）；
3. 新增卡片级 `cardKeydown`：数字选择 / `Enter` 确认 / `Space` 跳过；焦点在输入框、输入法组合态、带修饰键、按键重复等情况一律放行不拦截；
4. 选项按钮上的 `Enter` 由「整批提交」改为「确认当前题」（`continueFlow()`）；
5. 多选题选项补上数字徽标（上游多选只有复选框）；
6. 卡片挂载与换题时自动聚焦，保证按键生效；聚焦外圈同样用 `style={{ outline: "none" }}` 关掉。

## 合并方式

两个 fork 在同一个 factory 作用域里有 13 个重名声明（`react`、`css`、`tagId`、`module`、`exports`、`apply`、`inject`、`zh`、`en`、`NS`、`settlePendingComposer` 等），直接拼接会重复声明。因此生成脚本把每个 factory 主体**各自包进一个 IIFE**（两份主体本来就以 `return module.exports` 结尾，内部一行都不用改），外层模块再组合：

```js
return {
  inject: [...new Set([...approvalHalf.inject, ...questionsHalf.inject])],
  apply(ctx) {
    approvalHalf.apply(ctx);
    questionsHalf.apply(ctx);
  },
};
```

重名标识符各自落在自己的闭包里；`require` 由外层 factory 参数提供，两次 `require("react")` 走模块表同一份实例。

**上游升级后重新对齐**：改 `src/` 里对应的 fork，然后

```
node tools/build-combined.mjs
```

## 安装

**从 GitHub 装**（仓库根即包）：

```
plugin_manager  action=install_bundle  target=github:stnt04/dsh-digit-keys
```

**从本地目录装**：`target` 指向本仓库根目录（含 `package.json` 的那一层）。

或走 Web 插件页按同样目标安装。安装会写 profile 的 `package.json` / `cordis.patch.yml`，需要一次审批。

> ⚠️ 常见坑：git 安装只把**仓库根**当包。若把包放在子目录（例如早期的 `digit-keys/`），pnpm 会按仓库名合成一个没有 `dsh.bundle` 的包，安装会以「这个包没有声明组合包」被拒。同理，本地目录安装必须指向含 `package.json` 的那一层。

> 若你之前装过仓库历史提交 `739cf55` 里的两个独立插件（`approval-keys` / `question-keys`），**先卸载它们**再装本包：否则两条内置行会被重复禁用，且可能出现两个面板同时注册。

## 验证清单

- 权限请求：面板出现时按 `1` → 放行；按 `2` → 拒绝；按钮上能看到 `1` / `2`。
- 提问卡片（单选）：按 `2` → 第 2 项选中且**不跳题**；`Enter` → 下一题；`Space` → 跳过并进入下一题。
- 提问卡片（多选）：数字键切换勾选；`Enter` 确认。
- 多题批次：数字选择 → `Enter` 逐题前进 → 末题 `Enter` 提交。
- 计划审批：`1` 批准 / `2` 继续修改。
- 在自定义答案框里输入含数字与空格的文本，确认不被拦截。
- 亮/暗主题下样式正常；控制台无 `slot entry crashed`。

## 实测记录

在 DSH Desktop 0.2.0-rc.2（内置 pnpm 11.7.0）上逐项实测通过：

| 场景 | 结果 |
|---|---|
| 权限请求 · 允许 | 按 `1` 放行，命令执行 |
| 权限请求 · 拒绝 | 按 `2` 后命令被拦下，标记文件从未创建 |
| 单选题 | 数字键选中且**不跳题**，`Enter` 提交 |
| 多选题 | 数字键**切换勾选**、停留本题；选项旁数字编号可见 |
| 多批次单选 | 数字停留本页 → `Enter` 前进 → 末题 `Enter` 整批提交并关闭卡片 |
| 多批次多选 | 同上，末题 `Enter` 提交成功 |
| `Space` 跳过 | 该题以空答案标记为跳过并继续 |
| 自定义答案框 | 输入含数字与空格的文本正常，`Enter` 提交成功 |

仍未覆盖：`plan-review`（计划审批）未单独实测；亮/暗主题与移动端未检查；`Enter` 在权限面板仍是「允许一次」。

## 已知限制与风险

- **单点失败**：两半合在一个客户端模块里，任一半抛错会让权限面板和提问卡片**同时**失效；`inject` 取并集，缺任一服务整个模块不激活。需要失败隔离时，可用历史提交 `739cf55` 里的两个独立包。
- **依赖 Harness 客户端模块表**：fork 仍 `require` `@deepseek-ai/dsh-client-ui-primitives` 与 `@deepseek-ai/dsh-client-store`；上游改这些包或改卡片内部结构时需要重新对齐 `src/`。
- **禁用了内置行**：patch 把 `ui-approval` / `ui-user-questions` 置为 `disabled: true`。卸载前请恢复这两条，否则权限 / 提问界面会直接消失。
- **未改的上游语义**：权限面板 `Enter` 仍是「允许一次」（危险操作易误触，想改成不动作请自行修改）；多选题「自定义文本 + 勾选」的组合行为沿用上游。

## 许可

fork 的上游代码为 MIT，见 [`LICENSE`](LICENSE)；本仓库的改动同样以 MIT 发布。
