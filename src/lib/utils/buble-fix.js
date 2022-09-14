import ARR from './array-helper.js'

// https://github.com/bublejs/buble/issues/197
const enumerableFalse = (classObj, keys) => {
	for (let i of keys) Object.defineProperty(classObj.prototype, i, {enumerable: false})
	return classObj
}

// https://github.com/bublejs/buble/issues/131
const prepareArgs = (self) => {
	const args = ARR.copy(self)
	return args
}

export {enumerableFalse, prepareArgs}
