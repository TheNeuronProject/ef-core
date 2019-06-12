import State from './renderer.js'
import {assign} from './utils/polyfills.js'

const Fragment = Object.create(null)

const createElement = (tag, attrs, ...children) => {
	// Create special component for fragment
	if (tag === Fragment) return new State([{t: 0}, ...children])

	// Create an instance if tag is an ef class
	if (Object.isPrototypeOf.call(State, tag)) {
		if (children.length <= 0) return new tag(attrs)
		return new tag(assign({children}, attrs || {}))
	}

	// Else return the generated basic component
	// Transform all label only attributes to ef-supported style
	const transformedAttrs = assign({}, attrs)
	for (let i in transformedAttrs) {
		if (transformedAttrs[i] === true) transformedAttrs[i] = ''
	}

	return new State([
		{
			t: tag,
			a: transformedAttrs
		},
		...children
	])
}

export {createElement, Fragment}
