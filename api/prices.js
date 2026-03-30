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

    // Strip all HTML tags first so numbers are clean, then collapse whitespace
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/,/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Timestamps
    const liveTimestampMatch = text.match(/Last Update\s+([0-9]+-[A-Za-z]+-[0-9]+ [0-9:]+)/i);
    const gapDateMatch = text.match(/GOLD ACCUMULATION PROGRAM.*?Last updated\s+([0-9]+-[A-Za-z]+-[0-9]+)/i);

    // GAP prices
    const rm100Match = text.match(/RM\s*100\s*=\s*([0-9.]+)\s*gram/i);
    const gapPriceMatch = text.match(/RM\s*([0-9]+)\s*=\s*1\.0000\s*gram/i);

    // Gold Bars — after comma removal: "5 gram 3127 2845"
    const barPattern = /(5|10|20|50|100|250|1000)\s*gram\s+([0-9]{3,7})\s+([0-9]{3,7})/gi;
    const barRaw = [...text.matchAll(barPattern)].map(m => ({
      weight: `${m[1]}g`,
      sell: Number(m[2]),
      buy: Number(m[3])
    }));
    const seenBars = new Set();
    const bars = barRaw.filter(b => {
      if (seenBars.has(b.weight)) return false;
      seenBars.add(b.weight); return true;
    });

    // Dinars — "1 Dinar 2653 2414"
    const dinarPattern = /(1|5|10)\s*Dinar\s+([0-9]{3,6})\s+([0-9]{3,6})/gi;
    const dinarRaw = [...text.matchAll(dinarPattern)].map(m => ({
      weight: `${m[1]} dinar`,
      sell: Number(m[2]),
      buy: Number(m[3])
    }));
    const seenDinars = new Set();
    const dinars = dinarRaw.filter(d => {
      if (seenDinars.has(d.weight)) return false;
      seenDinars.add(d.weight); return true;
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    res.status(200).json({
      source: "publicgold.com.my",
      liveTimestamp: liveTimestampMatch ? liveTimestampMatch[1].trim() : null,
      gapDate: gapDateMatch ? gapDateMatch[1].trim() : null,
      gap: {
        rm100Gram: rm100Match ? Number(rm100Match[1]) : null,
        pricePerGram: gapPriceMatch ? Number(gapPriceMatch[1]) : null
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
