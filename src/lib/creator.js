import {createElement, typeValid} from './element-creator.js'
import {queueDom, inform, exec} from './render-queue.js'
import {DOM, EFMountPoint, useFragment} from './utils/dom-helper.js'
import {hasColon, splitByColon, isSVGEscape} from './utils/string-ops.js'
import {getNamespace} from './utils/namespaces.js'
import defineArr from './utils/dom-arr-helper.js'
import ARR from './utils/array-helper.js'
import typeOf from './utils/type-of.js'
import initBinding from './binding.js'
import mountOptions from '../mount-options.js'

import shared from './utils/global-shared.js'

const svgNS = getNamespace('svg')
const mathNS = getNamespace('math')
const htmlNS = getNamespace('html')

const nullComponent = Object.create(null)

const checkDestroyed = (state) => {
	if (!state.$ctx) throw new Error('[EF] This component has been destroyed!')
}

const bindTextNode = (ctx, {node, element}) => {
	// Data binding text node
	const textNode = DOM.document.createTextNode('')
	const { dataNode, handlerNode, _key } = initBinding(ctx, {bind: node})
	const handler = () => {
		const value = dataNode[_key]
		if (typeof value === 'undefined') {
			textNode.textContent = ''
			return
		}
		textNode.textContent = value
	}
	handlerNode.push(handler)

	// Append element to the component
	DOM.append(element, textNode)
}

const updateMountNode = ({ctx, key, value}) => {
	const {children} = ctx
	const child = children[key]
	const {anchor, node} = child
	if (node === value) return

	value = shared.toEFComponent(value)

	inform()
	// Update component
	if (node) {
		if (value === nullComponent) value = null
		else node.$umount()
	}
	// Update stored value
	child.node = value
	if (value) value.$mount({target: anchor, parent: ctx.state, option: mountOptions.BEFORE, key})
	exec()
}

const updateMountList = ({ctx, key, value}) => {
	const {children} = ctx
	const {anchor, node} = children[key]
	if (ARR.equals(node, value)) return
	inform()
	if (node.length) node.clear()
	if (value) {
		value = ARR.copy(value)
		useFragment((fragment, putBack) => {
			// Update components
			for (let item of value) DOM.append(fragment, shared.toEFComponent(item).$mount({parent: ctx.state, key}))
			// Update stored value
			ARR.push(node, ...value)
			// Append to current component
			queueDom(() => {
				DOM.after(anchor, fragment)
				putBack()
			})
		})
	}
	exec()
}

const mountPointUpdaters = [
	updateMountNode,
	updateMountList
]

const applyMountPoint = (type, key, tpl) => {
	Object.defineProperty(tpl.prototype, key, {
		get() {
			if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
			return this.$ctx.children[key].node
		},
		set(value) {
			if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
			const ctx = this.$ctx
			mountPointUpdaters[type]({ctx, key, value})
		},
		enumerable: true
	})
}

const bindMountNode = ({ctx, key, anchor}) => {
	const {children, isFragment} = ctx
	children[key] = {anchor}
	anchor[EFMountPoint] = children[key]
	if (isFragment) DOM.append(ctx.safeZone, anchor)
}

const bindMountList = ({ctx, key, anchor}) => {
	const {children, isFragment} = ctx
	children[key] = {
		node: defineArr([], {ctx, key, anchor}),
		anchor
	}
	anchor[EFMountPoint] = children[key]
	if (isFragment) DOM.append(ctx.safeZone, anchor)
}

// Walk through the AST to perform proper actions
const resolveAST = (ctx, {node, nodeType, element, namespace, create}) => {
	if (DOM.isNodeInstance(node)) {
		DOM.append(element, node)
		return
	}

	switch (nodeType) {
		// Static text node
		case 'string': {
			DOM.append(element, DOM.document.createTextNode(node))
			break
		}
		// Child element or a dynamic text node
		case 'array': {
			// Recursive call for child element
			if (typeOf(node[0]) === 'object') DOM.append(element, create(ctx, {node, namespace}))
			// Dynamic text node
			else bindTextNode(ctx, {node, element})
			break
		}
		// Mount points
		case 'object': {
			const anchor = DOM.document.createTextNode('')
			// Single node mount point
			if (node.t === 0) bindMountNode({ctx, key: node.n, anchor})
			// Multi node mount point
			else bindMountList({ctx, key: node.n, anchor})
			// Append anchor
			if (process.env.NODE_ENV !== 'production') DOM.append(element, DOM.document.createComment(`<MountPoint${node.t && ' type="list" ' || ' '}name="${node.n}">`))
			DOM.append(element, anchor)
			if (process.env.NODE_ENV !== 'production') DOM.append(element, DOM.document.createComment('</MountPoint>'))
			break
		}
		default:
	}
}

// Create elements based on description from AST
/* eslint {"complexity": "off"} */
const create = (ctx, {node, namespace}) => {
	const [info, ...childNodes] = node
	const previousNamespace = namespace

	let tagName = info.t
	let isLocalPrefix = false

	const scoped = ctx.scope[tagName]

	const fragment = tagName === 0
	const custom = Object.isPrototypeOf.call(shared.EFBaseComponent, scoped || tagName)

	// Check if element needs a namespace
	if (!fragment && !custom) {
		if (scoped) {
			if (typeof scoped === 'string') tagName = scoped
			else if (scoped.tag) {
				tagName = scoped.tag
				if (scoped.namespaceURI) namespace = scoped.namespaceURI
			}
		}
		if (hasColon(tagName)) {
			const [prefix, unprefixedTagName] = splitByColon(tagName)
			const localNamespaceDef = ctx.localNamespaces[prefix]
			if (localNamespaceDef) {
				namespace = localNamespaceDef
				isLocalPrefix = true
			} else {
				namespace = getNamespace(prefix)
			}
			tagName = unprefixedTagName
		} else if (info.a && info.a.xmlns && typeValid(info.a.xmlns)) {
			namespace = info.a.xmlns
		} else if (!namespace) {
			tagName = tagName.toLowerCase()
			switch (tagName) {
				case 'svg': {
					namespace = svgNS
					break
				}
				case 'math': {
					namespace = mathNS
					break
				}
				default:
			}
		}
	}

	if (namespace === htmlNS) namespace = ''

	// First create an element according to the description
	const element = createElement(ctx, {info, namespace, fragment, custom})
	if (fragment && process.env.NODE_ENV !== 'production') DOM.append(element, DOM.document.createComment('<Fragment>'))

	// Leave SVG mode if tag is `foreignObject`
	if (namespace && namespace === svgNS && isSVGEscape(tagName)) namespace = ''

	// restore previous namespace if namespace is defined locally
	if (isLocalPrefix) namespace = previousNamespace

	// Append child nodes
	for (let node of childNodes) {
		if (node instanceof shared.EFBaseComponent) node.$mount({target: element})
		else resolveAST(ctx, {node, nodeType: typeOf(node), element, namespace, create})
	}
	if (fragment && process.env.NODE_ENV !== 'production') DOM.append(element, DOM.document.createComment('</Fragment>'))

	return element
}

export {create, nullComponent, checkDestroyed, applyMountPoint}
