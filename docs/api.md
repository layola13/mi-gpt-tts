# 🔗 接口定义

本项目主要实现了 `MiGPT` 用到的以下两个接口规范：

### GET /api/tts.mp3

文字合成音频，请求示例：`/api/tts.mp3?speaker=BV700_streaming&text=很高兴认识你`

其中，请求参数 `speaker` 为指定音色名称或标识，可选。

> 注意：小爱音箱在访问音频链接时，可能会将请求链接中的 `&text=` 转义成 `+text=`，你需要在 Server 端手动修复请求参数。相关 [issue](https://github.com/idootop/mi-gpt/issues/120)

### GET /api/speakers

获取音色列表

| 属性    | 说明     | 示例              |
| ------- | -------- | ----------------- |
| name    | 音色名称 | `灿灿`            |
| gender  | 性别     | `女`              |
| speaker | 音色标识 | `BV700_streaming` |

返回值示例

```json
[
  {
    "name": "广西老表",
    "gender": "男",
    "speaker": "BV213_streaming"
  },
  {
    "name": "甜美台妹",
    "gender": "女",
    "speaker": "BV025_streaming"
  }
]
```
