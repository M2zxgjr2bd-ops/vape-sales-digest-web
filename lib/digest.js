import OpenAI from "openai";

function formatDateParts(runAt, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(runAt);
}

function inferMarket(item) {
  const text = `${item.sourceName} ${item.title}`.toLowerCase();

  if (text.includes("uk") || text.includes("britain") || text.includes("mhra")) return "英国";
  if (text.includes("eu") || text.includes("europe")) return "欧盟";
  if (text.includes("uae") || text.includes("dubai")) return "阿联酋/迪拜";
  if (text.includes("saudi") || text.includes("sfda")) return "沙特/中东";
  if (text.includes("fda") || text.includes("ctp")) return "美国";
  return "待判断";
}

function inferProductType(item) {
  const text = item.title.toLowerCase();

  if (text.includes("2ml")) return "2ml";
  if (text.includes("2+10")) return "2+10";
  if (text.includes("disposable")) return "一次性";
  if (text.includes("pod")) return "换弹";
  if (text.includes("open")) return "开放式";
  if (text.includes("nicotine")) return "含尼古丁产品";
  return "待判断";
}

function inferImportance(item) {
  const text = item.title.toLowerCase();

  if (item.sourceGroup === "regulatory") {
    return "监管源更新通常直接影响合规、出货、清关或客户下单判断。";
  }

  if (/launch|new|release|introduces|announces/.test(text)) {
    return "可作为竞品新品和客户选品偏好的跟进话题。";
  }

  if (/distributor|partner|market|expands|expansion/.test(text)) {
    return "可能反映渠道扩张或品牌合作窗口，适合转成销售切入点。";
  }

  return "这条信息与市场动作相关，建议人工确认后再决定是否外呼。";
}

function inferAction(item) {
  const text = item.title.toLowerCase();

  if (item.sourceGroup === "regulatory") {
    return "优先核对受影响市场与SKU，准备向相关客户推送合规替代方案。";
  }

  if (/disposable|pod|open/.test(text)) {
    return "可准备同类产品选项，用于和客户做替代对比。";
  }

  if (/distributor|partner|wholesale/.test(text)) {
    return "可顺着渠道或合作方向寻找潜在品牌方/分销商线索。";
  }

  return "建议保留为观察项，必要时转成客户轻沟通话题。";
}

function articleSnippet(item, maxChars = 240) {
  const raw = item.articleDescription || item.articleText || "";
  if (!raw) {
    return "正文抓取不足，待人工核验。";
  }

  if (raw.length <= maxChars) {
    return raw;
  }

  return `${raw.slice(0, maxChars).trim()}...`;
}

function topItemsByGroup(items, group, count) {
  return items.filter((item) => item.sourceGroup === group).slice(0, count);
}

function renderFallbackDigest({ items, runAt, timeZone }) {
  const date = formatDateParts(runAt, timeZone);
  const top = items.slice(0, 3);
  const regulatory = topItemsByGroup(items, "regulatory", 5);
  const brands = items.filter((item) => item.sourceGroup === "brand" || item.sourceGroup === "media").slice(0, 6);
  const leads = topItemsByGroup(items, "lead", 3);

  const lines = [
    `电子烟行业销售情报日报 | ${date}`,
    "",
    "一、今日重点"
  ];

  if (top.length === 0) {
    lines.push("- 今日公开源没有抓到高置信更新，建议检查网络、来源页结构或补充数据源。");
  } else {
    top.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}`);
      lines.push(`来源：${item.sourceName}`);
      if (item.publishedAt) {
        lines.push(`发布时间信号：${item.publishedAt}`);
      }
      lines.push(`影响市场：${inferMarket(item)}｜影响产品：${inferProductType(item)}`);
      lines.push(`正文概览：${articleSnippet(item)}`);
      lines.push(`为什么重要：${inferImportance(item)}`);
      lines.push(`建议动作：${inferAction(item)}`);
      lines.push(`链接：${item.url}`);
      lines.push("");
    });
  }

  lines.push("二、监管风险");
  if (regulatory.length === 0) {
    lines.push("- 今日未抓到新的高置信监管项。");
  } else {
    regulatory.forEach((item) => {
      lines.push(`- ${inferMarket(item)}｜${item.title}`);
      lines.push(`  正文概览：${articleSnippet(item, 180)}`);
      lines.push(`  建议：${inferAction(item)}`);
      lines.push(`  链接：${item.url}`);
    });
  }

  lines.push("");
  lines.push("三、竞品/品牌动态");
  if (brands.length === 0) {
    lines.push("- 今日未抓到新的高置信竞品或媒体项。");
  } else {
    brands.forEach((item) => {
      lines.push(`- ${item.sourceName}｜${item.title}`);
      lines.push(`  正文概览：${articleSnippet(item, 180)}`);
      lines.push(`  对我方影响：${inferImportance(item)}`);
      lines.push(`  链接：${item.url}`);
    });
  }

  lines.push("");
  lines.push("四、潜在客户机会");
  if (leads.length === 0) {
    lines.push("- 当前版本未配置公开 lead 源，建议后续补充展会名单、分销商公告页或自有名单源。");
  } else {
    leads.forEach((item) => {
      lines.push(`- ${item.title}`);
      lines.push(`  线索来源：${item.sourceName}`);
      lines.push(`  正文概览：${articleSnippet(item, 180)}`);
      lines.push(`  建议动作：可人工确认后作为品牌/渠道切入点。`);
      lines.push(`  链接：${item.url}`);
    });
  }

  lines.push("");
  lines.push("五、今日可发客户话术");
  lines.push("1. Hi bro, we noticed some fresh regulatory and market updates today. If you are focusing on the UK or EU market, we can share a few compliant 2ml and 2+10 options that may fit your current demand. Would you like me to send them?");
  lines.push("2. Hi bro, some brands are still pushing new pod and disposable products, but many buyers are becoming more cautious about compliance and stable supply. If useful, I can send you a few matching OEM/ODM options for your market.");

  lines.push("");
  lines.push("六、对 OUKITEL VAPEIN 的销售建议");
  lines.push("- 优先把监管变化转成客户沟通理由，不要只转新闻。");
  lines.push("- 对英国/欧盟客户优先推合规 2ml、2+10、包装适配方案。");
  lines.push("- 对中东客户优先强调交付稳定、定制能力和渠道支持。");
  lines.push("- 尽快补充可公开访问的 lead 源，否则潜在客户机会部分会偏弱。");
  lines.push("- 当前是基础回退版摘要；配置 OPENAI_API_KEY 后，日报会更贴近销售判断。");

  return lines.join("\n");
}

async function renderAiDigest({ items, runAt, timeZone, openAiApiKey, openAiModel }) {
  const client = new OpenAI({ apiKey: openAiApiKey });
  const date = formatDateParts(runAt, timeZone);
  const itemLines = items.slice(0, 20).map((item, index) => {
    return [
      `${index + 1}. [${item.sourceGroup}] ${item.sourceName}`,
      `title: ${item.title}`,
      `url: ${item.url}`,
      `published_at: ${item.publishedAt || "unknown"}`,
      `description: ${item.articleDescription || "none"}`,
      `article_excerpt: ${item.articleText || "正文抓取不足，待人工核验。"}`
    ].join("\n");
  });

  const response = await client.responses.create({
    model: openAiModel,
    instructions: [
      "你是 OUKITEL VAPEIN 的电子烟行业销售情报助手。",
      "你拿到的是标题、链接、发布时间线索、页面描述和正文节选。必须先阅读正文节选，再做总结。",
      "禁止只看标题下结论。禁止虚构发布日期、数据、公司动作、监管结论和客户线索。",
      "如果正文不足以支持结论，要明确写“待人工核验”或“公开信号不足”。",
      "忽略目录页、搜索页、首页、榜单页、长期指南、评测汇总这类非具体新事件；除非正文明确出现了新的监管动作、品牌动作、渠道动作或合作动作。",
      "优先保留真正值得销售看的内容：监管变化、执法动作、市场准入、品牌新品、渠道合作、分销/代工机会。",
      "输出中文 Markdown，结构固定为：一、今日重点；二、监管风险；三、竞品/品牌动态；四、潜在客户机会；五、今日可发客户话术；六、对 OUKITEL VAPEIN 的销售建议。",
      "“一、今日重点”最多 3 条。每条必须写出：发生了什么、影响市场、影响产品、为什么重要、对中国工厂/外贸销售有什么影响、值不值得跟客户聊、是否建议跟进。",
      "“二、监管风险”只写真正有监管或执法信号的内容，每条给出风险点和建议动作。",
      "“三、竞品/品牌动态”只写具体品牌动作，不要把普通测评榜单当新闻。",
      "“四、潜在客户机会”只写能形成客户切入的线索；如果没有，就明确写今天公开源没有抓到高置信客户线索。",
      "“五、今日可发客户话术”输出 2 到 3 条英文 WhatsApp 文案，每条 2 到 4 句，短、自然、只保留一个 CTA。",
      "整体风格要像真正读完内容后的晨报，简洁，但必须让销售一眼看懂。"
    ].join("\n"),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `请基于以下公开抓取结果生成 ${date} 的电子烟行业销售情报日报。`,
              "",
              "业务背景：",
              "- 公司：OUKITEL VAPEIN",
              "- 重点市场：英国、欧盟、中东、迪拜",
              "- 重点产品：2ml 换弹、开放式、2+10、2+10+10、一次性大口数",
              "- 输出偏好：简洁、销售导向、适合早上快速阅读",
              "- 你需要尽量通读每条正文节选后再提炼，不要只做标题搬运。",
              "",
              "候选文章：",
              itemLines.join("\n\n")
            ].join("\n")
          }
        ]
      }
    ]
  });

  return response.output_text.trim();
}

export async function buildDigest({
  items,
  runAt,
  timeZone,
  openAiApiKey,
  openAiModel
}) {
  if (openAiApiKey) {
    try {
      const markdown = await renderAiDigest({
        items,
        runAt,
        timeZone,
        openAiApiKey,
        openAiModel
      });

      return {
        markdown,
        generationMode: "openai"
      };
    } catch (error) {
      return {
        markdown: `${renderFallbackDigest({ items, runAt, timeZone })}\n\n附注：AI 摘要生成失败，已自动回退到基础摘要。\n错误：${error instanceof Error ? error.message : "Unknown error"}`,
        generationMode: "fallback-after-openai-error"
      };
    }
  }

  return {
    markdown: renderFallbackDigest({ items, runAt, timeZone }),
    generationMode: "fallback"
  };
}
