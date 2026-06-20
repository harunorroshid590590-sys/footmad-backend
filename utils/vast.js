import axios from 'axios'

// Minimal VAST 2/3 parser. Extracts the first usable MediaFile plus the
// tracking pixels, following a limited number of Wrapper redirects.

const stripCdata = (s = '') =>
  s.replace(/<!\[CDATA\[/i, '').replace(/\]\]>/i, '').trim()

// Return the inner text of every <Tag ...>...</Tag> occurrence.
const matchAll = (xml, tag) => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const out = []
  let m
  while ((m = re.exec(xml)) !== null) out.push(stripCdata(m[1]))
  return out.filter(Boolean)
}

const matchFirst = (xml, tag) => matchAll(xml, tag)[0] || ''

// Pick the best MediaFile: prefer progressive mp4, else the first one.
const pickMediaFile = (xml) => {
  const re = /<MediaFile\b([^>]*)>([\s\S]*?)<\/MediaFile>/gi
  const files = []
  let m
  while ((m = re.exec(xml)) !== null) {
    files.push({ attrs: m[1] || '', url: stripCdata(m[2]) })
  }
  if (!files.length) return ''
  const mp4 = files.find(
    (f) => /video\/mp4/i.test(f.attrs) || /\.mp4(\?|$)/i.test(f.url)
  )
  return (mp4 || files[0]).url
}

const parseDuration = (str = '') => {
  const m = String(str).match(/(\d{1,2}):(\d{2}):(\d{2})/)
  if (!m) return 0
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

const parseVast = (xml) => ({
  mediaFile: pickMediaFile(xml),
  clickThrough: matchFirst(xml, 'ClickThrough'),
  clickTracking: matchAll(xml, 'ClickTracking'),
  impressions: matchAll(xml, 'Impression'),
  errors: matchAll(xml, 'Error'),
  duration: parseDuration(matchFirst(xml, 'Duration')),
  wrapperUri: matchFirst(xml, 'VASTAdTagURI')
})

// Fetch a VAST tag and resolve wrappers (up to `depth` redirects),
// accumulating tracking pixels along the chain.
export const fetchVastAd = async (url, depth = 3) => {
  const acc = { impressions: [], clickTracking: [], errors: [] }

  let currentUrl = url
  for (let i = 0; i <= depth; i++) {
    if (!currentUrl) break
    const { data } = await axios.get(currentUrl, {
      timeout: 8000,
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/xml,text/xml,*/*' }
    })
    const xml = typeof data === 'string' ? data : String(data)
    const parsed = parseVast(xml)

    acc.impressions.push(...parsed.impressions)
    acc.clickTracking.push(...parsed.clickTracking)
    acc.errors.push(...parsed.errors)

    if (parsed.mediaFile) {
      return {
        mediaFile: parsed.mediaFile,
        clickThrough: parsed.clickThrough,
        duration: parsed.duration,
        impressions: acc.impressions,
        clickTracking: acc.clickTracking,
        errors: acc.errors
      }
    }

    // No media yet — follow the wrapper if there is one.
    if (!parsed.wrapperUri) break
    currentUrl = parsed.wrapperUri
  }

  return null
}
