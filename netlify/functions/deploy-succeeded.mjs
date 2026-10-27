// Runs automatically after every successful Netlify deploy.
// Tells Bing (and other IndexNow search engines) which pages changed,
// using the <lastmod> dates in sitemap.xml. Keep those dates current
// when you add or edit a page.
const KEY = "76153c2e811faf52ed5481fb45bf7515";
const HOST = "www.clivevanderwagen.com";
const SITE = "https://" + HOST;
const RECENT_DAYS = 3;

export default async (req) => {
  let payload = {};
  try { ({ payload = {} } = await req.json()); } catch {}
  if (payload.context && payload.context !== "production") {
    console.log("IndexNow: skipped, not a production deploy (" + payload.context + ")");
    return new Response("skipped");
  }
  const res = await fetch(SITE + "/sitemap.xml");
  if (!res.ok) { console.log("IndexNow: sitemap fetch failed " + res.status); return new Response("no sitemap"); }
  const xml = await res.text();
  const cutoff = Date.now() - RECENT_DAYS * 864e5;
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, block]) => ({
      loc: (block.match(/<loc>(.*?)<\/loc>/) || [])[1],
      lastmod: (block.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1],
    }))
    .filter((u) => u.loc && u.lastmod && Date.parse(u.lastmod) >= cutoff)
    .map((u) => u.loc);
  if (!urls.length) { console.log("IndexNow: no recently changed pages"); return new Response("nothing to submit"); }
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: SITE + "/" + KEY + ".txt", urlList: urls }),
  });
  console.log("IndexNow: submitted " + urls.length + " URL(s), response " + r.status + ": " + urls.join(", "));
  return new Response("submitted " + urls.length);
};
