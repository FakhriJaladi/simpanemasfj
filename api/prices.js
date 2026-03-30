export default async function handler(req, res) {
  try {
    const url =
      "https://publicgold.com.my/index.php?Itemid=53&id=1534&option=com_content&task=view";

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
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const numberify = (value) => Number(String(value).replace(/,/g, ""));

    // Use the LAST live timestamp match because the page contains older duplicate entries.
    const liveTimestampMatches = [
      ...text.matchAll(/\(Last Update\s+([0-9]{1,2}-[A-Za-z]+-[0-9]{4}\s+[0-9:]+)\)\s*Public Gold Price \(24 Hours Live\)/gi)
    ];
    const liveTimestamp = liveTimestampMatches.length
      ? liveTimestampMatches[liveTimestampMatches.length - 1][1].trim()
      : null;

    // GAP section only
    const gapSectionMatch = text.match(/GOLD ACCUMULATION PROGRAM \(24K\)([\s\S]*?)GOLD BAR \(24K\)/i);
    const gapSection = gapSectionMatch ? gapSectionMatch[1] : "";

    const gapDateMatch = gapSection.match(/\(Last updated\s+([0-9]{1,2}-[A-Za-z]+-[0-9]{4})\)/i);
    const rm100Match = gapSection.match(/RM\s*100\s*=\s*([0-9.]+)\s*gram/i);
    const gapPriceMatch = gapSection.match(/RM\s*([0-9,]+)\s*=\s*1\.0000\s*gram/i);

    // Gold Bar section only
    const goldBarSectionMatch = text.match(/GOLD BAR \(24K\)([\s\S]*?)GOLD WAFER - DINAR \(24k\)/i);
    const goldBarSection = goldBarSectionMatch ? goldBarSectionMatch[1] : "";

    const barPattern = /(5|10|20|50|100|250|1000)\s*gram\s*([0-9,]{3,10})\s*([0-9,]{3,10})/gi;
    const bars = [...goldBarSection.matchAll(barPattern)].map(m => ({
      weight: `${m[1]}g`,
      sell: numberify(m[2]),
      buy: numberify(m[3])
    }));

    // Dinar section only
    const dinarSectionMatch = text.match(/GOLD WAFER - DINAR \(24k\)([\s\S]*?)PG Jewel/i);
    const dinarSection = dinarSectionMatch ? dinarSectionMatch[1] : "";

    const dinarPattern = /(1|5|10)\s*Dinar\s*([0-9,]{3,10})\s*([0-9,]{3,10})/gi;
    const dinars = [...dinarSection.matchAll(dinarPattern)].map(m => ({
      weight: `${m[1]} dinar`,
      sell: numberify(m[2]),
      buy: numberify(m[3])
    }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    res.status(200).json({
      source: "publicgold.com.my",
      liveTimestamp,
      gapDate: gapDateMatch ? gapDateMatch[1].trim() : null,
      gap: {
        rm100Gram: rm100Match ? Number(rm100Match[1]) : null,
        pricePerGram: gapPriceMatch ? numberify(gapPriceMatch[1]) : null
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
