import EFBaseComponent from './renderer.js'
import registerProps from './register-props.js'
import {assign} from './utils/polyfills.js'
import {inform, exec} from './render-queue.js'

const Fragment = Object.create(null)

// Make a helper component for text fragments
const textFragmentAst = [{t: 0},[['text']]]
const TextFragment = class extends EFBaseComponent {
	constructor(state) {
		inform()
		super(textFragmentAst)
		this.$update(state)
		exec()
	}
}

registerProps(TextFragment, {text: {}})

const createTextFragment = (value) => {
	if (typeof value === 'string') return new TextFragment({text: value})
	return value
}

const createElement = (tag, attrs, ...children) => {
	// Create special component for fragment
	if (tag === Fragment) return new EFBaseComponent([{t: 0}, ...children.map(createTextFragment)])

	// Create an instance if tag is an ef class
	if (Object.isPrototypeOf.call(EFBaseComponent, tag)) {
		if (children.length <= 0) return new tag(attrs)
		return new tag(assign({children: children.map(createTextFragment)}, attrs || {}))
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

export {createElement, Fragment, TextFragment}
