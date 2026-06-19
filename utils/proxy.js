import axios from 'axios'

const DEFAULT_STREAM_HEADERS = {
  'User-Agent': 'Cricbuzz/7.00.01 (Linux;Android 13) AndroidXMedia3/1.5.1',
  'Referer': 'https://www.cricbuzz.com/',
  'Origin': 'https://www.cricbuzz.com',
  'Accept': '*/*',
  'Connection': 'keep-alive'
}

export const proxyStream = async (streamUrl, options = {}) => {
  try {
    console.log('proxyStream - Requesting URL:', streamUrl)
    console.log('proxyStream - Options:', JSON.stringify(options, null, 2))

    const headers = {
      ...DEFAULT_STREAM_HEADERS,
      ...(options.headers || {})
    }

    if (options.userAgent) headers['User-Agent'] = options.userAgent
    if (options.referer) headers['Referer'] = options.referer
    if (options.origin) headers['Origin'] = options.origin
    if (options.range) headers.Range = options.range
    
    const config = {
      method: 'GET',
      url: streamUrl,
      responseType: 'stream',
      proxy: false,
      headers,
      timeout: 30000, // 30 second timeout
      maxRedirects: 5,
      validateStatus: function (status) {
        // Accept any status code, handle errors manually
        return true
      }
    }

    console.log('proxyStream - Axios config:', JSON.stringify({
      method: config.method,
      url: config.url,
      headers: config.headers
    }, null, 2))

    const response = await axios(config)
    console.log('proxyStream - Response status:', response.status)
    console.log('proxyStream - Response headers:', JSON.stringify(response.headers, null, 2))
    
    if (response.status >= 400) {
      console.error('proxyStream - Source server returned error status:', response.status)
    }
    
    return response
  } catch (error) {
    console.error('proxyStream - Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data ? error.response.data.toString() : 'No data'
    })
    throw error
  }
}

export const parseStreamUrl = (urlString) => {
  const parts = urlString.split('|')
  const url = parts[0]
  const params = {}
  
  if (parts.length > 1) {
    parts.slice(1).forEach(part => {
      const paramParts = part.split('&')
      paramParts.forEach(param => {
        const [key, value] = param.split('=')
        if (key && value) {
          params[key] = decodeURIComponent(value)
        }
      })
    })
  }
  
  return { url, params }
}

export const normalizeClearKeyPair = (drmValue = '') => {
  const value = String(drmValue || '').replace(/\s+/g, '').trim()

  if (!value) {
    return { drm: null, drmError: null }
  }

  const [rawKid, rawKey, ...rest] = value.split(':')

  if (!rawKid || !rawKey || rest.length > 0) {
    return {
      drm: null,
      drmError: 'Provider returned an invalid ClearKey pair for this stream.'
    }
  }

  const kid = rawKid.trim()
  const key = rawKey.trim()
  const isHex = (candidate) => (
    candidate.length > 0 &&
    candidate.length % 2 === 0 &&
    /^[0-9a-f]+$/i.test(candidate)
  )

  if (!isHex(kid) || !isHex(key)) {
    return {
      drm: null,
      drmError: 'Provider returned an invalid ClearKey pair for this stream.'
    }
  }

  return {
    drm: {
      type: 'clearkey',
      clearKeys: {
        [kid]: key
      }
    },
    drmError: null
  }
}

export const buildDrmConfigFromProviderValue = (drmValue = '') => {
  const value = String(drmValue || '').replace(/\s+/g, '').trim()

  if (!value) {
    return { drm: null, drmError: null }
  }

  const isUrl = /^https?:\/\//i.test(value)

  if (isUrl) {
    return {
      drm: {
        type: 'widevine',
        licenseUrl: value
      },
      drmError: null
    }
  }

  const parts = value.split(':')
  if (parts.length === 2) {
    return normalizeClearKeyPair(value)
  }

  return { drm: null, drmError: null }
}

export const needsProxy = (stream) => {
  return !!(
    stream.drm ||
    stream.referer ||
    stream.origin ||
    stream.userAgent ||
    stream.url.includes('|')
  )
}
