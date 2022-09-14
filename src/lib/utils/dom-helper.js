// import ARR from './array-helper.js'
import isInstance from './fast-instance-of.js'
import noop from './noop.js'
import {assign} from './polyfills.js'
import {prepareArgs} from './buble-fix.js'
import dbg from './debug.js'
import isBrowser from './is-browser.js'
import ARR from './array-helper.js'
import {inform, exec} from '../render-queue.js'
import mountOptions from '../../mount-options.js'

import shared from './global-shared.js'

const EFMountPoint = '__ef_mount_point__'

const DOM = {}

const EFFragment = class {
	constructor() {
		this.$children = []
		this.$safeZone = DOM.document.createDocumentFragment()
	}

	append(...args) {
		DOM.append(this.$safeZone, ...prepareArgs(args))
		return this.$children.push(...args)
	}

	appendTo(node) {
		DOM.append(node, ...prepareArgs(this.$children))
	}

	addBefore(node) {
		DOM.before(node, ...prepareArgs(this.$children))
	}

	removeChild(node) {
		DOM.remove(node)
		ARR.remove(this.$children, node)
	}

	remove() {
		for (let i of this.$children) DOM.append(this.$safeZone, i)
	}
}

const appendNode = (node, target) => {
	const {element, placeholder} = node.$ctx.nodeInfo
	DOM.append(target, element, placeholder)
}

const handleMountPoint = (element, target) => {
	if (element.nodeType !== 3) return

	const mountPoint = element[EFMountPoint]
	if (!mountPoint) return

	const {node} = mountPoint
	if (!node) return

	if (ARR.isArray(node)) {
		for (let i of node) appendNode(i, target)
	} else appendNode(node, target)
}

const appendToTarget = (target, nodes) => {
	for (let i of nodes) {
		if (DOM.isNodeInstance(i)) {
			target.appendChild(i)
			handleMountPoint(i, target)
		} else if (isInstance(i, EFFragment)) i.appendTo(target)
		else if (i instanceof shared.EFBaseComponent) {
			i.$mount({target})
		}
	}
}

const addBeforeTarget = (target, nodes) => {
	for (let i of nodes) {
		if (DOM.isNodeInstance(i)) {
			target.parentNode.insertBefore(i, target)
			handleMountPoint(i, target.parentNode)
		} else if (isInstance(i, EFFragment)) i.addBefore(target)
		else if (i instanceof shared.EFBaseComponent) {
			i.$mount({target, option: mountOptions.BEFORE})
		}
	}
}

DOM.isNodeInstance = (node) => {
	if (DOM.isNode) return DOM.isNode(node)
	return !!(node && node.nodeType)
}

DOM.before = (node, ...nodes) => {
	const parent = node.parentNode
	if (nodes.length === 1 && DOM.isNodeInstance(nodes[0])) parent.insertBefore(nodes[0], node)
	else if (parent.nodeType === 11) {
		addBeforeTarget(node, nodes)
	} else {
		const tempFragment = DOM.document.createDocumentFragment()
		appendToTarget(tempFragment, nodes)
		parent.insertBefore(tempFragment, node)
	}
}

DOM.after = (node, ...nodes) => {
	if (node.nextSibling) return DOM.before(node.nextSibling, ...nodes)
	return DOM.append(node.parentNode, ...nodes)
}

DOM.append = (node, ...nodes) => {
	if (DOM.isNodeInstance(node)) {
		if (nodes.length === 1 && DOM.isNodeInstance(nodes[0])) node.appendChild(nodes[0])
		else if (node.nodeType === 11) appendToTarget(node, nodes)
		else if (node.nodeType === 1 || node.nodeType === 9) {
			const tempFragment = DOM.document.createDocumentFragment()
			appendToTarget(tempFragment, nodes)
			node.appendChild(tempFragment)
		}

		return
	}

	// Handle EFComponent
	if (node instanceof shared.EFBaseComponent) {
		if (!(ARR.isArray(node.children))) {
			if (process.env.NODE_ENV !== 'production') dbg.warn(node, 'has no `children` list mount point! Child nodes are all ignored!')
			return
		}

		inform()
		for (let i of nodes) {
			i = shared.toEFComponent(i)
			node.children.push(i)
		}
		exec()

		return
	}

	// Handle fragment
	if (isInstance(node, EFFragment)) return node.append(...nodes)
}

DOM.remove = (node) => {
	if (DOM.isNodeInstance(node)) {
		if (node.parentNode) node.parentNode.removeChild(node)
	} else if (node instanceof shared.EFBaseComponent) node.$umount()
	else if (isInstance(node, EFFragment)) node.remove()
}

const setDOMImpl = (impl) => {
	assign(DOM, impl)

	const dummyText = DOM.document.createTextNode('')

	DOM.textNodeSupportsEvent = !!dummyText.addEventListener
	DOM.passiveSupported = false
	DOM.onceSupported = false

	try {
		const options = Object.create({}, {
			passive: {
				get: () => {
					DOM.passiveSupported = true
				}
			},
			once: {
				get: () => {
					DOM.onceSupported = true
				}
			}
		})
		DOM.document.addEventListener('__ef_event_option_test__', noop, options)
		DOM.document.removeEventListener('__ef_event_option_test__', noop, options)
	} catch (e) {

		/* do nothing */
	}
}

if (isBrowser) setDOMImpl({document, Node})

export {DOM, EFFragment, EFMountPoint, setDOMImpl}
