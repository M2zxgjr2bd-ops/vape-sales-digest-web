const SHARED_KEYWORDS = [
  "vape",
  "vaping",
  "e-cigarette",
  "ecig",
  "nicotine",
  "pod",
  "disposable",
  "tobacco",
  "flavor",
  "flavour",
  "regulation",
  "bill",
  "pmta",
  "market",
  "launch",
  "wholesale",
  "oem",
  "odm",
  "distributor"
];

const STATIC_SOURCES = [
  {
    group: "regulatory",
    name: "FDA CTP Newsroom",
    url: "https://www.fda.gov/tobacco-products/ctp-newsroom",
    keywords: ["fda", "ctp", "warning", "authorization", "pmta", "nicotine", "ends"]
  },
  {
    group: "regulatory",
    name: "MHRA Vape Guidance Hub",
    url: "https://www.gov.uk/government/collections/mhra-e-cigarette-and-vape-products-guidance-hub",
    keywords: ["mhra", "vape", "guidance", "notification", "e-cigarette"]
  },
  {
    group: "regulatory",
    name: "UK Tobacco and Vapes Bill",
    url: "https://www.gov.uk/government/collections/the-tobacco-and-vapes-bill-2024",
    keywords: ["bill", "vapes", "tobacco", "uk", "restriction", "packaging"]
  },
  {
    group: "regulatory",
    name: "EU-CEG / DG SANTE",
    url: "https://health.ec.europa.eu/eu-common-entry-gate-eu-ceg/providing-information-tobacco-products-e-cigarettes-and-refill-containers-eu-common-entry-gate-eu_en",
    keywords: ["eu", "ceg", "refill", "e-cigarettes", "tobacco", "directive"]
  },
  {
    group: "regulatory",
    name: "UAE Tobacco Provisions",
    url: "https://u.ae/en/information-and-services/health-and-fitness/tobacco-provisions",
    keywords: ["uae", "tobacco", "excise", "smoking", "vape"]
  },
  {
    group: "regulatory",
    name: "UAE MoIAT ENDS Standard",
    url: "https://moiat.gov.ae/en/digital-participation/blogs/2021/10/18/uae-mandatory-regulation-for-electronic-nicotine-products",
    keywords: ["electronic nicotine", "moiat", "mandatory", "standard", "regulation"]
  },
  {
    group: "regulatory",
    name: "Saudi SFDA Regulations",
    url: "https://beta.sfda.gov.sa/en/regulations/79418",
    keywords: ["sfda", "saudi", "regulation", "nicotine", "electronic"]
  },
  {
    group: "media",
    name: "2Firsts",
    url: "https://www.2firsts.com/",
    keywords: ["2firsts", "vape", "nicotine", "market", "news"]
  },
  {
    group: "media",
    name: "Vaping360",
    url: "https://vaping360.com/",
    keywords: ["vaping360", "vape", "review", "news", "pod", "disposable"]
  },
  {
    group: "media",
    name: "ECigIntelligence",
    url: "https://ecigintelligence.com/",
    keywords: ["ecig", "intelligence", "market", "regulation", "nicotine"]
  },
  {
    group: "media",
    name: "Tobacco Reporter",
    url: "https://tobaccoreporter.com/",
    keywords: ["tobacco", "reporter", "vape", "nicotine", "market"]
  },
  {
    group: "brand",
    name: "Hayati",
    url: "https://hayativapor.com/",
    keywords: ["hayati", "launch", "flavor", "device", "pod", "disposable"]
  },
  {
    group: "brand",
    name: "ELFBAR",
    url: "https://www.elfbar.com/",
    keywords: ["elfbar", "launch", "pod", "flavor", "device", "market"]
  },
  {
    group: "brand",
    name: "Lost Mary",
    url: "https://www.lostmary.com/",
    keywords: ["lost mary", "launch", "device", "flavor", "market"]
  },
  {
    group: "brand",
    name: "Geek Bar",
    url: "https://www.geekbar.com/",
    keywords: ["geek bar", "launch", "disposable", "flavor", "device"]
  },
  {
    group: "brand",
    name: "Vaporesso",
    url: "https://www.vaporesso.com/",
    keywords: ["vaporesso", "pod", "open system", "device", "launch"]
  },
  {
    group: "brand",
    name: "OXVA",
    url: "https://www.oxva.com/",
    keywords: ["oxva", "open system", "pod", "device", "launch"]
  }
];

function makeLeadSources(leadSourceUrls) {
  return leadSourceUrls.map((url, index) => ({
    group: "lead",
    name: `Lead Source ${index + 1}`,
    url,
    keywords: ["wholesale", "private label", "oem", "odm", "distributor", "partner", "brand"]
  }));
}

export function buildSourceCatalog({ leadSourceUrls = [] } = {}) {
  return [...STATIC_SOURCES, ...makeLeadSources(leadSourceUrls)].map((source) => ({
    ...source,
    keywords: [...new Set([...SHARED_KEYWORDS, ...(source.keywords ?? [])])]
  }));
}
