const getGetter = ({base, key}, {checkTrue, get, set}) => {
	if (get) {
		if (!set) throw new Error('Setter must be defined when getter exists')
		return get
	}

	if (checkTrue) return function() {
		return checkTrue(base(this)[key], this)
	}

	return function() {
		return base(this)[key]
	}
}

const getSetter = ({base, key}, {checkTrue, trueVal, falseVal, get, set}) => {
	if (set) {
		if (!get) throw new Error('Getter must be defined when setter exists')
		return set
	}

	if (checkTrue) return function(val) {
		const baseNode = base(this)
		const _trueVal = trueVal
		const _falseVal = falseVal

		if (typeof trueVal !== 'function') trueVal = () => _trueVal
		if (typeof falseVal !== 'function') falseVal = () => _falseVal

		if (val) baseNode[key] = trueVal(this)
		else baseNode[key] = falseVal(this)
	}

	return function(val) {
		base(this)[key] = val
	}
}

const defaultRoot = state => state.$data
const getBase = (root) => {
	if (!root) return defaultRoot
	if (typeof root === 'function') return root
	if (typeof root === 'string') root = root.split('.')
	return (base) => {
		for (let key of root) base = base[key]
		return base
	}
}

const registerProps = (tpl, propMap) => {
	for (let prop in propMap) {

		/* Options:
		 * key: key on root, default to prop
		 * base: a function that returns the base of the key, default returns $data
		 * trueVal: value when true, only used when checkTrue is set
		 * falseVal: value when false, only used when checkTrue is set
		 * checkTrue: a function returns true or false based on input value
		 * get: getter, will ignore all other settings except set
		 * set: setter, will ignore all other settings except get
		 */
		const options = propMap[prop]

		const base = getBase(options.base)
		const key = options.key || prop

		const basicProperty = {base, key}

		const get = getGetter(basicProperty, options)
		const set = getSetter(basicProperty, options)

		Object.defineProperty(tpl.prototype, prop, {
			get,
			set,
			enumerable: true,
			configurable: false
		})
	}

	return tpl
}

export default registerProps
