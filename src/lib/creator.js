import createElement from './element-creator.js'
import {queue, inform, exec} from './render-queue.js'
import {DOM, MountingList, mountingPointStore} from './utils/dom-helper.js'
import ARR from './utils/array-helper.js'
import typeOf from './utils/type-of.js'
import initBinding from './binding.js'
import mountOptions from '../mount-options.js'

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
		textNode.textContent = dataNode[_key]
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
	if (isFragment) mountingPointStore.set(anchor, children[key])
}

const bindMountingList = ({ctx, key, anchor}) => {
	const {children, isFragment} = ctx
	children[key] = {
		node: new MountingList({ctx, key, anchor}),
		anchor
	}
	if (isFragment) mountingPointStore.set(anchor, children[key])
}

// Walk through the AST to perform proper actions
const resolveAST = ({node, nodeType, element, ctx, innerData, refs, handlers, subscribers, svg, create, EFBaseComponent}) => {
	switch (nodeType) {
		// Static text node
		case 'string': {
			DOM.append(element, document.createTextNode(node))
			break
		}
		// Child element or a dynamic text node
		case 'array': {
			// Recursive call for child element
			if (typeOf(node[0]) === 'object') DOM.append(element, create({node, ctx, innerData, refs, handlers, subscribers, svg, create, EFBaseComponent}))
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
const create = ({node, ctx, innerData, refs, handlers, subscribers, svg, create, EFBaseComponent}) => {
	const [info, ...childNodes] = node
	const fragment = info.t === 0
	// Enter SVG mode
	if (!fragment && !svg && info.t.toLowerCase() === 'svg') svg = true
	// First create an element according to the description
	const element = createElement({info, ctx, innerData, refs, handlers, subscribers, svg})
	if (fragment && process.env.NODE_ENV !== 'production') element.push(document.createComment('EF FRAGMENT START'))

	// Leave SVG mode if tag is `foreignObject`
	if (svg && info.t.toLowerCase() === 'foreignobject') svg = false

	// Append child nodes
	for (let i of childNodes) {
		if (i instanceof EFBaseComponent) i.$mount({target: element})
		else resolveAST({node: i, nodeType: typeOf(i), element, ctx, innerData, refs, handlers, subscribers, svg, create, EFBaseComponent})
	}
	if (fragment && process.env.NODE_ENV !== 'production') element.push(document.createComment('EF FRAGMENT END'))

	return element
}

export {create, nullComponent, checkDestroyed, applyMountingPoint}
