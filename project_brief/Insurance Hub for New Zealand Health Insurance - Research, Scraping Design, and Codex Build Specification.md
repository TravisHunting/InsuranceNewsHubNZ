# Insurance Hub for New Zealand Health Insurance: Research, Scraping Design, and Codex Build Specification

## Executive design

The strongest version of this product is not simply a “news scraper.” It should be a **health-insurance intelligence hub** that continuously collects public information, normalizes it into a common data model, identifies what matters to a New Zealand health insurer, and separates **source facts** from **insurance-impact interpretation**.

I recommend keeping your original four categories as the user-facing taxonomy:

| Primary category | What belongs in it |
|---|---|
| **Competition** | Southern Cross, nib, UniMed/Accuro, AIA, Partners Life; premiums, benefits, product changes, claims, provider contracting, market developments, employer schemes |
| **Public Health System** | Health NZ performance, waiting times, hospital capacity, health targets, workforce, funding, regional performance, policy changes |
| **Technology & Surgery** | New surgical techniques, devices, robotic surgery, diagnostics, AI, implants, interventional procedures, new treatments likely to alter utilization or claims costs |
| **General NZ Health Insurance** | News specifically about private health insurance, affordability, premiums, claims inflation, uptake, consumer behavior and the public/private interface |

Do **not** add a large number of additional top-level categories. Instead, give every record multi-value themes such as `waiting-times`, `claims-cost`, `premiums`, `cancer`, `diagnostics`, `medical-devices`, `robotic-surgery`, `pharmac`, `regulation`, `workforce`, `provider-capacity`, `mental-health`, `regional-variation`, and `employer-cover`. This will make filtering far more useful without fragmenting the main navigation.

The research also changes the architecture I would use. ChatGPT Sites currently supports HTTP/HTTPS requests, D1 relational storage and R2 object storage, as well as hosted environment variables and secrets. However, OpenAI explicitly notes that some background services and hosting patterns are not supported. D1 is limited to 10 GB while R2 has no fixed storage limit. citeturn29view1turn29view2turn29view3

That means the safest initial design is:

**fetch from the server → normalize → classify → summarize → persist → export**, with a **resumable “Refresh sources” workflow rather than depending on cron/background processes**.

ChatGPT Sites is still in public beta and its limits can change, so the implementation should use the recommended Sites starter rather than force a conventional Next.js/server deployment architecture onto the environment. Every Sites deployment URL is considered production, so versions should be saved and reviewed before deployment. citeturn29view0

I would also make the first deployment **workspace-restricted rather than public**. Sites supports owner/admin, selected-user, workspace and—where enabled—public audiences. The product is primarily an internal research and intelligence tool, and restricting it initially also reduces the content-rights risk discussed below. citeturn29view1turn29view2

A major finding from the research is that the app must not treat every website equally:

**Feed/sitemap sources** should be almost entirely automated.

**Ordinary index-page sources** can be fetched reliably with modest fallback logic.

**Health NZ needs an explicit 403/manual-upload fallback.**

**Scoop must be disabled for organizational monitoring unless an appropriate Scoop Pro license is in place.**

Those distinctions will substantially improve the probability that the first Sites deployment actually works.

## Source landscape and recommended coverage

Your original three sources are all worth retaining, but the best intelligence set is considerably broader. In particular, direct competitor sources, government feeds, regulators and health-technology authorities fill important gaps that RNZ/Scoop alone cannot.

### Core New Zealand intelligence sources

| Source | Priority | Discovery method | What it contributes | First-build treatment |
|---|---:|---|---|---|
| **Health New Zealand / Te Whatu Ora** | Critical | Publication landing pages, news pages, linked PDFs | Quarterly system performance, health targets, district/regional performance, workforce, access and official announcements | Automatic attempt + robust 403/manual PDF fallback |
| **Ministry of Health** | Critical | Atom feeds | Policy, publications, regulation, statistics, system monitoring | Fully automatic |
| **Beehive – Health** | Critical | Portfolio RSS | Government health funding/policy announcements | Fully automatic |
| **RNZ** | Critical | Sitemap + article fetch | Independent NZ reporting on public health and private insurance | Fully automatic, slow crawler |
| **Southern Cross** | Critical | Sitemaps + newsroom URLs | Largest direct competitor intelligence | Fully automatic |
| **nib NZ** | Critical | News index/pagination + article links | Direct competitor announcements | Fully automatic |
| **UniMed** | Critical | Newsroom/homepage discovery | Direct competitor / own-market intelligence and Accuro transition context | Fully automatic |
| **AIA NZ** | High | Media Centre / Press Releases | Health-product, claims and insurer developments | Automatic, health-relevance filter |
| **Partners Life** | High | News & Views | Private Medical Cover, premiums, treatment benefits | Automatic, health-relevance filter |
| **Financial Services Council** | Critical | Health Insurance topic index | Sector statistics, research and policy | Fully automatic |
| **FMA** | High | Media releases | Conduct regulation and insurer obligations | Automatic + insurance-keyword filter |
| **Reserve Bank** | High | News index | Prudential insurance regulation | Automatic + insurance-keyword filter |
| **Commerce Commission** | High | Case register | Competition/provider contracting cases | Automatic + health/insurer filter |
| **Pharmac** | High | News and decisions | Medicine/device funding changes potentially moving costs between public/private systems | Automatic |
| **Medsafe** | High | Structured safety page | Medicine/device safety developments | Automatic |
| **Health NZ regional/district resources** | Critical | Publication collections | Better “local” view than relying primarily on councils | Included within Health NZ adapter |

Health NZ's performance-report collection explicitly describes its reports as quarterly updates on national system performance. Health NZ also publishes separate health-target resources, district/regional factsheets, mental-health target resources and employed-workforce quarterly reports. Together these are much more valuable for the Public Health System category than the single quarterly-performance page alone. citeturn34search2turn34search5turn34search15turn34search19turn34search24

The direct-fetch behavior deserves special attention. In this research environment, direct requests to both the Health NZ performance-report page and copyright page returned HTTP 403, even though search indexing could see the pages. That does **not** prove a deployed Sites fetch will always receive 403, but it is enough evidence that the application cannot safely assume conventional server-side scraping will always work. citeturn30view0turn34search2

Therefore Health NZ should have its own adapter with:

`AUTO_FETCH → if 200 parse normally → if 403 mark blocked → offer source URL + manual PDF upload → process uploaded report through exactly the same normalization pipeline.`

This is preferable to trying to circumvent Health NZ's WAF.

The Ministry of Health is unusually scraper-friendly for this use case. It explicitly provides feeds for media/news and publications, and the discovered endpoints are:

```text
https://www.health.govt.nz/feeds/media-atom.xml
https://www.health.govt.nz/feeds/publications-atom.xml
```

The Ministry's robots file permits the normal clean content URLs while disallowing search/faceted variants, and it advertises a sitemap. Thus the app should use the feeds, not repeatedly scrape query-result pages. citeturn30view4turn24view0turn24view1turn27view0

Beehive also provides first-class RSS feeds by portfolio. The Health feed discovered during research is:

```text
https://www.beehive.govt.nz/taxonomy/term/6724/feed
```

There is separately a Mental Health portfolio feed:

```text
https://www.beehive.govt.nz/taxonomy/term/6759/feed
```

Beehive explicitly describes its feeds as a way of receiving content when it is published, making them preferable to crawling the general release index. citeturn30view5turn31view0turn32view0turn32view1

RNZ should remain a core source. Its `robots.txt` advertises a compressed sitemap and specifies a generic crawl delay of seven seconds; some named crawlers receive ten- or twenty-second delays. Respect the generic seven-second interval using your own descriptive user agent. citeturn29view4

```text
https://www.rnz.co.nz/sitemap/sitemap.xml.gz
```

Southern Cross is even easier to discover reliably: its robots file has no general disallow and advertises two sitemaps. Current newsroom search results also show a year-based newsroom structure. citeturn29view5turn5search3

```text
https://www.southerncross.co.nz/sitemap.xml
https://www.southerncross.co.nz/society/sitemap.xml
```

For nib, use its News and Media index rather than crawling the entire site. Current results show that the index is paginated with `?page=N`, while some detail content resolves through an `api.nib.co.nz/news-and-media/news-details/...` host/path. Therefore `api.nib.co.nz` must be treated as an approved alias rather than being rejected as an off-domain redirect. citeturn5search2turn5search6turn5search10

```text
https://www.nib.co.nz/news-and-media
https://www.nib.co.nz/news-and-media?page=2
```

UniMed should be a named competitor source, with **Accuro treated as an entity alias rather than another active competitor**. UniMed's public site states that Accuro is now UniMed, while its earlier announcement described the portfolio transfer bringing the brands together. citeturn5search1turn5search5

AIA and Partners Life should also be included. AIA maintains a current NZ Media Centre and press-release archive; Partners Life's News & Views contains Private Medical Cover articles and has published direct medical-premium changes, making both material for competition monitoring. citeturn25search0turn25search4turn25search1turn25search9

The FSC is especially valuable because it supplies a sector-level view rather than an individual insurer's perspective. Its site has a dedicated Health Insurance topic, current research and sector statistics; its health-insurance tag page provides a relatively clean recent-content index. citeturn26search1turn26search5

Regulatory coverage is also important. The current Commerce Commission case involving the New Zealand Gynaecology Association concerns collective negotiation with Southern Cross over gynaecology services—exactly the sort of provider-cost and competition development that could be missed by a conventional “health insurance news” keyword search. citeturn26search0 FMA maintains a media-release stream relevant to insurer conduct, while RBNZ's news area captures prudential insurance developments. citeturn19search6turn26search6

### Technology and surgery sources outside New Zealand

For the forward-looking Technology & Surgery category, I would **not** scrape generic global medical news. The volume would be enormous and most records would have little insurance significance. Instead, use authoritative technology/regulatory sources and apply a strong insurance-impact filter.

The recommended set is:

| Source | Why it is useful | Scraping approach |
|---|---|---|
| **NICE** | Evaluates medical technologies, procedures and interventions in a healthcare-system context | Scrape structured published-guidance lists and detail pages |
| **FDA CDRH** | Major-device approvals and device news | Structured FDA feeds + strict procedure/device keyword filtering |
| **TGA Australia** | Geographically and clinically relevant neighboring regulator; excellent RSS coverage | RSS-first |
| **Medsafe NZ** | NZ-specific medicine/device safety | Parse dated safety table |
| **Pharmac** | NZ funding and hospital-device implications | Crawl recent news/decisions |

NICE's published-guidance listings can be filtered for interventional procedures, HealthTech and medical technologies, making it considerably more useful than an open-ended “medical innovation” news scrape. citeturn20search2

FDA provides structured device decision feeds, including 510(k) and PMA feeds. Do **not** ingest every 510(k); use them only when the title/device matches an insurance-impact whitelist such as robotic surgery, implants, valves, ablation, surgical navigation, diagnostic imaging, AI-assisted diagnostics, prostheses and other material procedures. citeturn20search3turn20search11

TGA is technically excellent for an aggregator because it publishes explicit RSS endpoints for safety alerts, market actions, news, media releases, safety updates, guidance and other content. citeturn25search6 Useful first-build feeds include:

```text
https://tga.gov.au/feeds/alert/safety-alerts.xml
https://tga.gov.au/feeds/alert/market-actions.xml
https://tga.gov.au/feeds/article/news.xml
https://tga.gov.au/feeds/article/safety-updates.xml
```

### What to do about Scoop

Scoop is useful editorially but is the clearest licensing constraint in the proposed source set.

Scoop itself states that use “in a professional context” requires a Scoop Pro licence, explicitly lists third-party media monitoring as professional use, and says unlicensed professional/commercial use is prohibited under its terms. citeturn30view2

Additionally, ordinary Scoop pages presented bot-verification/JavaScript friction during this research, while Scoop exposes RSS-style story-index feeds. Technically and contractually, **the wrong design is to build an anti-bot scraper around Scoop's public HTML pages**.

The correct first-build configuration is:

```text
SCOOP_ENABLED=false
SCOOP_LICENSE_MODE=unlicensed
SCOOP_FEED_URLS=
```

The Sources UI should say:

> Scoop professional monitoring requires appropriate Scoop Pro licensing. This connector is disabled until a licensed feed/access method is configured.

Once UniMed confirms licensing/permission, enable the source using the licensed or permitted feed mechanism instead of attempting to defeat the website's verification layer.

This also illustrates why the app needs a per-source rights model. New Zealand Digital Government guidance explicitly warns that the existence of a web feed does not itself grant permission to republish copyrighted third-party content. citeturn30view3

## Technical scraping specification

The main reliability principle should be **discovery and extraction are separate operations**.

Do not code one bespoke DOM selector that says, for example, “find `.article-copy-v2 > div:nth-child(3)`.” That is exactly how a scraper breaks after a redesign. Instead, give every source a small configuration object and use a common extraction engine.

### Discovery hierarchy

Each adapter should use this order:

**RSS/Atom → XML sitemap → recent index page → explicitly seeded page**

Feeds are best because they provide stable IDs, dates and URLs without repeatedly parsing navigation. Sitemaps are second best. HTML index pages are a last discovery mechanism, not the preferred article extractor.

The source registry should contain fields conceptually like:

```ts
type SourceConfig = {
  id: string;
  name: string;
  enabled: boolean;
  priority: 1 | 2 | 3;
  sourceType:
    | "rss"
    | "atom"
    | "sitemap"
    | "html-index"
    | "pdf-collection"
    | "table";
  seedUrls: string[];
  allowedHosts: string[];
  includeUrlPatterns: RegExp[];
  excludeUrlPatterns: RegExp[];
  minimumDelayMs: number;
  maxItemsPerRefresh: number;
  rightsMode:
    | "metadata_summary_only"
    | "cc_by_full_text"
    | "licensed_full_text"
    | "manual_review";
  licensingNote?: string;
};
```

For first-run bootstrap, retrieve at most approximately the previous twelve months. For routine refreshes, retrieve only recently discovered URLs plus URLs whose upstream feed says they changed. Do not recrawl the historical corpus on every refresh.

### HTTP behavior

Use native server-side `fetch` only. Do not use Playwright, Puppeteer, Selenium or a browser-emulation service. That would introduce unnecessary runtime weight and is particularly inappropriate for Sites given that OpenAI says some frameworks/background/hosting patterns are unsupported. citeturn29view3

Each request should:

```text
Use HTTP(S) only
Use a descriptive scraper User-Agent containing an organization/contact identifier
Set an Accept header appropriate to XML/HTML/PDF
Follow at most 5 redirects
Reject redirects outside the source's allowlisted hosts
Use a 15-second HTML timeout
Use a 30-second PDF timeout
Cap HTML at roughly 5 MB
Cap PDFs at roughly 25 MB initially
Honor Retry-After
Persist ETag and Last-Modified where supplied
Send If-None-Match / If-Modified-Since on subsequent requests
```

Do not sleep for lengthy retry periods inside a request. Persist a `next_attempt_at` timestamp and let the next refresh step retry later.

HTTP status handling should be deterministic:

| Response | Behavior |
|---|---|
| `200` | Parse |
| `304` | Mark unchanged |
| `301/302/307/308` | Follow only to approved host |
| `401` | Mark authentication-required |
| `403` | One attempt only, then mark `blocked` |
| `404/410` | Mark deleted/unavailable |
| `429` | Honor `Retry-After`, pause source |
| `500–599` | Persist retry with exponential backoff |
| malformed/HTML challenge | Mark `bot_challenge`, do not hammer |

For RNZ, set the minimum interval to **at least 7,000 milliseconds**, because that is its published generic crawl delay. citeturn29view4

### Robots handling

Before the first fetch from a host:

1. Retrieve `/robots.txt`.
2. Parse rules for the configured user agent or `*`.
3. Cache the result for 24 hours.
4. Apply `Disallow`.
5. Apply `Crawl-delay` when present.
6. Harvest sitemap URLs advertised there.

Never allow an administrator to override `Disallow` from the UI without changing code/configuration.

The Ministry example demonstrates why this matters: its robots policy disallows faceted forms such as `/news?` and `/publications?`, while its clean content URLs and feeds are available. The scraper should deliberately choose the supported access path rather than accidentally crawling filtered-search URLs. citeturn27view0

### HTML extraction

For each candidate page, extraction should proceed in this exact order.

**Canonical URL**

```text
link[rel="canonical"]
→ og:url
→ final response URL
```

Normalize by removing fragments and tracking parameters such as:

```text
utm_source
utm_medium
utm_campaign
utm_term
utm_content
gclid
fbclid
```

Do not remove arbitrary functional query parameters.

**Structured metadata**

Parse every `script[type="application/ld+json"]`, including objects embedded in `@graph`, and find types including:

```text
NewsArticle
Article
Report
BlogPosting
PressRelease
```

Extract:

```text
headline
alternativeHeadline
datePublished
dateModified
author
publisher
description
articleBody
mainEntityOfPage
```

Then fill missing fields from OpenGraph/article metadata:

```text
meta[property="og:title"]
meta[property="og:description"]
meta[property="article:published_time"]
meta[property="article:modified_time"]
meta[name="author"]
meta[name="description"]
```

**Main content**

Try roots in this order:

```css
article
main article
[itemtype*="Article"]
main
```

Inside the selected root preserve semantically meaningful:

```css
h1, h2, h3, p, ul, ol, li, blockquote, table
```

Remove:

```css
nav,
aside,
footer,
form,
script,
style,
noscript,
iframe,
[aria-label*="share" i],
[class*="share" i],
[class*="newsletter" i],
[class*="related" i],
[class*="advert" i],
[class*="promo" i]
```

If no semantic `<article>` yields enough content, apply a **content-density fallback**: identify the subtree containing the greatest paragraph text volume relative to link text, equivalent in principle to Readability-style extraction.

The source-specific parser should only be the final fallback. It should never be the primary path.

Content validation before accepting a record:

```text
title >= 10 characters
body >= 250 meaningful characters for an article
publication date not implausibly in the future
canonical host in allowed-host list
not obviously a login/error/challenge page
paragraph-to-navigation ratio reasonable
```

Challenge signatures should include phrases such as:

```text
verify you are human
checking your browser
enable JavaScript to continue
access denied
unusual traffic
captcha
```

### Source-specific first-build rules

**RNZ**

```text
Discovery:
  https://www.rnz.co.nz/sitemap/sitemap.xml.gz

Include:
  same-host URLs under /news/

Exclude:
  /admin/
  non-article sitemap records

Rate:
  >= 7 seconds between article requests

Extraction:
  JSON-LD → semantic article → density extractor

Rights default:
  metadata_summary_only
```

RNZ's sitemap and crawl delay are explicitly supplied in its robots file. citeturn29view4

**Southern Cross**

```text
Discovery:
  https://www.southerncross.co.nz/sitemap.xml
  https://www.southerncross.co.nz/society/sitemap.xml

Filter:
  newsroom/news URLs, especially /news/YYYY/

Extraction:
  JSON-LD → article/main → density

Entity:
  Southern Cross Health Insurance
  alias Southern Cross Medical Care Society

Rights:
  metadata_summary_only
```

The sitemaps are explicitly advertised by Southern Cross. citeturn29view5

**nib**

```text
Discovery:
  https://www.nib.co.nz/news-and-media
  then ?page=2, ?page=3 ... until no unseen article URLs

Approved hosts:
  www.nib.co.nz
  nib.co.nz
  api.nib.co.nz

Likely detail family:
  /news-and-media/...
  /news-and-media/news-details/...

Stop pagination:
  when page has zero new canonical article URLs
  OR repeats previous page fingerprint
  OR configured page cap reached

Extraction:
  structured metadata → main/article → density

Rights:
  metadata_summary_only
```

Current indexing shows both the paginated public newsroom and `api.nib.co.nz` detail URLs, so the approved-host alias is important. citeturn5search2turn5search6turn5search10

**UniMed**

Do not depend on an assumed historic URL structure. Begin from the site's Newsroom navigation and/or sitemap discovered through its current site, then persist the article URLs that it exposes. Include both `UniMed` and `Accuro` as entity keywords, but normalize Accuro to a UniMed entity alias because the public site now describes Accuro as UniMed. citeturn5search1

**AIA**

```text
Seed:
  https://www.aia.co.nz/en/about-aia/media-centre.html
  https://www.aia.co.nz/en/about-aia/media-centre/press-releases.html

Discovery:
  collect same-domain press-release links

Pre-filter:
  health
  medical
  claims
  surgery
  cancer
  health insurance
  treatment
  product
  hospital
  medical cover
```

This avoids ingesting every executive appointment or generic corporate announcement while retaining health/claims intelligence. The current AIA Media Centre exposes both latest press releases and report/insight material. citeturn25search0turn25search4

**Partners Life**

```text
Seed:
  https://www.partnerslife.co.nz/news-and-views/

Discovery:
  collect article links from newest-first index
  do not require JavaScript "Load more" for routine recent updates
  use sitemap discovery as secondary mechanism if exposed

Pre-filter:
  Private Medical Cover
  medical
  PHARMAC
  hospital
  treatment
  premium
  health
  surgery
```

Partners Life currently publishes private-medical treatment and premium content, including direct medical-premium-change notices. citeturn25search1turn25search9

**Financial Services Council**

```text
Seed:
  https://blog.fsc.org.nz/tag/health-insurance

Collect:
  article title
  date
  author
  detail URL
  article text where processing is permitted

Always classify:
  Competition or General NZ Health Insurance
  plus themes such as market_size, premiums, coverage, employer_cover
```

The dedicated Health Insurance topic makes aggressive broad-site crawling unnecessary. citeturn26search5

**Ministry of Health**

```text
Discovery:
  https://www.health.govt.nz/feeds/media-atom.xml
  https://www.health.govt.nz/feeds/publications-atom.xml

Use feed GUID/link/date/title as authoritative discovery metadata.
Fetch detail page only for relevant records.
Never crawl /news? or /publications? search variants.
```

This directly follows the Ministry's feed and robots configuration. citeturn30view4turn27view0

**Beehive**

```text
Discovery:
  https://www.beehive.govt.nz/taxonomy/term/6724/feed
  https://www.beehive.govt.nz/taxonomy/term/6759/feed

Optional:
  Commerce and Consumer Affairs portfolio feed
  Local Government portfolio feed
  filtered with strong health keywords

Fetch detail only after relevance screening feed title/description.
```

Beehive provides portfolio-specific feeds, including Health, Mental Health and Local Government. citeturn31view0

**Health NZ**

```text
Seed collections:
  /publications/performance-quarterly-reports-2025-26
  /publications/health-targets-performance-resources-2025-26
  /publications/mental-health-and-addiction-targets-performance-resources-2025-26
  /publications/district-and-regional-factsheets-2025-26
  /publications/employed-workforce-quarterly-reports-2025-26

Also:
  /news-and-updates

At runtime derive current and preceding NZ fiscal-year slugs,
rather than permanently assuming 2025-26.

Behavior:
  GET collection
  if 200: harvest PDF/detail links
  if 403: set source state blocked_403
          show manual upload control
          retain source URL for operator
          do not loop/retry
```

The additional collections listed above are all current Health NZ publication families and materially broaden the public-system picture. citeturn34search2turn34search5turn34search15turn34search19turn34search24

**Commerce Commission**

Track the case register using health-care and insurer entity keywords. In addition to new-case discovery, refresh open cases because the page's status/outcome can change. The current NZ Gynaecology Association case illustrates why this is useful: it is an open competition matter involving negotiations with Southern Cross. citeturn26search0

**Pharmac**

Use its News and Resources pages and apply a funding/device relevance filter. Pharmac separately offers subscription streams for hospital medical-device stakeholders and pharmaceutical-funding decisions, which confirms these are distinct information streams worth monitoring. citeturn26search3

**Medsafe**

Its Safety Communications page is a relatively traditional structured table. Parse each row as:

```text
publication/update date
product/device name
communication title
detail link
```

and fetch only device, surgical, diagnostic or materially insurance-relevant medicine notices. citeturn20search1turn20search5

**TGA**

Use RSS directly rather than HTML discovery. TGA explicitly publishes the feed catalog and feed URLs. citeturn25search6

**FDA**

Consume structured PMA/510(k) feeds but heavily pre-filter before fetching detail pages. citeturn20search3turn20search11

**NICE**

Retrieve the published-guidance listing with filters for HealthTech, medical technologies and interventional procedures. Use guidance reference as the stable external ID and fetch only newly published/updated records. citeturn20search2

### Deduplication and syndicated articles

This is important for RNZ/Scoop/press-release aggregation.

Use four levels:

```text
1. canonical_url exact match
2. feed GUID / source external ID
3. SHA-256 of normalized title + normalized main text
4. near-duplicate clustering
```

Near-duplicate matching should compare normalized titles plus roughly the first 1,000–2,000 characters. A cheap token-set/Jaccard or SimHash implementation is sufficient before bringing in embeddings.

Store:

```text
cluster_id
is_cluster_primary
original_publisher
syndication_sources[]
```

When the same RNZ story appears elsewhere, the dashboard should show one intelligence item with multiple source appearances rather than five duplicate cards.

## Categorization, article intelligence, and Health NZ reports

### Article record

The application should normalize every source into essentially the following model:

```ts
Article {
  id
  sourceId
  sourceName
  sourceType

  discoveredUrl
  canonicalUrl
  externalId

  title
  subtitle
  authors[]
  publisher

  publishedAt
  modifiedAt
  firstSeenAt
  lastCheckedAt
  fetchedAt

  excerpt
  wordCount

  bodyStorageKey?      // only where rights mode permits
  bodyHash

  primaryCategory
  categories[]
  themes[]
  entities[]
  insurers[]
  geographies[]
  technologies[]
  procedures[]

  nzRelevanceScore
  insuranceImpactScore
  impactDirection
  classificationConfidence

  summaryShort
  summaryDetailed
  whyItMatters

  factStatements[]
  analystInference

  rightsMode
  extractionStatus
  enrichmentStatus
  dataQualityScore

  duplicateClusterId?
}
```

An especially important distinction is:

```text
factStatements = what the source actually says
analystInference = what this could mean for NZ health insurance
```

For example, do not turn “hospital waiting times rose” into “private claims will rise” and present both as equally established facts. The second is an interpretation.

### Deterministic filtering before AI

Do not send every global medical article to a model. Calculate cheap relevance scores first.

An indicative NZ health-insurance keyword dictionary:

```text
health insurance
private health
private medical
medical insurance
premium
claims
Southern Cross
nib
UniMed
Accuro
AIA
Partners Life
private hospital
elective surgery
specialist
diagnostic
waiting list
waiting time
Health New Zealand
Te Whatu Ora
Ministry of Health
PHARMAC
```

Public-system terms:

```text
planned care
elective
first specialist assessment
hospital capacity
emergency department
health target
workforce
vacancy
primary care
GP access
cancer
diagnostic
regional
district
waiting
theatre
outpatient
inpatient
```

Technology/surgery terms:

```text
robotic surgery
robot-assisted
minimally invasive
implant
prosthesis
medical device
surgical device
surgical navigation
AI diagnostic
artificial intelligence
imaging
MRI
CT
PET
radiology
ablation
catheter
transcatheter
endoscopy
gene therapy
cell therapy
biologic
precision medicine
digital surgery
```

Only send candidates above a threshold into expensive semantic classification.

### AI enrichment

The enrichment prompt should require structured JSON, not free-form prose:

```json
{
  "relevant": true,
  "primary_category": "Public Health System",
  "categories": ["Public Health System", "General NZ Health Insurance"],
  "themes": ["waiting-times", "elective-surgery"],
  "insurers": [],
  "technologies": [],
  "procedures": ["elective surgery"],
  "nz_relevance_score": 94,
  "insurance_impact_score": 4,
  "impact_direction": ["private-utilisation-up"],
  "summary_short": "...",
  "summary_detailed": "...",
  "why_it_matters": "...",
  "facts": ["..."],
  "analyst_inference": "...",
  "confidence": 0.92
}
```

Set the insurance-impact scale as:

| Score | Meaning |
|---:|---|
| **5** | Direct material impact: premiums, claims, products, insurer regulation, provider contracts, major public/private substitution |
| **4** | Strong likely impact: waiting-time/capacity change, important procedure/device or funding decision |
| **3** | Plausible medium-term insurer relevance |
| **2** | Weak/indirect relevance |
| **1** | Peripheral context |
| **0** | Exclude |

The LLM must receive the source text and be explicitly instructed:

> Do not introduce factual claims that are not present in the supplied source. Separate source facts from forward-looking insurance interpretation.

Crucially, **the application should still run without an OpenAI API key**. If `OPENAI_API_KEY` is missing:

```text
use keyword classification
generate an extractive 1–2 paragraph summary
set enrichment_status = "basic"
```

When the key is present, use the current OpenAI Responses API server-side with a configurable `OPENAI_MODEL` environment variable. Sites supports HTTPS and hosted secrets, so the key can remain server-side. citeturn29view2turn29view3

### Health NZ performance intelligence

The Health NZ part should be a first-class product area, not merely another list of PDFs.

The Health NZ publication family covers quarterly national performance, and separate current collections cover health targets, mental-health targets, district/regional performance and workforce. citeturn34search2turn34search5turn34search15turn34search19turn34search24

Create a `PerformanceReport` and `PerformanceMetric` model:

```ts
PerformanceReport {
  id
  title
  fiscalYear
  quarter
  periodStart
  periodEnd
  sourceUrl
  publishedAt
  pdfStorageKey?
  extractedTextStorageKey?
  summary
  extractionStatus
}

PerformanceMetric {
  id
  reportId

  metricKey
  metricName
  valueNumeric?
  valueText
  unit?

  targetNumeric?
  targetText?

  comparatorValue?
  delta?
  direction?

  geography?
  populationGroup?

  pageNumber
  sourceExcerpt
  confidence
  comparableToPreviousQuarter
}
```

PDF processing should be:

```text
download PDF
→ validate application/pdf signature/content type
→ extract page-by-page text
→ preserve page boundaries
→ identify headings and tables
→ send manageable text chunks to structured metric extractor
→ validate every numeric result against source page text
→ save metric
→ compare only compatible metrics with preceding quarter
```

For the Sites runtime, use a pure-JavaScript PDF text extraction library compatible with the generated Sites starter—preferably `pdfjs-dist` without browser rendering/canvas. **Do not require OCR, headless Chromium, native binaries or image rendering in the first build.** If text extraction returns too little text, change the report state to:

```text
needs_manual_review
```

rather than manufacturing a summary.

The Health NZ dashboard should contain:

**Quarter snapshot** — latest report, publication date and five-to-eight most material changes.

**Public-system pressure** — metrics associated with waiting, planned care, specialist access, acute demand and capacity.

**Regional variation** — material district/regional divergence from the corresponding Health NZ factsheets.

**Workforce** — signals from the separate employed-workforce quarterly reports.

**Insurance implications** — clearly labelled interpretation, not part of the government source itself.

For example:

> **Observed:** metric X moved from A to B quarter-on-quarter.  
> **Insurance interpretation:** sustained deterioration could increase demand for privately funded diagnostics/treatment.  
> **Confidence:** Medium.

Never compare two quarters merely because metric labels look similar. Require a stable normalized `metricKey`, compatible population/geography, same unit and no detected definition change.

### Copilot-ready exports

A single CSV is not enough. Give the user a **Copilot Export** action producing three complementary files:

```text
insurance-hub-export.csv
insurance-hub-export.json
insurance-hub-briefing.md
```

CSV should be one record per article with columns such as:

```text
published_date
source
title
url
primary_category
categories
themes
entities
insurers
summary
why_it_matters
insurance_impact_score
impact_direction
nz_relevance_score
classification_confidence
```

JSON should preserve the full structured record, including fact/inference separation and performance metrics.

Markdown should be optimized as a briefing document:

```markdown
# NZ Health Insurance Intelligence Briefing

## High-impact developments

### Article title
Source:
Published:
Category:
Impact score:

Summary:
...

Why it matters:
...

Source facts:
...

Insurance interpretation:
...

Original source:
...
```

All export screens should share the same filters:

```text
date range
primary category
theme
source
insurer/entity
minimum impact score
NZ/global
keyword
```

## GPT Sites architecture, reliability, and rights

### Sites architecture

OpenAI's current Sites developer documentation specifically supports D1 for durable structured data and R2 for uploaded/files data. Hosted secrets can be configured from Site settings. HTTP, HTTPS and WebSockets are supported, while raw TCP is not; some background services and hosting patterns are unsupported. citeturn29view1turn29view2turn29view3

I would therefore use:

```text
D1 binding: DB
R2 binding: FILES
```

D1 contains:

```text
sources
source_cursors
articles
article_categories
article_entities
scrape_runs
scrape_events
performance_reports
performance_metrics
settings
```

R2 contains only:

```text
permitted PDF originals
permitted extracted report text
permitted long-form source text
generated export bundles if caching exports is useful
```

Do **not** put every page's raw HTML into storage. It adds little intelligence value, rapidly consumes storage and makes content-rights management more difficult.

OpenAI currently caps D1 Sites storage at 10 GB while documenting no fixed R2 storage limit, making this separation especially sensible. citeturn29view3

### Resumable refresh rather than a background worker

This is an important Sites-specific design decision.

Implement:

```text
POST /api/refresh/start
POST /api/refresh/step
GET  /api/refresh/:runId
```

`start` creates the run and stores source cursors.

`step` performs **one small unit of work**, for example:

```text
fetch feed
fetch one article
parse one report
enrich five already-fetched articles
```

It commits the new cursor and returns.

While the Source Refresh screen is open, the browser repeatedly calls `step`. The orchestrator should choose whichever source is currently eligible according to `next_allowed_at`, rather than sitting idle during RNZ's seven-second crawl delay.

This gives you a pseudo-job queue without relying on an always-running process. It is appropriate because OpenAI explicitly warns that some background services are unsupported. citeturn29view3

Later, should Sites gain a stable scheduling mechanism—or should UniMed provide an external scheduler—the same protected `step` workflow can be called externally without redesigning the scraper.

### Rights and extracted article text

The requested phrase “Actual Article data should be extracted” needs one important qualification.

Technically, yes: the scraper should be capable of extracting the article body because that produces substantially better categorization and summaries.

But **extraction, retention and redistribution are three separate permissions**.

Default rights modes:

| Source class | Processing | Retention/export default |
|---|---|---|
| Government source clearly licensed for reuse | Extract | Retain according to licence and attribution requirements |
| Private news publisher | Extract only where permitted | Metadata + derived summary by default |
| Competitor corporate site | Extract for analysis | Metadata + summary by default |
| Scoop without professional licence | **Do not monitor** | Disabled |
| Scoop with proper licence | According to licence | Configure based on licensed rights |
| Unknown | Minimal metadata | Manual review |

New Zealand Digital Government guidance specifically notes that third-party content remains protected and that a web feed does not itself confer republication rights. citeturn30view3

For government content, the same guidance encourages open licensing but also notes exclusions such as third-party material, logos and other protected elements. Therefore rights should be attached to each source instead of assuming “`.govt.nz` means unrestricted.” citeturn30view3

The UI should consequently expose:

```text
View extracted source text
```

only when the record's `rightsMode` permits it. Otherwise display the summary/excerpt plus **Open original source**.

That also means the Copilot export should not blindly dump every copyrighted article into a file.

### Source health must be a product feature

Create a Sources page that looks something like:

| Source | State | Last success | New items | Last HTTP | Failures | Rights |
|---|---|---|---:|---:|---:|---|
| RNZ | Healthy | 10:43 | 3 | 200 | 0 | Summary only |
| Health NZ | Blocked | Yesterday | 0 | 403 | 1 | Manual ingest available |
| Ministry | Healthy | 10:40 | 2 | 200 | 0 | Government |
| Scoop | Disabled | — | — | — | — | License required |
| nib | Healthy | 10:39 | 1 | 200 | 0 | Summary only |

Each source should have:

```text
Test Source
Refresh Source
Enable/Disable
Last discovery result
Last parse result
Recent errors
Robots status
Minimum request interval
Rights mode
```

This matters far more than silently swallowing scrape errors.

### Security

Do not build a generic `/api/scrape?url=...` endpoint.

All fetches must originate from a preconfigured source registry and an allowlist of hosts. Otherwise the scraper becomes an SSRF primitive.

Redirects should be allowed only to approved aliases. A source such as nib is exactly why the alias list should be explicit rather than simply “same hostname.” citeturn5search2turn5search10

Never render scraped HTML directly. Store/render normalized text and trusted app markup.

Keep API keys and other secrets in Sites-hosted environment settings, not source files or `.openai/hosting.json`; that is also OpenAI's documented Sites practice. citeturn29view2

The application should handle **public information only**. Do not add member claims, medical histories or other patient data: OpenAI's current Sites rules explicitly prohibit processing Protected Health Information. citeturn29view3

## Codex-ready build prompt

The following is the implementation prompt I would pass to Codex. It incorporates the source/reliability research above and deliberately tells Codex not to solve runtime problems by quietly dropping features.

```text
Build a production-quality ChatGPT Site called "Insurance Hub".

PURPOSE

Insurance Hub is an internal intelligence dashboard focused on the New Zealand
private health insurance market.

It collects public news, insurer announcements, NZ public-health-system
information, regulatory developments, Health New Zealand performance material,
and selected global medical-technology/surgery developments.

It then:
1. extracts normalized article/report data,
2. de-duplicates it,
3. categorizes it,
4. summarizes it,
5. explains potential relevance to NZ health insurance,
6. presents it in a searchable/filterable dashboard,
7. provides downloadable CSV, JSON and Markdown exports suitable for feeding
   into other analytical tools such as Copilot.

The application must be designed specifically for the supported ChatGPT Sites
runtime. Do not assume a conventional persistent Node server, cron daemon,
Docker container, filesystem, raw TCP, Playwright, Puppeteer or native binaries.

Use the recommended Sites starter and TypeScript.
Use native fetch for HTTP.
Use D1 for durable structured application state.
Use R2 for permitted PDFs/files and optionally permitted long text.
Use Sites-hosted environment variables/secrets.

The first deployment should be suitable for workspace-restricted use.

Do not process patient/member data, PHI, payment data or private medical data.
This application processes public intelligence only.


NON-NEGOTIABLE DESIGN PRINCIPLES

1. The app must still function without an OPENAI_API_KEY.
   In that state use deterministic keyword categorization and extractive
   summaries.

2. If OPENAI_API_KEY is configured, use the current OpenAI Responses API
   server-side for structured enrichment. Use OPENAI_MODEL from an environment
   variable rather than hardcoding a specific model.

3. Never expose OPENAI_API_KEY or any other secret client-side.

4. Do not make the entire app fail because one scraper fails.

5. Do not use brittle CSS-class-only scraping.

6. Discovery and extraction must be separate:
   RSS/Atom > sitemap > HTML index page > manually seeded URL.

7. Respect robots.txt, crawl delays, 429 Retry-After and source rate limits.

8. Never bypass CAPTCHAs, JS verification, WAFs or access controls.

9. Never create an arbitrary "fetch any URL" endpoint.
   All outbound fetch destinations must be present in the source registry.

10. Never render scraped source HTML into the UI.
    Convert it into normalized plain/structured text.

11. Distinguish observed source facts from analyst/AI inference.

12. Preserve source provenance for every fact and report metric.

13. Rights/redistribution must be configurable by source.
    Do not automatically export full article bodies from private publishers.

14. The Sites runtime may not provide a persistent background-worker/cron
    environment. Build refresh jobs as resumable small steps persisted to D1.


SITE NAVIGATION

Create these top-level screens:

Dashboard
News Feed
Health NZ Performance
Sources
Exports

Create an article detail route.

Recommended paths:

/
 /news
 /news/:id
 /health-nz
 /sources
 /exports


VISUAL DESIGN

Build this as a professional internal intelligence product, not a consumer news
site.

Use:
- clean information-dense cards,
- restrained typography,
- highly readable tables,
- category badges,
- impact-score badges,
- source-health indicators,
- clear date/filter controls.

Responsive design is required.

Do not overuse gradients, animations, large hero sections or decorative imagery.

Dashboard should make the most important intelligence immediately obvious.


PRIMARY CATEGORIES

Use exactly these primary categories:

1. Competition
2. Public Health System
3. Technology & Surgery
4. General NZ Health Insurance

Records may have multiple categories, but must have one primary category.


THEMES

Support multi-value themes including:

premiums
claims-cost
claims-frequency
utilisation
waiting-times
elective-surgery
specialist-access
diagnostics
cancer
mental-health
workforce
hospital-capacity
private-provider-capacity
public-funding
regulation
competition
provider-contracting
product-change
benefits
employer-cover
market-size
pharmac
medical-devices
robotic-surgery
ai
digital-health
imaging
implants
gene-cell-therapy
regional-variation
health-equity


CORE ENTITIES

Normalize insurer entities and aliases.

Southern Cross Health Insurance
aliases:
- Southern Cross
- Southern Cross Medical Care Society
- SCHI

nib New Zealand
aliases:
- nib
- nib NZ

UniMed
aliases:
- UniMed
- Accuro
Treat Accuro as a legacy/entity alias of UniMed for current intelligence rather
than a separate current competitor.

AIA New Zealand
aliases:
- AIA
- AIA NZ

Partners Life
aliases:
- Partners Life


DATABASE

Bind a D1 database as DB.

Create schema/migrations for at least:

sources
source_cursors
articles
article_categories
article_entities
scrape_runs
scrape_events
performance_reports
performance_metrics
settings


SOURCES TABLE

Suggested fields:

id TEXT PRIMARY KEY
name TEXT NOT NULL
source_type TEXT NOT NULL
enabled INTEGER NOT NULL
priority INTEGER NOT NULL
rights_mode TEXT NOT NULL
config_json TEXT NOT NULL

last_success_at TEXT
last_attempt_at TEXT
last_http_status INTEGER
last_error TEXT
consecutive_failures INTEGER DEFAULT 0
next_allowed_at TEXT

robots_checked_at TEXT
robots_status TEXT
robots_json TEXT

created_at TEXT
updated_at TEXT


ARTICLE TABLE

Include:

id
source_id
source_name

discovered_url
canonical_url UNIQUE
external_id

title
subtitle
authors_json
publisher

published_at
modified_at
first_seen_at
last_checked_at
fetched_at

excerpt
word_count
body_storage_key
body_hash

primary_category
categories_json
themes_json
entities_json
insurers_json
geographies_json
technologies_json
procedures_json

nz_relevance_score
insurance_impact_score
impact_direction_json
classification_confidence

summary_short
summary_detailed
why_it_matters

fact_statements_json
analyst_inference

rights_mode

extraction_status
enrichment_status
data_quality_score

duplicate_cluster_id

created_at
updated_at


HEALTH NZ REPORT TABLE

performance_reports:

id
title
fiscal_year
quarter
period_start
period_end
source_url
published_at
pdf_storage_key
extracted_text_storage_key
summary
extraction_status
created_at
updated_at


PERFORMANCE METRICS

performance_metrics:

id
report_id

metric_key
metric_name

value_numeric
value_text
unit

target_numeric
target_text

comparator_value
delta
direction

geography
population_group

page_number
source_excerpt
confidence

comparable_to_previous_quarter

created_at


R2

Bind R2 as FILES.

Use it only for:
- public reports/PDFs where storage is appropriate,
- extracted report text,
- full article text when the source rights mode explicitly permits retention,
- generated export files if useful.

Do not persist every fetched raw HTML page.


RIGHTS MODES

Implement:

metadata_summary_only
cc_by_full_text
licensed_full_text
manual_review

For metadata_summary_only:
- it is permissible for the parser to obtain content as needed for processing
  where configured,
- do not expose or export the complete body,
- retain normalized metadata, excerpt and derived summaries,
- full body_storage_key should normally be null unless explicitly configured.

For cc_by_full_text:
- allow body storage and exports,
- preserve source and attribution information.

For licensed_full_text:
- allow according to configured licensed rights.

For manual_review:
- do not expose full body until changed by an administrator.


SOURCE REGISTRY

Implement a typed source registry in code.

Every source has:

id
name
enabled
sourceType
seedUrls
allowedHosts
includeUrlPatterns
excludeUrlPatterns
minimumDelayMs
maxItemsPerRefresh
rightsMode
licensingNote
parser hints

The registry, not a user-provided URL, controls outbound requests.


SOURCE: RNZ

Enabled by default.

Discovery:
https://www.rnz.co.nz/sitemap/sitemap.xml.gz

Allowed hosts:
www.rnz.co.nz
rnz.co.nz

Only ingest relevant /news/ pages.

Never fetch /admin/.

Minimum delay:
7000 ms between RNZ requests.

Rights:
metadata_summary_only

Routine behavior:
- fetch sitemap conditionally,
- identify unseen/recent /news/ URLs,
- pre-filter likely health/insurance candidates,
- fetch detail only if relevant,
- use canonical/JSON-LD/article extraction.


SOURCE: SOUTHERN CROSS

Enabled.

Discovery:
https://www.southerncross.co.nz/sitemap.xml
https://www.southerncross.co.nz/society/sitemap.xml

Allowed hosts:
www.southerncross.co.nz
southerncross.co.nz

Prefer newsroom/news URLs such as /news/YYYY/.

Entity:
Southern Cross Health Insurance

Rights:
metadata_summary_only


SOURCE: NIB

Enabled.

Discovery:
https://www.nib.co.nz/news-and-media

Pagination:
?page=N

Allowed hosts:
www.nib.co.nz
nib.co.nz
api.nib.co.nz

The scraper must accept article/detail URLs returned through api.nib.co.nz as an
approved source alias.

Stop paginating when:
- page produces no unseen article URLs,
- content fingerprint repeats,
- or a configured safe page cap is reached.

Rights:
metadata_summary_only


SOURCE: UNIMED

Enabled.

Start with:
https://unimed.co.nz/

Discover its current newsroom/news links from sitemap/robots/navigation rather
than assuming an old URL structure.

Include UniMed and Accuro keyword aliases.

Rights:
metadata_summary_only


SOURCE: AIA NZ

Enabled.

Seeds:
https://www.aia.co.nz/en/about-aia/media-centre.html
https://www.aia.co.nz/en/about-aia/media-centre/press-releases.html

Ingest only records passing health/insurance relevance pre-filter.

Useful terms:
health
medical
claims
health insurance
surgery
treatment
hospital
cancer
health product

Rights:
metadata_summary_only


SOURCE: PARTNERS LIFE

Enabled.

Seed:
https://www.partnerslife.co.nz/news-and-views/

Filter for:
Private Medical Cover
medical
hospital
treatment
premium
PHARMAC
health
surgery
claims

Rights:
metadata_summary_only


SOURCE: FINANCIAL SERVICES COUNCIL

Enabled.

Seed:
https://blog.fsc.org.nz/tag/health-insurance

This source is high value.

Prefer the dedicated health-insurance topic content instead of broad FSC
scraping.

Rights:
metadata_summary_only unless configured otherwise.


SOURCE: MINISTRY OF HEALTH

Enabled.

Discovery feeds:

https://www.health.govt.nz/feeds/media-atom.xml
https://www.health.govt.nz/feeds/publications-atom.xml

Allowed:
www.health.govt.nz

Use feed GUID/link/title/date for discovery.
Fetch clean detail pages only after relevance screening.

Do not crawl filtered /news? or /publications? URLs.

Treat this as a high-trust primary source.


SOURCE: BEEHIVE HEALTH

Enabled.

Feeds:

https://www.beehive.govt.nz/taxonomy/term/6724/feed
https://www.beehive.govt.nz/taxonomy/term/6759/feed

First is Health.
Second is Mental Health.

Use feed-first ingestion and fetch relevant detail releases only.

Treat this as a high-trust primary source.


SOURCE: HEALTH NEW ZEALAND

Enabled but block-aware.

Base host:
https://www.healthnz.govt.nz/

Seed collection:
https://www.healthnz.govt.nz/publications/performance-quarterly-reports-2025-26

Also track collection families:

/publications/health-targets-performance-resources-2025-26
/publications/mental-health-and-addiction-targets-performance-resources-2025-26
/publications/district-and-regional-factsheets-2025-26
/publications/employed-workforce-quarterly-reports-2025-26

Also monitor:
/news-and-updates

Do not permanently hardcode only 2025-26.

Calculate the current New Zealand fiscal year and previous fiscal year and probe
the corresponding collection slugs.

Health NZ may return HTTP 403 to server-side requests.

Required behavior:
- attempt one normal polite fetch,
- if 403, do not loop or bypass,
- mark the source "Blocked – manual ingest available",
- provide the operator the original source URL,
- provide PDF upload to the Health NZ Performance page,
- run uploaded PDF through exactly the same processing pipeline.

Never use CAPTCHA/WAF bypass services.


SOURCE: FMA

Enabled.

Seed:
https://www.fma.govt.nz/news/all-releases/media-releases/?start=0

Collect recent media releases.
Pre-filter for:
insurance
insurer
health insurance
life and health
conduct
fair consumer outcomes
claims
benefit

Rights:
metadata_summary_only


SOURCE: RESERVE BANK NZ

Enabled.

Seed:
https://www.rbnz.govt.nz/news-and-events/news

Pre-filter:
insurance
insurer
solvency
prudential
insurance legislation
licensed insurer

Rights:
metadata_summary_only


SOURCE: COMMERCE COMMISSION

Enabled.

Track recent Case Register items and open cases using terms including:

health care
Southern Cross
nib
UniMed
health insurer
private hospital
surgeon
medical
specialist
provider

Open cases must be revisited because status/outcome may change.

Rights:
metadata_summary_only


SOURCE: PHARMAC

Enabled.

Use Pharmac news/resources pages.

Prioritize:
medicine funding decisions
hospital medical devices
diagnostics
new treatment access
cancer medicines
high-cost medicines
device procurement
changes likely to affect private treatment costs

Rights should default to the appropriate government/manual-reviewed mode.


SOURCE: MEDSAFE

Enabled.

Seed:
https://www.medsafe.govt.nz/safety/SafetyCommunications.asp

This is a legacy ASP/table style page.

Parse rows and anchors structurally:
date
product/device
communication
detail URL

Prioritize medical devices, diagnostics, surgical technology and high-impact
treatment safety information.


SOURCE: NICE

Enabled.

Use NICE published-guidance discovery.

Prioritize:
HealthTech
Medical technologies
Interventional procedures

Use the guidance reference as external_id.

Technology relevance whitelist includes:
robot-assisted surgery
robotic surgery
surgical navigation
implant
prosthesis
transcatheter
ablation
diagnostic
imaging
artificial intelligence
digital surgery
minimally invasive
gene therapy
cell therapy

Rights:
metadata_summary_only


SOURCE: FDA DEVICES

Enabled.

Feeds:

https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn-rss.cfm
https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma-rss.cfm

Do NOT ingest the entire 510(k) feed into the final dashboard.

Pre-filter with the technology whitelist.

Fetch details only for relevant candidates.


SOURCE: TGA AUSTRALIA

Enabled.

Feeds:

https://tga.gov.au/feeds/alert/safety-alerts.xml
https://tga.gov.au/feeds/alert/market-actions.xml
https://tga.gov.au/feeds/article/news.xml
https://tga.gov.au/feeds/article/safety-updates.xml

Pre-filter for medical/surgical/device relevance.


SOURCE: SCOOP

DISABLED BY DEFAULT.

Environment:

SCOOP_ENABLED=false
SCOOP_LICENSE_MODE=unlicensed
SCOOP_FEED_URLS=

Show a Sources-page warning:

"Scoop professional monitoring requires appropriate Scoop Pro licensing. This
source is disabled until licensed/permitted access is configured."

If SCOOP_LICENSE_MODE != licensed:
- do not crawl Scoop,
- do not attempt bot verification workarounds,
- do not fetch public story HTML as a monitoring service.

If licensed:
- use the licensed/permitted feed/access method configured through
  SCOOP_FEED_URLS,
- apply rights based on the actual licence.


ROBOTS ENGINE

Implement a shared robots engine.

For each host:
1. fetch /robots.txt,
2. cache result for 24 hours,
3. apply rules for our user agent or *,
4. obey Disallow,
5. obey Crawl-delay,
6. harvest Sitemap directives.

If robots fetch fails because the file genuinely does not exist, continue
cautiously using source defaults.
If robots explicitly prohibits a path, do not fetch it.


HTTP FETCHER

Create one central safeFetch().

Requirements:

- HTTP/HTTPS only
- host must be in current source allowedHosts
- approved redirect hosts only
- max 5 redirects
- HTML timeout approx 15s
- PDF timeout approx 30s
- HTML maximum approx 5 MB
- PDF maximum approx 25 MB
- descriptive User-Agent
- Accept headers
- gzip/br supported by runtime
- ETag persistence
- Last-Modified persistence
- conditional GET

Status handling:

200 parse
304 unchanged
401 authentication_required
403 blocked
404/410 gone
429 honor Retry-After and persist next_allowed_at
5xx persist retry time with exponential backoff

Do not hold a server request open for long retry sleeps.


HTML EXTRACTION PIPELINE

Canonical:
link[rel=canonical]
then og:url
then final response URL.

Structured data:
parse all application/ld+json objects and @graph objects.

Recognize:
NewsArticle
Article
BlogPosting
Report
PressRelease

Metadata priority:
JSON-LD
OpenGraph/article meta
document semantic elements

Main-content root priority:
article
main article
[itemtype*="Article"]
main
content-density fallback

Preserve:
h1
h2
h3
p
ul
ol
li
blockquote
table

Remove:
script
style
noscript
iframe
nav
aside
footer
forms
share controls
related-content blocks
newsletter blocks
advertising/promotional blocks

Do not make a hashed CSS class the only way a source can parse.


VALIDATION

Reject/flag candidates when:

title < 10 chars
article body < 250 meaningful chars
content is a login/error/challenge page
canonical URL redirects to unapproved host
publication date is implausible
content appears mostly navigation
content type does not match expectation

Detect bot/challenge phrases including:
verify you are human
checking your browser
enable JavaScript to continue
access denied
captcha
unusual traffic

Return a typed failure reason rather than throwing an unhandled error.


CANONICALIZATION

Strip:
fragments
utm_source
utm_medium
utm_campaign
utm_content
utm_term
gclid
fbclid

Do not remove arbitrary query params required for content identity.

Persist:
discovered_url
canonical_url
final_response_url where useful.


DEDUPLICATION

Use:

1. canonical URL
2. source GUID/external ID
3. SHA-256 normalized content hash
4. near-duplicate clustering

Normalize titles:
lowercase
Unicode normalize
collapse punctuation
collapse whitespace
remove obvious publisher suffixes

Near duplicate:
compare title tokens plus initial body text using a cheap deterministic
similarity method.

Create:
duplicate_cluster_id
is_cluster_primary if useful

Do not show five cards where several sites syndicated the same underlying story.


PRE-CLASSIFICATION

Before AI, compute deterministic relevance.

NZ health insurance terms include:

health insurance
private health
private medical
premium
claims
Southern Cross
nib
UniMed
Accuro
AIA
Partners Life
private hospital
elective surgery
specialist
diagnostic
waiting list
Health New Zealand
Te Whatu Ora
Ministry of Health
PHARMAC

Technology terms include:

robotic
robot-assisted
surgery
surgical
implant
prosthesis
medical device
diagnostic
imaging
MRI
CT
PET
ablation
catheter
transcatheter
AI
artificial intelligence
gene therapy
cell therapy
biologic
digital surgery
minimally invasive

Discard extremely low-value global material before AI enrichment.


AI ENRICHMENT

If OPENAI_API_KEY exists, enrich relevant records server-side.

Use a strict structured JSON schema.

Return:

relevant boolean

primary_category:
Competition
Public Health System
Technology & Surgery
General NZ Health Insurance

categories array
themes array
entities array
insurers array
geographies array
technologies array
procedures array

nz_relevance_score 0-100

insurance_impact_score 0-5

impact_direction array, values such as:
premium_pressure_up
premium_pressure_down
private_utilisation_up
private_utilisation_down
claims_cost_up
claims_cost_down
coverage_pressure
competition_change
regulatory_change
unclear

summary_short
summary_detailed
why_it_matters
facts array
analyst_inference
confidence 0-1

Prompt requirement:

"Use only facts contained in the supplied source text for the factual fields.
Do not invent numbers, dates, outcomes or causal claims. Keep factual statements
separate from insurance interpretation. An inference must be labelled as an
inference."

If AI fails:
- retain article,
- use deterministic category,
- use extractive summary,
- mark enrichment_status=failed,
- permit reprocessing later.


INSURANCE IMPACT SCORE

0 = irrelevant
1 = peripheral
2 = weak/indirect
3 = plausible medium-term impact
4 = strong likely impact
5 = direct/material insurer impact

Score 5 examples:
premium/product change
material claims information
insurer/provider contract
insurance regulation
major public/private substitution event

Do not force every article to score highly.


HEALTH NZ PDF PROCESSING

Implement public PDF upload plus automatic URL fetching where accessible.

Do not use OCR in the first implementation.

Use a pure-JavaScript PDF text extractor compatible with the Sites runtime,
preferably pdfjs-dist if it builds/runs correctly without browser rendering.

Extract page-by-page text and retain page numbers.

If text extraction produces insufficient meaningful text:
set extraction_status = needs_manual_review
do not hallucinate a report summary.

For successfully extracted reports:

identify:
fiscal year
quarter/reporting period
publication date

Extract metrics into strict structured data.

Every extracted metric must store:
metric name
value
unit
target if stated
geography/population if stated
page number
short source excerpt
confidence

Before persisting a numeric metric generated by AI:
verify the numeric representation exists in the page text.

Do not silently correct source numbers.

Generate a report summary using only validated extracted data.


QUARTER COMPARISON

Normalize metric aliases to stable metricKey values.

Compare to preceding quarter only if:
same metric key
same unit
compatible population
compatible geography
no detected definition change

Otherwise mark:
comparable_to_previous_quarter = false

Never imply improvement/deterioration when definitions changed.


HEALTH NZ PERFORMANCE UI

Create:

Latest quarter summary
Quarter-over-quarter changes
Public-system pressure panel
Regional variation panel
Workforce panel
Health-target material
Insurance implications panel
Report library

Every metric shown must offer:
source report
page number
source excerpt

Clearly label "Insurance implication" as analysis/inference.


DASHBOARD

Top row:

Latest intelligence count
High-impact items
Sources healthy / degraded
Latest successful refresh
Latest Health NZ report

Sections:

High-impact developments
Competition watch
Public health system
Technology & surgery watch
Latest NZ health-insurance stories
Health NZ latest-quarter snapshot

Cards should contain:

category
source
published date
title
short summary
why it matters
impact score
impact direction
themes
insurers/entities
original-source action


NEWS FEED

Table/list view with filters:

date
category
theme
source
insurer/entity
impact score
NZ/global
search keyword

Sort options:
newest
highest impact
highest NZ relevance
source

Support query parameters so filtered views are shareable.


ARTICLE DETAIL

Show:

title
source
published
author
categories/themes
entities
impact score
NZ relevance

Summary

Why it matters

Source facts

Insurance interpretation

Technologies/procedures if applicable

Extraction metadata:
last fetched
data-quality score
canonical URL

Open original source

Only show full extracted source text when rights_mode permits it.


SOURCES PAGE

This is essential.

For every source show:

enabled/disabled
healthy/degraded/blocked/licensing-disabled
last attempt
last success
new items last run
last HTTP status
consecutive failures
next allowed request time
robots status
rights mode

Provide:

Test Source
Refresh Source

For Health NZ:
if blocked, show Manual PDF Upload.

For Scoop:
show licensing warning and keep disabled unless configured.


REFRESH ARCHITECTURE

Do not implement the core refresh as a process requiring a persistent background
worker.

API:

POST /api/refresh/start
POST /api/refresh/step
GET /api/refresh/:runId

start:
create scrape_run
create/persist source cursors

step:
process one bounded work unit
persist results/cursor
return progress and suggested next-call delay

While refresh UI is open:
client calls step repeatedly until complete.

Scheduler algorithm:
- find eligible source/work item whose next_allowed_at <= now
- process it
- if one source is rate-limited, work on another source
- never wait seven seconds doing nothing merely because RNZ is rate limited

A refresh can be resumed after browser/request interruption.

Persist failures as scrape_events.


SCRAPE RUN UI

Show live:

source being processed
articles discovered
articles fetched
new articles
duplicates
rejected irrelevant
errors
remaining sources

Provide Stop UI action.
Stopping should simply stop sending future refresh-step requests; persisted
completed work remains valid.


EXPORTS

Create downloadable:

insurance-hub-export.csv
insurance-hub-export.json
insurance-hub-briefing.md

Apply current export filters:

date range
categories
themes
sources
insurer/entity
minimum impact
NZ/global

CSV fields:

published_date
source
title
url
primary_category
categories
themes
entities
insurers
summary
why_it_matters
insurance_impact_score
impact_direction
nz_relevance_score
classification_confidence

JSON:
complete permitted normalized records.

Markdown:
human-readable briefing organized by category/impact.

Never add complete article body to an export unless the record rights_mode
explicitly allows it.


SOURCE RIGHTS

Display attribution/source for every record.

Never export competitor/private-media full text by default.

Government/public records can use the configured rights mode, but do not assume
every asset on a government domain has identical rights.

Images/logos should not be scraped/re-hosted in the MVP.


DATE HANDLING

Store all timestamps in UTC.

Render in Pacific/Auckland by default.

Keep source publication timestamp separately from:
first_seen_at
fetched_at
last_checked_at

Never use fetched_at as publication date.

Do not infer publication date from HTTP Last-Modified unless explicitly labelled
as a fallback with low confidence.


SEARCH

Implement local D1-backed text search sufficient for:
title
summary
themes
entities
source

If D1 FTS is supported cleanly in the Sites environment, use it.
Otherwise use indexed normalized search fields and LIKE-based search initially.
Do not introduce an external search service in the MVP.


SECURITY

No arbitrary URL fetch endpoint.

No client-visible API key.

Validate all URLs using URL parser.

Only https/http.

Host allowlist per source.

Redirect allowlist.

No raw HTML rendering.

Escape output.

Validate uploads:
PDF only for Health NZ report upload
size cap
PDF magic/header validation

Do not collect PHI or member data.


ENVIRONMENT VARIABLES

Support:

OPENAI_API_KEY
OPENAI_MODEL

SCRAPER_USER_AGENT
SCRAPER_CONTACT

SCOOP_ENABLED
SCOOP_LICENSE_MODE
SCOOP_FEED_URLS

Use sensible non-secret defaults where possible.

Provide .env.example without secret values.

Do not commit secrets.


ERROR HANDLING

No unhandled network failures.

Represent typed extraction errors:

robots_disallowed
blocked_403
rate_limited
not_found
server_error
timeout
too_large
unexpected_content_type
bot_challenge
parse_failed
insufficient_content
pdf_text_failed
licensing_disabled

Surface errors on Sources page.


OBSERVABILITY

Each scrape_event should record:

run_id
source_id
url if safe
stage
status
http_status
error_type
message
duration_ms
created_at

Do not log secrets or entire source documents.


TESTS

Write unit tests for:

URL canonicalization
tracking-parameter removal
redirect host validation
robots matching
RSS parsing
Atom parsing
sitemap parsing
gzip sitemap handling if required
JSON-LD extraction
@graph extraction
OpenGraph fallback
semantic article extraction
challenge detection
date parsing
content validation
hash dedupe
near-duplicate detection
category keyword scoring
impact score validation
CSV escaping/export
metric comparison rules

Create small synthetic HTML/XML fixtures rather than committing copyrighted
articles as test fixtures.


SOURCE DIAGNOSTIC TESTS

The Sources page's Test Source action must actually exercise:

robots
discovery
one permitted candidate fetch where applicable
metadata extraction
content extraction
date extraction

Return a human-readable diagnostic, e.g.:

Discovery: OK, 42 candidate URLs
Candidate: https://...
HTTP: 200
Canonical: found
Title: found
Published date: found
Body: 1,284 words
Parser: structured-data + semantic article
Overall: Healthy

For blocked source:

Discovery: FAILED
HTTP: 403
Action: manual ingest required

This diagnostic feature is a required part of the first build, not optional.


BOOTSTRAP BEHAVIOR

Do NOT automatically download thousands of historic pages on first page load.

Provide an explicit administrator action:

"Initialize / Backfill"

Default backfill:
approximately previous 12 months where practical.

Routine refresh:
recent/new items only.

Allow source-specific backfill depth.


PERFORMANCE

Discovery should happen before article fetching.

Apply title/feed-description relevance filtering before detail-fetching for
broad feeds.

Apply deterministic relevance before AI enrichment.

Batch AI enrichment where appropriate.

Cache unchanged documents using ETag/Last-Modified.

Never fetch the same canonical URL twice in a run.


ACCESSIBILITY

Use semantic HTML.
Keyboard-accessible controls.
Meaningful table headers.
Visible focus states.
Accessible badges/status indicators that do not rely solely on color.


EMPTY AND FAILURE STATES

The app must look deliberate before any scraping occurs.

If database empty:
show setup/refresh guidance.

If OPENAI_API_KEY absent:
show small admin notice "AI enrichment not configured; basic classification is
active." Do not show this to ordinary users unless useful.

If Health NZ blocked:
show manual-upload workflow, not a broken page.

If Scoop disabled:
show licensing-disabled state, not an error.


SEED / DEMO DATA

Do not ship invented news presented as real.

It is acceptable to include clearly labelled synthetic sample records for UI
development, but production initialization must remove/ignore them.


ACCEPTANCE CRITERIA

The implementation is complete only when all of these are true:

1. Site builds in the ChatGPT Sites-supported environment.

2. D1 persistence works.

3. R2 binding works where needed.

4. Dashboard renders from database data.

5. News filtering works.

6. A refresh run survives individual source failures.

7. Refresh runs are resumable.

8. Source diagnostics are visible.

9. RNZ rate limit is respected.

10. Ministry Atom feed parses successfully or produces a clear diagnostic.

11. Beehive Health RSS parses successfully or produces a clear diagnostic.

12. Southern Cross sitemap parses successfully or produces a clear diagnostic.

13. nib discovery accepts api.nib.co.nz as an approved alias.

14. Health NZ 403 produces a manual-upload state rather than repeated requests.

15. A manually uploaded text-based Health NZ PDF can produce page-aware extracted
    text and a report record.

16. Scoop makes no network request when unlicensed/disabled.

17. At least one private-media source can be processed into metadata + summary
    without exposing its entire article body.

18. Duplicate articles do not create duplicate news cards.

19. The site works with no OPENAI_API_KEY using deterministic/basic summaries.

20. With OPENAI_API_KEY configured, structured enrichment populates categories,
    themes, impact score, facts, inference and summaries.

21. CSV download works.

22. JSON download works.

23. Markdown briefing download works.

24. Full article text is excluded from exports unless rights_mode permits it.

25. There is no arbitrary URL-fetch endpoint.

26. No API key appears in client JavaScript.

27. No scraped raw HTML is rendered.

28. Source dates and app fetch dates remain separate.

29. Health NZ metrics retain source page references.

30. Every AI-generated insurance implication is visually distinguished from
    source facts.


IMPLEMENTATION ORDER

Build in this order so the app remains functional after each stage:

A. Sites starter + navigation + D1 schema
B. source registry + safeFetch + robots
C. RSS/Atom/sitemap parsers
D. generic HTML article parser
E. canonicalization + dedupe
F. Ministry + Beehive + RNZ + Southern Cross adapters
G. nib + UniMed + AIA + Partners Life + FSC adapters
H. FMA + RBNZ + Commerce Commission + Pharmac + Medsafe
I. NICE + FDA + TGA technology sources
J. dashboard/news UI
K. resumable refresh engine + Sources diagnostics
L. deterministic classification
M. optional OpenAI structured enrichment
N. Health NZ PDF/manual-upload/report pipeline
O. Health NZ Performance dashboard
P. CSV/JSON/Markdown exports
Q. tests, error states and production review

Do not skip a difficult source by replacing it with fake data.

Where a live source is inaccessible from the Sites runtime, preserve the
adapter and surface the exact diagnosed failure state. In particular,
Health NZ must have a manual PDF ingest fallback and Scoop must remain disabled
unless appropriate licensed access is configured.

Before finalizing:
- run the complete test suite,
- run source diagnostics,
- inspect the Sites build output,
- fix TypeScript/build/runtime errors,
- verify no secrets are bundled client-side,
- verify all redirects are allowlisted,
- verify all downloads work,
- verify app remains useful when some external sites are unavailable.
```

The main architectural conclusion is that the **first version should optimize for graceful degradation rather than maximum source count**. Ministry of Health, Beehive, RNZ, Southern Cross, nib, UniMed, FSC, AIA, Partners Life and the regulator/technology feeds can provide a strong automated backbone; Health NZ needs a designed-in manual PDF path because direct automated access may fail; and Scoop should not be treated as an ordinary web-scraping target because its own licensing terms explicitly encompass professional monitoring. citeturn30view2turn30view4turn29view4turn29view5turn34search2

That combination should yield a substantially more reliable first ChatGPT Sites deployment than an implementation based on ad-hoc page scraping, while still providing the full intelligence workflow you described: **source collection → actual content extraction where permitted → categorization → Health NZ performance intelligence → insurer-impact analysis → traceable source data → Copilot-ready export**.