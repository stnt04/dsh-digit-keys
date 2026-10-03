# DSH Digit-Keys

给 DeepSeek Harness Web GUI 的**权限请求面板**与**提问卡片**加数字键操作，并把要按的数字显示出来。

两个互相独立的 DSH 客户端插件（bundle），可按需单独安装：

| 插件 | 替换的内置行 | 作用 |
|---|---|---|
| `approval-keys` | `ui-approval`（`@deepseek-ai/dsh-client-ui-approval`） | 审批面板按钮显示 `1 允许一次` / `2 拒绝`，按 `1` / `2` 直接作答 |
| `question-keys` | `ui-user-questions`（`@deepseek-ai/dsh-client-ui-user-questions`） | 提问卡片：数字键选择、`Enter` 确认当前题、`Space` 跳过该题 |

## 按键语义

### 权限请求（approval-keys）

| 键 | 行为 |
|---|---|
| `1` | 允许一次 |
| `2` | 拒绝 |
| `Enter` | 允许一次（沿用内置行为） |
| `Esc` | 拒绝（沿用内置行为） |

### 提问卡片（question-keys）

| 键 | 行为 |
|---|---|
| `1`–`9` | 选择对应选项（**暂存，不前进**）；多选题则切换勾选 |
| `Enter` | 确认当前题：非末题 → 下一题；末题 → 提交整批 |
| `Space` | 跳过当前题：非末题 → 下一题；末题 → 提交整批 |
| 鼠标点击 | **保持原样**（单选点击后自动跳下一题） |
| 自定义答案框内 | 数字与空格正常输入；`Enter` = 下一题 / 提交（沿用内置行为） |

计划审批（`plan-review`）由 `question-keys` 一并覆盖：选项即「批准 / 继续修改」，`1` / `2` 选择、`Enter` 确认。

## 来源与改动

两个 `client.js` 都是 **fork**，不是从零实现：

- `approval-keys/client.js` ← `@deepseek-ai/dsh-client-ui-approval@0.2.0-rc.2/lib/client.js`（MIT）
- `question-keys/client.js` ← `@deepseek-ai/dsh-client-ui-user-questions@0.2.0-rc.2/lib/client.js`（MIT）

相对上游的改动：

**approval-keys**

1. 模块 id 与 CSS 标记改为 `@local/approval-keys`；
2. `keydown` 增加 `1` / `2` 分支，原有 `Enter` / `Esc` 行为不变；
3. 两个按钮文案加前缀 `1 ` / `2 `，并加 `aria-keyshortcuts`；
4. 面板挂载时自动聚焦根节点（否则按键事件不会进入面板）。

**question-keys**

1. 模块 id 与 CSS 标记改为 `@local/question-keys`；
2. 新增 `chooseStay()`：数字键只选择、**不自动前进**（鼠标点击仍走原来的 `choose()`，保持自动跳题）；
3. 新增卡片级 `cardKeydown`：数字选择 / `Enter` 确认 / `Space` 跳过；焦点在输入框、输入法组合态、带修饰键、按键重复等情况一律放行不拦截；
4. 选项按钮上的 `Enter` 由「整批提交」改为「确认当前题」（`continueFlow()`）；
5. 多选题选项补上数字徽标（上游多选只有复选框）；
6. 卡片挂载与换题时自动聚焦，保证按键生效。

## 安装

DSH 插件以 bundle 形式安装，`target` 指向包目录：

```
plugin_manager  action=install_bundle  target=<repo>/approval-keys
plugin_manager  action=install_bundle  target=<repo>/question-keys
```

也可以走 Web 插件页按目录安装。安装会写 profile 的 `package.json` / `cordis.patch.yml`，需要一次审批。

## 验证清单

- 权限请求：面板出现时直接按 `1` → 放行；按 `2` → 拒绝；按钮上能看到 `1` / `2`。
- 提问卡片（单选）：按 `2` → 第 2 项选中且**不跳题**；`Enter` → 下一题；`Space` → 跳过并进入下一题。
- 提问卡片（多选）：数字键切换勾选；`Enter` 确认。
- 多题批次：数字选择 → `Enter` 逐题前进 → 末题 `Enter` 提交。
- 计划审批：`1` 批准 / `2` 继续修改。
- 在自定义答案框里输入含数字与空格的文本，确认不被拦截。
- 亮/暗主题下样式正常；控制台无 `slot entry crashed`。

## 已知限制与风险

- **依赖 Harness 客户端模块表**：fork 后的文件仍会 `require` `@deepseek-ai/dsh-client-ui-primitives` 与 `@deepseek-ai/dsh-client-store`。上游改这些包的 API、或改卡片内部结构时，需要按上面的来源版本重新对齐 fork。
- **禁用了内置行**：两个 patch 分别把 `ui-approval` / `ui-user-questions` 置为 `disabled: true`。卸载插件前请先恢复这两个条目，否则权限 / 提问界面会直接消失。
- **未改的上游语义**：权限面板的 `Enter` 仍是「允许一次」（危险操作上容易误触，想改成不动作请自行修改）；多选题「自定义文本 + 勾选」的组合行为沿用上游。
- 本仓库只做了语法检查与源码级核对，**未在真机运行验证**。

## 许可

fork 的上游代码为 MIT，见 [`LICENSE`](LICENSE)；本仓库的改动同样以 MIT 发布。
