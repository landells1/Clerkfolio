// Submits every sitemap URL to IndexNow (Bing, DuckDuckGo, Yandex, Seznam,
// Naver - Google does not consume IndexNow). Run AFTER a deploy that changes
// public pages: `npm run seo:indexnow`. The key is not a secret: the protocol
// requires it to be publicly readable at /<key>.txt, which is how the engines
// verify the submitter controls the host.
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const HOST = 'clerkfolio.co.uk'
const SITEMAP_URL = `https://${HOST}/sitemap.xml`
const publicDir = fileURLToPath(new URL('../public/', import.meta.url))

async function findKey() {
  const entries = await readdir(publicDir)
  const keyFile = entries.find(name => /^[a-f0-9]{32}\.txt$/.test(name))
  if (!keyFile) throw new Error('No IndexNow key file (32-hex .txt) found in public/')
  const key = (await readFile(`${publicDir}${keyFile}`, 'utf8')).trim()
  if (key !== keyFile.replace(/\.txt$/, '')) {
    throw new Error(`Key file content must equal its filename (${keyFile})`)
  }
  return key
}

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL)
  if (!res.ok) throw new Error(`Sitemap fetch failed: HTTP ${res.status}`)
  const xml = await res.text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
  if (urls.length === 0) throw new Error('No <loc> entries found in the sitemap')
  return urls
}

const key = await findKey()
const urlList = await fetchSitemapUrls()

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList,
  }),
})

// 200 = submitted, 202 = accepted (key validation pending). Anything else is
// a real failure (400 bad format, 403 invalid key, 422 URL/host mismatch,
// 429 spam throttle).
const body = await res.text()
if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow: submitted ${urlList.length} URLs (HTTP ${res.status})`)
} else {
  console.error(`IndexNow submission failed: HTTP ${res.status} ${body}`)
  process.exit(1)
}
