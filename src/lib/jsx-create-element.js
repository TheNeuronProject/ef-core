import {EFBaseComponent, EFTextFragment, Fragment} from './renderer.js'
import {assign} from './utils/polyfills.js'

const textToFragment = (value) => {
	if (typeof value === 'string') return new EFTextFragment(value)
	return value
}

const createElement = (tag, attrs, ...children) => {
	// Create special component for fragment
	if (tag === Fragment) return new Fragment(...children)

	// Create an instance if tag is an ef class
	if (Object.isPrototypeOf.call(EFBaseComponent, tag)) {
		if (children.length <= 0) return new tag(attrs)
		return new tag(assign({children: children.map(textToFragment)}, attrs || {}))
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
