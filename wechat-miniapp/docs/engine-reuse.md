# 微信小程序引擎复用方案 v0.1

## 1. 现有项目结论

当前项目已经形成三层架构：

1. `engine/`：Python 排盘与规则分析，负责纯命理数据。
2. `report/`：报告生成层，负责正式长报告、模板和 prompt。
3. `web/`、`app/`：应用层。

根目录 README 明确要求：

> 应用层生成报告时，必须引用 `report/` 下的 prompt 和模板，禁止自己硬编码 prompt。

微信小程序不是传统长报告产品，首版应先复用 `engine/` 的结构化计算结果，再新增“小程序关系签转译层”。这个转译层不替代 `report/`，而是面向一个新的轻互动场景。

## 2. 可复用能力

### 2.1 Python 引擎

优先复用：

- `engine/paipan.py`
  - 公历/农历排盘。
  - 四柱、十神、藏干、纳音。
  - 真太阳时修正。
  - 大运流年基础数据。

- `engine/rules.py`
  - 旺衰。
  - 用神忌神。
  - 格局。
  - 合冲刑害。
  - 神煞。
  - 十神分布。

### 2.2 现有 API

当前轻量接口：

- `POST /api/engine/paipan`

请求：

```json
{
  "name": "匿名",
  "gender": "女",
  "birth_date": "1998-05-21",
  "birth_time": "22:00",
  "birth_city": "上海",
  "calendar_type": "公历",
  "is_leap_month": false
}
```

返回：

```json
{
  "paipan": {},
  "rules": {}
}
```

小程序首版可以继续通过后端调用这个接口。后续如果要专门做关系签，建议新增独立 API，不复用旧页面的合婚接口。

## 3. 不建议复用的能力

### 3.1 不直接复用旧 TypeScript 引擎

`app/src/engine/baziEngine.ts`、`compatibilityAnalyzer.ts`、`relationAnalyzer.ts` 多处标记为 deprecated，说明主计算已经迁移到 Python 后端 API。

微信小程序新增逻辑不应该复制这些 TS 文件。

### 3.2 不直接复用旧合婚文案

`app/src/engine/compatibilityAnalyzer.ts` 的输出更偏传统合婚：

- 天作之合。
- 佳偶天成。
- 良缘可结。
- 不甚相宜。
- 建议结合。

这些不符合“关系签”的产品气质。关系签可以参考其中的命理维度，但必须重写输出模型与表达边界。

## 4. 建议新增后端能力

在后续实现阶段，建议新增一个小程序专用 API 分组：

```text
web/backend/app/api/wechat_relation_sign.py
```

建议接口：

### 4.1 创建关系签

```text
POST /api/wechat/relation-signs
```

用途：A 登录后输入自己的出生信息，创建一支可分享的关系签。

后端动作：

1. 调用 `compute_paipan`。
2. 调用 `compute_rules`。
3. 根据 A 的命盘生成签底色、签名与可分享 token。
4. 保存 A 的命盘摘要，不暴露给 B。

### 4.2 打开关系签

```text
GET /api/wechat/relation-signs/{sign_token}
```

用途：B 打开 A 的签，看到落地页基础信息。

返回：

- A 的公开昵称。
- 签名/签语。
- 隐私说明。
- 是否仍可打开。

不返回：

- A 的生日。
- A 的完整八字。
- A 的规则 JSON。

### 4.3 B 生成私密视角

```text
POST /api/wechat/relation-signs/{sign_token}/private-view
```

用途：B 登录后输入自己的出生信息，生成只给 B 看的关系推论。

后端动作：

1. 调用 B 的排盘与规则分析。
2. 读取 A 的命盘摘要。
3. 调用关系签分析器。
4. 调用 LLM 做受控转译。
5. 生成 B 私密结果。
6. 更新 A 可见状态：B 已打开、B 已生成。

### 4.4 B 回赠

```text
POST /api/wechat/relation-signs/{sign_token}/returns
```

用途：B 主动回赠一句话给 A。

回赠内容必须是模板化或轻编辑，避免用户发送过度隐私内容。

### 4.5 签状态

```text
GET /api/wechat/relation-signs/{sign_id}/status
```

用途：A 查看一支签的打开、生成与回馈状态。

返回：

- 打开人数。
- 生成人数。
- 回馈人数。
- 已登录 B 的头像/昵称。
- 每个 B 的打开/生成/回馈状态。

不返回：

- B 的出生信息。
- B 的完整八字。
- B 的私密结果。

### 4.6 创建求签邀约

```text
POST /api/wechat/relation-requests
```

用途：A 登录后创建一个“向 TA 求签”的邀约。

后端动作：

1. 创建求签记录。
2. 生成可分享 token。
3. 不要求 A 先输入出生信息。

### 4.7 B 留下密封签

```text
POST /api/wechat/relation-requests/{request_token}/sealed-chart
```

用途：B 登录后输入自己的出生信息，给 A 留下一支密封签。

后端动作：

1. 调用 B 的排盘与规则分析。
2. 保存 B 的命盘摘要或加密命盘。
3. 更新 A 可见状态：B 已留签。

不返回给 A：

- B 的出生信息。
- B 的完整八字。
- B 的私密推论。

### 4.8 A 打开求来的签

```text
POST /api/wechat/relation-requests/{request_id}/private-view
```

用途：A 输入自己的出生信息，基于 A + B 的密封命盘生成 A 视角关系签。

后端动作：

1. 调用 A 的排盘与规则分析。
2. 读取 B 的密封命盘摘要。
3. 调用关系签分析器。
4. 调用 LLM 做受控转译。
5. 生成只给 A 看的私密结果。
6. 更新 B 可见状态：A 已打开。

### 4.9 求签状态

```text
GET /api/wechat/relation-requests/{request_id}/status
```

用途：A/B 查看求签状态。

A 可见：

- 哪个 B 已留签。
- A 是否已打开。
- B 是否回馈。

B 可见：

- 自己是否已留签。
- A 是否已打开。
- A 是否回馈。

双方都不可见：

- 对方出生信息。
- 对方私密结果。

## 5. 建议新增关系签分析器

建议新建：

```text
web/backend/app/services/relation_sign_service.py
```

它负责把 `paipan + rules` 转换为小程序可消费的数据结构。

核心输入：

- A 的 `paipan/rules`。
- B 的 `paipan/rules`。
- 视角类型：B 视角/ A 视角。
- 动线类型：落签/求签。
- 时辰精度：准确时辰/大概时段/不知道时辰。

核心输出：

```python
{
    "sign_name": "有风但不落地",
    "ambiguity_level": "light",  # strong / light / neutral
    "is_romantic_tension_supported": true,
    "relationship_tone": "有好奇牵引，但不适合逼问",
    "time_precision": "full",  # full / approximate / date_only
    "viewer_role": "A",  # A / B
    "flow_type": "request",  # drop / request
    "attraction_points": [],
    "friction_points": [],
    "a_trigger_to_b": "",
    "b_response_pattern": "",
    "suggested_action": "",
    "evidence": []
}
```

## 6. 命理判断维度

第一版不建议直接沿用“总分/合不合”的合婚模型，而是拆成关系签需要的维度。

建议维度：

### 6.1 吸引与触发

参考：

- 日干五合。
- 日支六合/三合/半合。
- 一方日主/用神是否补另一方结构。
- 桃花/红艳等情感神煞是否产生叠加。

输出：

- 是否有暧昧牵引。
- 牵引强弱。
- 牵引更偏好奇、照顾、挑战、稳定、表达欲。

### 6.2 摩擦与卡点

参考：

- 日支六冲/刑/害。
- 旺衰同强导致争主导。
- 一方日主五行成为另一方忌神。
- 关键宫位冲动。

输出：

- 节奏不一致。
- 回应感不足。
- 容易用玩笑/冷处理绕开真实表达。
- 容易一方追、一方退。

### 6.3 非暧昧判断

不是所有组合都应写成暧昧。需要识别：

- 命理牵引弱。
- 冲突强于吸引。
- 更适合朋友/轻社交表达。

输出：

> 这支签更像一次轻破冰，不像强暧昧牵引。

## 7. 隐私与数据边界

必须设计为：

- A 能看到 B 的身份与行为状态。
- A 看不到 B 生日。
- A 看不到 B 完整八字。
- A 看不到 B 私密推论。
- 求签动线中，B 的八字密封保存，A 只能读取 A 视角结果。
- B 不能读取 A 的出生信息与 A 视角结果。
- B 不知道 A 发给了多少人。
- 后端只保存必要摘要，避免长期保存完整敏感信息。

建议存储层分两类：

- 完整命盘临时缓存：用于生成结果，设置过期时间。
- 签状态与统计：可长期保存，但不含出生信息明文与私密结果明文。

## 8. 登录与权限

首版需要权限管理，因为 A 必须知道哪个 B 看了、算了。

建议：

- A 创建签前必须微信登录或手机号登录。
- B 打开落地页可先预览，生成结果前必须微信登录或手机号登录。
- 优先微信登录，手机号作为补充。
- 后端用用户 ID 绑定签、打开记录、生成记录与回馈记录。

权限规则：

- A 可以读取自己创建的签状态。
- A 可以看到 B 的头像/昵称、打开状态、生成状态、回馈内容。
- A 不能读取 B 的出生信息、完整八字、私密结果。
- A 可以读取自己求签生成的 A 视角结果。
- B 可以读取自己的私密结果。
- B 可以看到 A 是否打开了 B 留下的密封签。
- B 不能读取 A 的分发人数和其他 B 的状态。

## 9. 和现有报告层的关系

首版关系签不是长报告，不直接使用 `report/templates/*.md.j2`。

但如果后续出现付费深度报告，应回到现有铁律：

- 命理深度报告走 `report/`。
- 小程序关系签只负责轻互动与入口。
- 付费报告需要可追溯到 `report/spec/` 的方法论与质量标准。

## 10. LLM 受控转译链路

首版直接接入 LLM，但 LLM 不做命理判断，只做表达转译。

处理链路：

1. `compute_paipan` 生成 A/B 排盘。
2. `compute_rules` 生成 A/B 规则分析。
3. `relation_sign_service.py` 计算吸引、摩擦、暧昧强度、时辰置信度。
4. LLM 根据结构化结论生成签文。
5. 安全过滤器检查禁用表达。

LLM 输入必须包含：

- 结构化命理依据。
- 暧昧强度标签。
- 时辰精度。
- 禁止输出项。
- 目标输出结构。

LLM 禁止输出：

- TA 喜欢你/不喜欢你。
- 你们一定有结果/没有结果。
- 正缘、孽缘、克你等强判决。
- 操控、恐吓、羞辱式建议。

## 11. 第一阶段实现建议

阶段 1：产品验证

- 新建小程序页面原型。
- 后端可用 mock 命理结构 + LLM 生成签文。
- 重点验证 A 分享、B 打开、B 回赠。

阶段 2：接入真实引擎

- A/B 均调用 `/api/engine/paipan`。
- 新增关系签分析器。
- 接入 LLM 受控转译。

阶段 3：质量与安全

- 建立案例集。
- 对比不同结果语气。
- 输出必须经过安全边界过滤。

## 12. 待技术确认

- 小程序是否使用原生微信小程序，还是 Taro/uni-app。
- 后端是否沿用当前 FastAPI 服务。
- 微信登录与手机号登录的组合方式。
- 是否需要为分享 token 做过期机制。
- 生产环境如何处理出生信息加密与清理。
