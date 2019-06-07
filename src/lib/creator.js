import createElement from './element-creator.js'
import { queue, inform, exec } from './render-queue.js'
import DOM from './utils/dom-helper.js'
import ARR from './utils/array-helper.js'
import defineArr from './utils/dom-arr-helper.js'
import typeOf from './utils/type-of.js'
import dbg from './utils/debug.js'
import initBinding from './binding.js'
import mountOptions from '../mount-options.js'

const nullComponent = Object.create(null)

const checkDestroyed = (state) => {
	if (!state.$ctx) throw new Error('[EF] This component has been destroied!')
}

const bindTextNode = ({node, ctx, handlers, subscribers, innerData, element}) => {
	// Data binding text node
	const textNode = document.createTextNode('')
	const { dataNode, handlerNode, _key } = initBinding({bind: node, ctx, handlers, subscribers, innerData})
	const handler = () => {
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
	const {anchor} = child
	if (child.node === value) return
	if (value && value !== nullComponent) {
		if (value.$ctx.nodeInfo.parent && process.env.NODE_ENV !== 'production') dbg.warn('Better detach the component before attaching it to a new component!')
		if (value.$ctx.nodeInfo.element.contains(ctx.nodeInfo.element)) {
			if (process.env.NODE_ENV !== 'production') dbg.warn('Cannot mount a component to it\'s child component!')
			return
		}
	}

	inform()
	// Update component
	if (child.node) {
		if (value === nullComponent) value = null
		else child.node.$umount()
	}
	// Update stored value
	child.node = value
	if (value) value.$mount({target: anchor, parent: ctx.state, option: mountOptions.BEFORE, key})
	exec()
}

const updateMountingList = ({ctx, key, value}) => {
	const {children} = ctx
	const child = children[key]
	const {anchor} = child
	if (child && ARR.equals(child, value)) return
	if (value) value = ARR.copy(value)
	else value = []
	const fragment = document.createDocumentFragment()
	// Update components
	inform()
	if (child) {
		for (let item of value) {
			item.$umount()
			DOM.append(fragment, item.$mount({parent: ctx.state, key}))
		}
		for (let item of ARR.copy(child)) item.$umount()
	} else for (let item of value) DOM.append(fragment, item.$mount({parent: ctx.state, key}))
	// Update stored value
	child.length = 0
	ARR.push(child, ...value)
	// Append to current component
	DOM.after(anchor, fragment)
	exec()
}

const mountingPointUpdaters = [
	updateMountingNode,
	updateMountingList
]

const applyMountingPoint = (type, key, proto) => {
	Object.defineProperty(proto, key, {
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

const bindMountingNode = ({key, children, anchor}) => {
	children[key] = {anchor}
}

const bindMountingList = ({ctx, key, children, anchor}) => {
	children[key] = {
		node: defineArr([], {ctx, key, anchor}),
		anchor
	}
}

const resolveAST = ({node, nodeType, element, ctx, innerData, refs, handlers, subscribers, svg, create}) => {
	switch (nodeType) {
		case 'string': {
			// Static text node
			DOM.append(element, document.createTextNode(node))
			break
		}
		case 'array': {
			if (typeOf(node[0]) === 'object') DOM.append(element, create({node, ctx, innerData, refs, handlers, subscribers, svg, create}))
			else bindTextNode({node, ctx, handlers, subscribers, innerData, element})
			break
		}
		case 'object': {
			const anchor = document.createTextNode('')
			if (node.t === 0) bindMountingNode({key: node.n, children: ctx.children, anchor})
			else bindMountingList({ctx, key: node.n, children: ctx.children, anchor})
			// Append anchor
			DOM.append(element, anchor)
			// Display anchor indicator in development mode
			if (process.env.NODE_ENV !== 'production') {
				DOM.before(anchor, document.createComment(`Start of mounting point '${node.n}'`))
				DOM.after(anchor, document.createComment(`End of mounting point '${node.n}'`))
			}
			break
		}
		default: {
			throw new TypeError(`Not a standard ef.js AST: Unknown node type '${nodeType}'`)
		}
	}
}

const create = ({node, ctx, innerData, refs, handlers, subscribers, svg, create}) => {
	const [info, ...childNodes] = node
	// Enter SVG mode
	if (!svg && info.t.toLowerCase() === 'svg') svg = true
	// First create an element according to the description
	const element = createElement({info, ctx, innerData, refs, handlers, subscribers, svg})

	// Leave SVG mode if tag is `foreignObject`
	if (svg && info.t.toLowerCase() === 'foreignobject') svg = false

	// Append child nodes
	for (let i of childNodes) resolveAST({node: i, nodeType: typeOf(i), element, ctx, innerData, refs, handlers, subscribers, svg, create})

	return element
}

export {create, nullComponent, checkDestroyed, applyMountingPoint}
