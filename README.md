# 免域名网页版

这是一套可直接部署到 Vercel 的“电子烟行业销售情报日报”网页版。

你现在不需要：

- 购买域名
- 配 DNS
- 先接邮箱服务

你只需要把它部署到 Vercel，系统就会自动给你一个 `*.vercel.app` 地址。打开那个地址，就能看当天的日报。

## 这版已经做了什么

- [index.html](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/index.html) 是网页版首页
- [api/report/latest.js](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/api/report/latest.js) 返回当天日报数据
- [api/cron/daily-report.js](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/api/cron/daily-report.js) 现在只保留为受保护的“强制重新生成”入口
- [lib/source-catalog.js](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/lib/source-catalog.js) 内置监管、媒体、品牌来源
- [lib/source-fetcher.js](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/lib/source-fetcher.js) 会抓公开页面标题和链接，并尽量过滤目录页、搜索页、榜单页
- [lib/article-enricher.js](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/lib/article-enricher.js) 会继续抓文章正文节选，给 AI 真正可读的上下文
- [lib/digest.js](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/lib/digest.js) 负责生成日报正文
- [lib/run-daily-report.js](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/lib/run-daily-report.js) 负责生成日报、拆分网页 sections，并在同一天内做进程内缓存

## 最小环境变量

复制 [.env.example](/Users/lukachen/Documents/Codex/2026-05-15/https-www-2firsts-com-google-vignette/.env.example) 里的值到 Vercel Project 里。

如果你只做网页版，实际上一个变量都不填也能部署。

推荐一定要填：

- `OPENAI_API_KEY`
- `OPENAI_MODEL` 默认 `gpt-5-mini`
- `OPENAI_TIMEOUT_MS` 默认 `45000`
- `CRON_SECRET` 可选，但建议配上，用来保护后台接口

说明：

- `CRON_SECRET` 现在只用于受保护的后台接口
- 不配 `OPENAI_API_KEY` 也能跑，但只会退回基础摘要版，不会有“通读正文后再总结”的效果
- 新增 `MAX_DIGEST_ITEMS` 和 `MAX_ARTICLE_CHARS`，用于控制抓取阶段保留多少候选、每篇抓多长正文节选
- 新增 `OPENAI_ITEM_LIMIT` 和 `OPENAI_EXCERPT_CHARS`，用于控制真正送给 AI 的文章数量和每篇正文长度

## 部署步骤

1. 把这个目录导入到 Vercel 项目
2. 在 Vercel 的项目环境变量里填入最小变量
3. 部署到 Production
4. 打开你的 `https://你的项目名.vercel.app`
5. 首页会自动加载当天日报
6. 如果你想重新抓一次当天信息，点网页上的“重新抓取今日信息”

## 接口说明

- 网页首页：
  - `https://your-project.vercel.app`
- 获取当天日报 JSON：
  - `https://your-project.vercel.app/api/report/latest`
- 强制重新生成：
  - `https://your-project.vercel.app/api/report/latest?force=1`

## 官方依据

- Vercel 官方文档说明：项目部署后会自动获得一个 `*.vercel.app` 地址，所以网站本身不需要自定义域名。[Vercel domains docs](https://vercel.com/docs/domains/working-with-domains)
- OpenAI Responses API 官方文档显示：新项目推荐走 `responses.create(...)`，模型可直接用 `gpt-5-mini`。[OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses/create?api-mode=responses) [OpenAI model docs](https://platform.openai.com/docs/models/gpt-5-mini)

## 当前边界

- 这版已经能“打开网页 -> 抓公开页标题 -> 生成摘要 -> 展示当天日报”
- 当前“最新日报”是按请求动态生成，不是数据库持久化版本
- LinkedIn 这类需要登录或反爬强的平台，不适合直接靠公开抓取；`lead` 部分更适合补充展会名单、分销商公告页、品牌 partner/wholesale 页面
- 页面抓取目前是通用标题提取，不是站点专用爬虫，所以未来如果某些站点结构变化，需要微调抓取规则
- 我这次没有实际跑通部署，因为当前环境无法联网安装依赖，也没有你的 Vercel/OpenAI 密钥

## 建议你现在先做的事

1. 在 Vercel 项目里补上 `OPENAI_API_KEY`
2. 保持 `OPENAI_MODEL=gpt-5-mini`
3. 点网页上的“重新抓取今日信息”
4. 看页面里 `generationMode` 是否变成 `openai`
5. 如果方向对，再考虑下一步要不要加历史归档、登录保护、自动邮件
