export default async function handler(req, res) {
  try {
    const url =
      "https://publicgold.com.my/index.php?Itemid=53&id=1534&option=com_content&task=view";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      throw new Error(`Public Gold request failed: ${response.status}`);
    }

    const html = await response.text();
    const text = html.replace(/\s+/g, " ").trim();

    const lastUpdated =
      text.match(/GOLD ACCUMULATION PROGRAM \(24K\).*?\(Last updated ([^)]+)\)/i)?.[1] || null;

    const rm100Gram =
      text.match(/RM\s*100\s*=\s*([0-9.]+)\s*gram/i)?.[1] || null;

    const gapPrice =
      text.match(/RM\s*([0-9,]+)\s*=\s*1\.0000\s*gram/i)?.[1] || null;

    const bars = [...text.matchAll(/(5|10|20|50|100|250|1000)\s*gram\s*([0-9,]+)\s*([0-9,]+)/gi)]
      .map(m => ({
        weight: `${m[1]}g`,
        sell: Number(m[2].replace(/,/g, "")),
        buy: Number(m[3].replace(/,/g, ""))
      }));

    const dinars = [...text.matchAll(/(1|5|10)\s*Dinar\s*([0-9,]+)\s*([0-9,]+)/gi)]
      .map(m => ({
        weight: `${m[1]} dinar`,
        sell: Number(m[2].replace(/,/g, "")),
        buy: Number(m[3].replace(/,/g, ""))
      }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    res.status(200).json({
      source: "publicgold.com.my",
      lastUpdated,
      gap: {
        rm100Gram: rm100Gram ? Number(rm100Gram) : null,
        pricePerGram: gapPrice ? Number(gapPrice.replace(/,/g, "")) : null
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
