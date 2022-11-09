const createCache = (cb) => {
	const cache = {}
	return input => cache[input] || (cache[input] = cb(input))
}

const hasColon = createCache(str => str.indexOf(':') >= 0)

const splitByColon = createCache(str => str.split(':'))

const isSVGEscape = createCache(tagName => ['foreignobject', 'desc', 'title'].indexOf(tagName.toLowerCase()) > -1)

export { createCache, hasColon, splitByColon, isSVGEscape }
