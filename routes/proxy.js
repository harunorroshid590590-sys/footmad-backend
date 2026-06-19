import express from 'express'
import axios from 'axios'
import { proxyStream, parseStreamUrl } from '../utils/proxy.js'
import Stream from '../models/Stream.js'

const router = express.Router()

const getBaseUrl = (req) => process.env.BASE_URL || `${req.protocol}://${req.get('host')}`

const buildProxyManifestUrl = (req, absoluteUrl, query = {}) => {
  const extraParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (key !== 'url' && value) {
      extraParams.set(key, value)
    }
  })

  const suffix = extraParams.toString() ? `&${extraParams.toString()}` : ''
  const encodedUrl = encodeURIComponent(absoluteUrl)
    .replace(/%24(Number|Time|Bandwidth|RepresentationID)%24/g, (match, token) => `$${token}$`)
  return `${getBaseUrl(req)}/proxy/direct?url=${encodedUrl}${suffix}`
}

const resolveUrl = (candidate, baseUrl) => {
  try {
    const resolvedUrl = new URL(candidate, baseUrl)
    const rawCandidate = String(candidate || '')

    if (!rawCandidate.includes('?') && baseUrl.search && !resolvedUrl.search) {
      resolvedUrl.search = baseUrl.search
    }

    if (baseUrl.search) {
      baseUrl.searchParams.forEach((baseValue, key) => {
        const resolvedValue = resolvedUrl.searchParams.get(key)

        if (baseValue && resolvedValue === '') {
          resolvedUrl.searchParams.set(key, baseValue)
        }
      })
    }

    return resolvedUrl.toString()
  } catch {
    return null
  }
}

const appendProxyHeaders = (req, proxyOptions, source = {}) => {
  const normalizeHeaderName = (headerName = '') => {
    const lowerName = String(headerName || '').trim().toLowerCase()

    if (lowerName === 'referer') return 'Referer'
    if (lowerName === 'origin') return 'Origin'
    if (lowerName === 'user-agent' || lowerName === 'useragent') return 'User-Agent'
    if (lowerName === 'x-forwarded-for') return 'X-Forwarded-For'

    return String(headerName || '').trim()
  }

  const headerSource = {
    ...(source.headers || {}),
    ...(req.query || {})
  }

  Object.entries(headerSource).forEach(([key, value]) => {
    const normalizedKey = normalizeHeaderName(key)
    const lowerKey = normalizedKey.toLowerCase()

    if (!value || ['url', 'referer', 'origin', 'user-agent'].includes(lowerKey)) return
    proxyOptions.headers[normalizedKey] = Array.isArray(value) ? value[0] : value
  })

  proxyOptions.referer = req.query.referer || req.query.Referer || source.referer || source.headers?.Referer || proxyOptions.referer
  proxyOptions.origin = req.query.origin || req.query.Origin || source.origin || source.headers?.Origin || proxyOptions.origin
  proxyOptions.userAgent = req.query.userAgent || req.query.UserAgent || req.query['User-Agent'] || source.userAgent || source.headers?.['User-Agent'] || proxyOptions.userAgent
  proxyOptions.range = req.headers.range || 'bytes=0-'
}

const setCommonProxyHeaders = (res, contentType = '') => {
  if (contentType) {
    res.setHeader('Content-Type', contentType)
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
}

const pipeSourceResponse = (sourceResponse, res, contentType = '') => {
  const headers = sourceResponse.headers || {}

  setCommonProxyHeaders(res, contentType || headers['content-type'] || '')

  ;[
    'accept-ranges',
    'content-length',
    'content-range',
    'etag',
    'last-modified'
  ].forEach((headerName) => {
    if (headers[headerName]) {
      res.setHeader(headerName, headers[headerName])
    }
  })

  res.status(sourceResponse.status)
  sourceResponse.data.pipe(res)
}

const isManifestUrl = (url = '', extension = '') => {
  const normalizedUrl = String(url).toLowerCase()
  return normalizedUrl.includes(extension)
}

const readStream = (stream) => new Promise((resolve, reject) => {
  let content = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    content += chunk
  })
  stream.on('end', () => resolve(content))
  stream.on('error', reject)
})

const rewriteHlsManifest = (manifest, manifestUrl, req) => {
  const baseUrl = new URL(manifestUrl)

  return manifest
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()

      if (!trimmed) return line

      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (match, value) => {
          const resolved = resolveUrl(value, baseUrl)
          return resolved ? `URI="${buildProxyManifestUrl(req, resolved, req.query)}"` : match
        })
      }

      const resolved = resolveUrl(trimmed, baseUrl)
      return resolved ? buildProxyManifestUrl(req, resolved, req.query) : line
    })
    .join('\n')
}

const rewriteDashManifest = (manifest, manifestUrl, req) => {
  const baseUrl = new URL(manifestUrl)
  const rewriteAttribute = (match, attr, quote, rawUrl) => {
    const resolved = resolveUrl(rawUrl, baseUrl)
    return resolved ? `${attr}=${quote}${buildProxyManifestUrl(req, resolved, req.query)}${quote}` : match
  }

  return manifest
    .replace(/<BaseURL>([^<]+)<\/BaseURL>/g, (match, rawUrl) => {
      const resolved = resolveUrl(rawUrl.trim(), baseUrl)
      return resolved ? `<BaseURL>${buildProxyManifestUrl(req, resolved, req.query)}</BaseURL>` : match
    })
    .replace(/\b(media|initialization|sourceURL)=("|')([^"']+)("|')/g, (match, attr, openQuote, rawUrl) => (
      rewriteAttribute(match, attr, openQuote, rawUrl)
    ))
}

router.get('/stream/:streamId', async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.streamId)
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' })
    }
    
    const { url, params } = parseStreamUrl(stream.url)
    
    const proxyOptions = {
      referer: stream.referer || params.referer,
      origin: stream.origin || params.origin,
      userAgent: stream.userAgent || params.userAgent,
      headers: {}
    }
    appendProxyHeaders(req, proxyOptions, stream)
    
    const streamResponse = await proxyStream(url, proxyOptions)

    if (streamResponse.status >= 400) {
      pipeSourceResponse(streamResponse, res)
      return
    }

    if (isManifestUrl(url, '.m3u8')) {
      const manifest = await readStream(streamResponse.data)
      const rewrittenManifest = rewriteHlsManifest(manifest, url, req)

      setCommonProxyHeaders(res, 'application/vnd.apple.mpegurl')
      res.send(rewrittenManifest)
    } else if (isManifestUrl(url, '.mpd')) {
      const manifest = await readStream(streamResponse.data)
      const rewrittenManifest = rewriteDashManifest(manifest, url, req)

      setCommonProxyHeaders(res, 'application/dash+xml')
      res.send(rewrittenManifest)
    } else {
      pipeSourceResponse(streamResponse, res)
    }
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(502).json({
      message: 'Failed to proxy stream',
      detail: error.message
    })
  }
})

router.get('/direct', async (req, res) => {
  try {
    const { url, referer, origin, userAgent } = req.query
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' })
    }
    
    console.log('Proxy request for URL:', url)
    
    const streamUrl = url
    const { params } = parseStreamUrl(url)
    console.log('Parsed stream URL:', streamUrl)
    console.log('Parsed params:', params)
    
    const proxyOptions = {
      referer: referer || params.referer,
      origin: origin || params.origin,
      userAgent: userAgent || params.userAgent,
      headers: {}
    }
    appendProxyHeaders(req, proxyOptions)
    
    console.log('Proxy options:', JSON.stringify(proxyOptions, null, 2))
    
    const streamResponse = await proxyStream(streamUrl, proxyOptions)

    if (streamResponse.status >= 400) {
      pipeSourceResponse(streamResponse, res)
      return
    }
    
    // Check if this is an HLS manifest (.m3u8)
    if (isManifestUrl(streamUrl, '.m3u8')) {
      // Read the manifest content to rewrite segment URLs
      const manifest = await readStream(streamResponse.data)
      const rewrittenManifest = rewriteHlsManifest(manifest, streamUrl, req)

      setCommonProxyHeaders(res, 'application/vnd.apple.mpegurl')
      res.send(rewrittenManifest)
    } else if (isManifestUrl(streamUrl, '.mpd')) {
      // DASH manifest - rewrite segment URLs to go through proxy
      const manifest = await readStream(streamResponse.data)
      const rewrittenManifest = rewriteDashManifest(manifest, streamUrl, req)

      setCommonProxyHeaders(res, 'application/dash+xml')
      res.send(rewrittenManifest)
    } else {
      // For segment files and other content, detect content type
      pipeSourceResponse(streamResponse, res)
    }
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(502).json({
      message: 'Failed to proxy stream',
      detail: error.message
    })
  }
})

// Proxy for DRM license requests
router.post('/license', async (req, res) => {
  try {
    const { url, drmKey, payload } = req.body
    
    if (!url) {
      return res.status(400).json({ message: 'License URL is required' })
    }
    
    console.log('DRM License request for URL:', url)
    console.log('DRM Key:', drmKey)
    console.log('Payload type:', typeof payload, 'Is array:', Array.isArray(payload))
    
    // Convert payload array back to binary buffer if needed
    let requestData = payload
    if (Array.isArray(payload)) {
      requestData = Buffer.from(new Uint8Array(payload))
      console.log('Converted array payload to buffer, length:', requestData.length)
    }
    
    const config = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/octet-stream',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      data: requestData,
      responseType: 'arraybuffer',
      timeout: 30000
    }
    
    const response = await axios(config)
    console.log('DRM License response status:', response.status)
    console.log('DRM License response length:', response.data.length)
    
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    res.send(response.data)
  } catch (error) {
    console.error('DRM License proxy error:', error.message)
    console.error('DRM License error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data ? error.response.data.toString() : 'No data'
    })
    res.status(500).json({ message: 'Failed to proxy DRM license request' })
  }
})

// Handle OPTIONS requests for CORS preflight
router.options('/license', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.status(200).send()
})

router.options('/direct', (req, res) => {
  setCommonProxyHeaders(res)
  res.status(200).send()
})

export default router
