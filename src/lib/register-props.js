/* eslint no-ternary: off, multiline-ternary: off */

const getGetter = (prop, {key, method, bool, trueVal, get, set}) => {
	if (get) {
		if (!set) throw new Error('Setter must be defined when getter exists')
		return get
	}

	const base = method ? '$methods' : '$data'
	key = key || prop

	if (bool) return function() {
		return this[base][key] === trueVal
	}

	return function() {
		return this[base][key]
	}
}

const getSetter = (prop, {key, method, bool, trueVal, falseVal, get, set}) => {
	if (set) {
		if (!get) throw new Error('Getter must be defined when setter exists')
		return set
	}

	const base = method ? '$methods' : '$data'
	key = key || prop

	if (bool) return function(val) {
		if (val) this[base][key] = trueVal
		else this[base][key] = falseVal
	}

	return function(val) {
		this[base][key] = val
	}
}

const registerProps = (tpl, propMap) => {
	for (let prop in propMap) {

		/* Options:
		 * key: key of $data or $methods, default to prop
		 * method: whether this is for an method
		 * bool: whether this is a boolean field
		 * trueVal: value when true, only used when bool is true
		 * falseVal: value when false, only used when bool is true
		 * get: getter, will ignore all other settings except set
		 * set: setter, will ignore all other settings except get
		 */
		const options = propMap[prop]

		const get = getGetter(prop, options)
		const set = getSetter(prop, options)

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
