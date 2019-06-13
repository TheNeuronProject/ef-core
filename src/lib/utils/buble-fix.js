import ARR from './array-helper.js'

// https://github.com/bublejs/buble/issues/197
const enumerableFalse = (classObj, keys) => {
	for (let i of keys) Object.defineProperty(classObj.prototype, i, {enumerable: false})
	return classObj
}

// https://github.com/bublejs/buble/issues/131
const prepareArgs = (self, node) => {
	const args = ARR.copy(self)
	ARR.unshift(args, node)
	return args
}

export {enumerableFalse, prepareArgs}
