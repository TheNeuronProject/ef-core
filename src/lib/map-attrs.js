const getGetter = ({base, key}, {checkTrue, get, set}) => {
	if (get) {
		if (!set) throw new Error('[EF] Setter must be defined when getter exists')
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
		if (!get) throw new Error('[EF] Getter must be defined when setter exists')
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

/**
 * @typedef {import('./renderer.js').EFBaseClass} EFBaseClass
 */

/**
 * Definition of an attribute mapping
 * @typedef {Object} AttrDef
 * @property {string=} key - key to be accessed on base, default to `attr`
 * @property {Function=} base - a function that returns the base of the key, default returns $data
 * @property {bool=} checkTrue - a function returns true or false based on input value
 * @property {*=} trueVal - value when true, only used when checkTrue is set
 * @property {*=} falseVal - value when false, only used when checkTrue is set
 * @property {Function=} get - getter, will ignore all other settings except set
 * @property {Function=} set - setter, will ignore all other settings except get
 */

/**
 * Data to attribute mapping helper
 * @template {EFBaseClass} T
 * @param {T} tpl - Component class to be mapped
 * @param {Object.<string,AttrDef>} attrMap - Attributes to be mapped
 * @returns {T} - Mapped component class
 */
const mapAttrs = (tpl, attrMap) => {
	for (let attr in attrMap) {
		const options = attrMap[attr]

		const base = getBase(options.base)
		const key = options.key || attr

		const basicProperty = {base, key}

		const get = getGetter(basicProperty, options)
		const set = getSetter(basicProperty, options)

		Object.defineProperty(tpl.prototype, attr, {
			get,
			set,
			enumerable: true,
			configurable: false
		})
	}

	return tpl
}

export default mapAttrs
