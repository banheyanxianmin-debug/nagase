// api/delay.js
const TARGET_URL = "https://transit.yahoo.co.jp/traininfo/detail/311/0/"; // 近鉄大阪線（判定元）
const CACHE_TTL = 60 * 1000; // 60秒キャッシュ

let cache = { ts: 0, data: null };

module.exports = async (req, res) => {
  // CORS（開発中は * にしておく。公開時は必要に応じてオリジン限定に）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_TTL) {
    res.setHeader("Cache-Control", `public, max-age=${Math.floor((CACHE_TTL/1000)-5)}`);
    return res.status(200).json(cache.data);
  }

  try {
    const resp = await fetch(TARGET_URL, {
      headers: {
        "User-Agent": "KintetsuDelayChecker/1.0 (+https://yourdomain.example)"
      }
    });
    if (!resp.ok) throw new Error("fetch status " + resp.status);
    const html = await resp.text();

    // 判定キーワード（必要に応じて追加）
    const keywords = ["遅延", "遅れ", "運転見合わせ", "運休", "見合わせ", "一部運休"];
    const found = keywords.filter(k => html.indexOf(k) !== -1);

    const result = {
      delay: found.length > 0,
      foundKeywords: found,
      checkedAt: new Date().toISOString(),
      source: TARGET_URL
    };

    cache = { ts: now, data: result };
    res.setHeader("Cache-Control", `public, max-age=${Math.floor((CACHE_TTL/1000)-5)}`);
    return res.status(200).json(result);
  } catch (err) {
    console.error("error fetching target:", err);
    return res.status(500).json({ error: "fetch_failed", message: err.message });
  }
};
