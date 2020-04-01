import createElement from './element-creator.js'
import {queue, inform, exec} from './render-queue.js'
import {DOM, mountingPointStore} from './utils/dom-helper.js'
import defineArr from './utils/dom-arr-helper.js'
import ARR from './utils/array-helper.js'
import typeOf from './utils/type-of.js'
import initBinding from './binding.js'
import mountOptions from '../mount-options.js'

import shared from './utils/global-shared.js'

const nullComponent = Object.create(null)

const checkDestroyed = (state) => {
	if (!state.$ctx) throw new Error('[EF] This component has been destroyed!')
}

const bindTextNode = ({node, ctx, handlers, subscribers, innerData, element}) => {
	// Data binding text node
	const textNode = document.createTextNode('')
	const { dataNode, handlerNode, _key } = initBinding({bind: node, ctx, handlers, subscribers, innerData})
	const handler = () => {
		const value = dataNode[_key]
		if (typeof value === 'undefined') {
			textNode.textContent = ''
			return
		}
		textNode.textContent = value
	}
	handlerNode.push(handler)
	queue([handler])

	// Append element to the component
	DOM.append(element, textNode)
}

const updateMountingNode = ({ctx, key, value}) => {
	const {children} = ctx
	const child = children[key]
	const {anchor, node} = child
	if (node === value) return

	if (value instanceof Node) value = new shared.EFNodeWrapper(value)
	else if (!(value instanceof shared.EFBaseComponent)) value = new shared.EFTextFragment(`${value}`)

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

const updateMountingList = ({ctx, key, value}) => {
	const {children} = ctx
	const {anchor, node} = children[key]
	if (ARR.equals(node, value)) return
	if (value) value = ARR.copy(value)
	else value = []
	const fragment = document.createDocumentFragment()
	// Update components
	inform()
	if (node) {
		node.clear()
		for (let item of value) {
			if (item instanceof Node) item = new shared.EFNodeWrapper(item)
			else if (!(item instanceof shared.EFBaseComponent)) item = new shared.EFTextFragment(`${item}`)
			if (item.$ctx.nodeInfo.parent) item.$umount()
			DOM.append(fragment, item.$mount({parent: ctx.state, key}))
		}
	} else for (let item of value) DOM.append(fragment, item.$mount({parent: ctx.state, key}))
	// Update stored value
	node.length = 0
	ARR.push(node, ...value)
	// Append to current component
	DOM.after(anchor, fragment)
	exec()
}

const mountingPointUpdaters = [
	updateMountingNode,
	updateMountingList
]

const applyMountingPoint = (type, key, tpl) => {
	Object.defineProperty(tpl.prototype, key, {
		get() {
			if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
			return this.$ctx.children[key].node
		},
		set(value) {
			if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
			const ctx = this.$ctx
			mountingPointUpdaters[type]({ctx, key, value})
		},
		enumerable: true
	})
}

const bindMountingNode = ({ctx, key, anchor}) => {
	const {children, isFragment} = ctx
	children[key] = {anchor}
	if (isFragment) {
		DOM.append(ctx.safeZone, anchor)
		mountingPointStore.set(anchor, children[key])
	}
}

const bindMountingList = ({ctx, key, anchor}) => {
	const {children, isFragment} = ctx
	children[key] = {
		node: defineArr([], {ctx, key, anchor}),
		anchor
	}
	if (isFragment) {
		DOM.append(ctx.safeZone, anchor)
		mountingPointStore.set(anchor, children[key])
	}
}

// Walk through the AST to perform proper actions
const resolveAST = ({node, nodeType, element, ctx, innerData, refs, handlers, subscribers, svg, create}) => {
	switch (nodeType) {
		// Static text node
		case 'string': {
			DOM.append(element, document.createTextNode(node))
			break
		}
		// Child element or a dynamic text node
		case 'array': {
			// Recursive call for child element
			if (typeOf(node[0]) === 'object') DOM.append(element, create({node, ctx, innerData, refs, handlers, subscribers, svg}))
			// Dynamic text node
			else bindTextNode({node, ctx, handlers, subscribers, innerData, element})
			break
		}
		// Mounting points
		case 'object': {
			const anchor = document.createTextNode('')
			// Single node mounting point
			if (node.t === 0) bindMountingNode({ctx, key: node.n, anchor})
			// Multi node mounting point
			else bindMountingList({ctx, key: node.n, anchor})
			// Append anchor
			if (process.env.NODE_ENV !== 'production') DOM.append(element, document.createComment(`EF MOUNTING POINT '${node.n}' START`))
			DOM.append(element, anchor)
			if (process.env.NODE_ENV !== 'production') DOM.append(element, document.createComment(`EF MOUNTING POINT '${node.n}' END`))
			break
		}
		default:
	}
}

// Create elements based on description from AST
const create = ({node, ctx, innerData, refs, handlers, subscribers, svg}) => {
	const [info, ...childNodes] = node
	const fragment = info.t === 0
	const custom = Object.isPrototypeOf.call(shared.EFBaseComponent, ctx.scope[info.t] || info.t)
	// Enter SVG mode
	if (!fragment && !svg && info.t.toLowerCase() === 'svg') svg = true
	// First create an element according to the description
	const element = createElement({info, ctx, innerData, refs, handlers, subscribers, svg, fragment, custom})
	if (fragment && process.env.NODE_ENV !== 'production') element.push(document.createComment('EF FRAGMENT START'))

	// Leave SVG mode if tag is `foreignObject`
	if (svg && info.t.toLowerCase() === 'foreignobject') svg = false

	// Append child nodes
	for (let node of childNodes) {
		if (node instanceof shared.EFBaseComponent) node.$mount({target: element})
		else resolveAST({node, nodeType: typeOf(node), element, ctx, innerData, refs, handlers, subscribers, svg, create})
	}
	if (fragment && process.env.NODE_ENV !== 'production') element.push(document.createComment('EF FRAGMENT END'))

	return element
}

export {create, nullComponent, checkDestroyed, applyMountingPoint}
