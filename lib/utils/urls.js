const UNESCAPE_URL_R = /\\([^0-9A-Za-z\s])/g;

export function unescapeUrl(rawUrlString) {
  return rawUrlString.replace(UNESCAPE_URL_R, '$1');
}

export function sanitizeUrl(url) {
  if (url == null) {
    return null;
  }

  try {
    const prot = decodeURIComponent(url)
      .replace(/[^A-Za-z0-9/:]/g, '')
      .toLowerCase();
    if (prot.indexOf('javascript:') === 0) { // eslint-disable-line no-script-url
      return null;
    }
  } catch (e) {
    // decodeURIComponent sometimes throws a URIError
    // See `decodeURIComponent('a%AFc');`
    // http://stackoverflow.com/questions/9064536/javascript-decodeuricomponent-malformed-uri-exception
    return null;
  }

  return url;
}
