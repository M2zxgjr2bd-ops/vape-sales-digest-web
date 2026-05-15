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
      lines.push(`影响市场：${inferMarket(item)}｜影响产品：${inferProductType(item)}`);
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
  const itemLines = items.slice(0, 30).map((item, index) => {
    return [
      `${index + 1}. [${item.sourceGroup}] ${item.sourceName}`,
      `title: ${item.title}`,
      `url: ${item.url}`
    ].join("\n");
  });

  const response = await client.responses.create({
    model: openAiModel,
    instructions: [
      "你是 OUKITEL VAPEIN 的电子烟行业销售情报助手。",
      "只能使用输入里的标题和链接，不要虚构发布日期、数据、公司动作或监管结论。",
      "如果证据不足，要明确写“待人工核验”或“公开信号不足”。",
      "输出中文 Markdown，结构固定为：一、今日重点；二、监管风险；三、竞品/品牌动态；四、潜在客户机会；五、今日可发客户话术；六、对 OUKITEL VAPEIN 的销售建议。",
      "每条信息要说明为什么重要，并尽量落到销售动作。",
      "如果没有高质量 lead，就直接说明今天公开源没有抓到高置信客户线索。",
      "客户话术输出 2 到 4 条英文 WhatsApp 文案，短、自然、只有一个 CTA。"
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
              "",
              "抓取结果：",
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
