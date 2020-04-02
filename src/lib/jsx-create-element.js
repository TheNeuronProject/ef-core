import {EFBaseComponent, Fragment, toEFComponent} from './renderer.js'
import {assign} from './utils/polyfills.js'

const flatten = (prev, item) => {
	if (Array.isArray(item)) prev.push(...item.map(toEFComponent))
	else prev.push(toEFComponent(item))

	return prev
}

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
