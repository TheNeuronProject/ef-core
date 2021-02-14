import {EFBaseComponent, Fragment, toEFComponent} from './renderer.js'
import ARR from './utils/array-helper.js'
import {assign} from './utils/polyfills.js'

const flatten = (prev, item) => {
	if (ARR.isArray(item)) prev.push(...item.map(toEFComponent))
	else prev.push(toEFComponent(item))

	return prev
}

/**
 * @typedef {import('./renderer.js').EFBaseComponent} EFBaseComponent
 * @typedef {import('./renderer.js').EFBaseClass} EFBaseClass
 */

// eslint-disable-next-line valid-jsdoc
/**
 * Create ef component from JSX
 * @template {EFBaseClass} T
 * @param {(string|T)} tag - JSX tag
 * @param {Object.<string,*>} attrs - JSX attributes
 * @param  {...*} children - JSX children
 * @returns {(EFBaseComponent|T extends {new (...args: any): infer R} ? R : never)} ef component created from JSX
 */
const createElement = (tag, attrs, ...children) => {
	// Create special component for fragment
	if (tag === Fragment) return new Fragment(...children)

	// Create an instance if tag is an ef class
	if (Object.isPrototypeOf.call(EFBaseComponent, tag)) {
		if (children.length <= 0) return new tag(attrs)
		return new tag(assign({children: children.reduce(flatten, [])}, attrs || {}))
	}

	// Else return the generated basic component
	// Transform all label only attributes to ef-supported style
	const transformedAttrs = assign({}, attrs)
	for (let i in transformedAttrs) {
		if (transformedAttrs[i] === true) transformedAttrs[i] = ''
	}

	return new EFBaseComponent([
		{
			t: tag,
			a: transformedAttrs
		},
		...children
	])
}

export default createElement
