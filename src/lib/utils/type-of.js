import ARR from	'./array-helper.js'

const typeOf = (obj) => {
	if (ARR.isArray(obj)) return 'array'
	return typeof obj
}

export default typeOf
