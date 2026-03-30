export default async function handler(req, res) {
  try {
    const url = "https://publicgold.com.my/index.php?Itemid=53&id=1534&option=com_content&task=view";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Public Gold request failed: ${response.status}`);
    }

    const html = await response.text();

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const numberify = (value) => Number(String(value).replace(/,/g, ""));

    // LIVE TIMESTAMP: page contains duplicated old timestamps, so take the LAST match
    const liveTimestampMatches = [
      ...text.matchAll(/\(Last Update\s+([0-9]{1,2}-[A-Za-z]+-[0-9]{4}\s+[0-9:]+)\)\s*Public Gold Price \(24 Hours Live\)/gi)
    ];
    const liveTimestamp = liveTimestampMatches.length
      ? liveTimestampMatches[liveTimestampMatches.length - 1][1].trim()
      : null;

    // GAP: match globally and take LAST match so it follows the latest Public Gold entry
    const rm100Matches = [...text.matchAll(/RM\s*100\s*=\s*([0-9.]+)\s*gram/gi)];
    const gapPriceMatches = [...text.matchAll(/RM\s*([0-9,]{3,})\s*=\s*1\.0000\s*gram/gi)];
    const gapDateMatches = [...text.matchAll(/GOLD ACCUMULATION PROGRAM \(24K\)[\s\S]*?\(Last updated\s+([0-9]{1,2}-[A-Za-z]+-[0-9]{4})\)/gi)];

    const rm100Gram = rm100Matches.length ? Number(rm100Matches[rm100Matches.length - 1][1]) : null;
    const gapPrice = gapPriceMatches.length ? numberify(gapPriceMatches[gapPriceMatches.length - 1][1]) : null;
    const gapDate = gapDateMatches.length ? gapDateMatches[gapDateMatches.length - 1][1].trim() : null;

    // GOLD BAR section only
    const goldBarSectionMatch = text.match(/GOLD BAR \(24K\)([\s\S]*?)GOLD WAFER\s*-\s*DINAR \(24k\)/i);
    const goldBarSection = goldBarSectionMatch ? goldBarSectionMatch[1] : "";

    const barPattern = /(5|10|20|50|100|250|1000)\s*gram\s*([0-9,]{3,10})\s*([0-9,]{3,10})/gi;
    const barMap = new Map();
    for (const m of goldBarSection.matchAll(barPattern)) {
      barMap.set(`${m[1]}g`, {
        weight: `${m[1]}g`,
        sell: numberify(m[2]),
        buy: numberify(m[3])
      });
    }
    const bars = Array.from(barMap.values());

    // DINAR section only
    const dinarSectionMatch = text.match(/GOLD WAFER\s*-\s*DINAR \(24k\)([\s\S]*?)(PG Jewel|Silver 999|Silver Bar|$)/i);
    const dinarSection = dinarSectionMatch ? dinarSectionMatch[1] : "";

    const dinarPattern = /(1|5|10)\s*Dinar\s*([0-9,]{3,10})\s*([0-9,]{3,10})/gi;
    const dinarMap = new Map();
    for (const m of dinarSection.matchAll(dinarPattern)) {
      dinarMap.set(`${m[1]} dinar`, {
        weight: `${m[1]} dinar`,
        sell: numberify(m[2]),
        buy: numberify(m[3])
      });
    }
    const dinars = Array.from(dinarMap.values());

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    res.status(200).json({
      source: "publicgold.com.my",
      liveTimestamp,
      gapDate,
      gap: {
        rm100Gram,
        pricePerGram: gapPrice
      },
      bars,
      dinars
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch live prices",
      details: error.message
    });
  }
}
