// import ARR from './array-helper.js'
import isInstance from './fast-instance-of.js'
import noop from './noop.js'
import {assign} from './polyfills.js'
import dbg from './debug.js'
import isBrowser from './is-browser.js'
import ARR from './array-helper.js'
import {queueDom, inform, exec} from '../render-queue.js'
import mountOptions from '../../mount-options.js'

import shared from './global-shared.js'

const EFMountPoint = '__ef_mount_point__'

const DOM = {}

const DocumentFragmentCache = []
const AnchorCache = []

const useFragment = (cb) => {
	const fragment = DocumentFragmentCache.pop() || DOM.document.createDocumentFragment()
	const recycle = () => {
		DocumentFragmentCache.push(fragment)
	}
	return cb(fragment, recycle)
}

const useAnchor = (cb) => {
	const anchor = AnchorCache.pop() || DOM.document.createTextNode('')
	const recycle = () => {
		AnchorCache.push(anchor)
	}
	return cb(anchor, recycle)
}

const EFFragment = class {
	constructor() {
		this.$children = []
		this.$safeZone = DOM.document.createDocumentFragment()
	}

	append(...args) {
		DOM.append(this.$safeZone, ...args)
		ARR.push(this.$children, ...args)
	}

	appendTo(node) {
		DOM.append(node, ...this.$children)
	}

	addBefore(node) {
		DOM.before(node, ...this.$children)
	}

	removeChild(node) {
		DOM.remove(node)
		ARR.remove(this.$children, node)
	}

	remove() {
		DOM.append(this.$safeZone, ...this.$children)
	}

	get firstElement() {
		return this.$children[0] || null
	}
}

const appendNode = (node, target) => {
	const {element, placeholder} = node.$ctx.nodeInfo
	DOM.append(target, element, placeholder)
}

const insertBeforeNode = (node, ref) => {
	const {element, placeholder} = node.$ctx.nodeInfo
	DOM.before(ref, element, placeholder)
}

const handleMountPoint = (element, target, ref) => {
	if (element.nodeType !== 3) return

	const mountPoint = element[EFMountPoint]
	if (!mountPoint) return

	const {node} = mountPoint
	if (!node) return

	inform()
	if (ref) {
		if (ARR.isArray(node)) {
			for (let i of node) insertBeforeNode(i, ref)
		} else insertBeforeNode(node, ref)
	} else {
		// eslint-disable-next-line no-lonely-if
		if (ARR.isArray(node)) {
			for (let i of node) appendNode(i, target)
		} else appendNode(node, target)
	}
	exec()
}

const appendToTarget = (target, nodes) => {
	inform()
	for (let i of nodes) {
		if (DOM.isNodeInstance(i)) {
			target.appendChild(i)
			handleMountPoint(i, target)
		} else if (isInstance(i, EFFragment)) {
			i.appendTo(target)
		} else if (i instanceof shared.EFBaseComponent) {
			i.$mount({target})
		}
	}
	exec()
}

const addBeforeTarget = (target, nodes) => {
	const parentNode = target.parentNode
	inform()
	for (let i of nodes) {
		if (DOM.isNodeInstance(i)) {
			parentNode.insertBefore(i, target)
			handleMountPoint(i, parentNode, target)
		} else if (isInstance(i, EFFragment)) {
			i.addBefore(target)
		} else if (i instanceof shared.EFBaseComponent) {
			i.$mount({target, option: mountOptions.BEFORE})
		}
	}
	exec()
}

DOM.isNodeInstance = (node) => {
	if (DOM.isNode) return DOM.isNode(node)
	return !!(node && node.nodeType)
}

DOM.before = (anchorNode, ...nodes) => {
	const parentNode = anchorNode.parentNode
	const firstNode = nodes[0]
	if (
		nodes.length === 1 &&
		DOM.isNodeInstance(firstNode) &&
		// When the node is a text node, check if it's not a mount point anchor
		// eslint-disable-next-line multiline-ternary, no-ternary
		(firstNode.nodeType === 3 ? !firstNode[EFMountPoint] : true)
	) {
		parentNode.insertBefore(nodes[0], anchorNode)
	} else if (parentNode.nodeType === 11) {
		addBeforeTarget(anchorNode, nodes)
	} else {
		useFragment((tempFragment, recycleFragment) => {
			inform()
			appendToTarget(tempFragment, nodes)
			useAnchor((tempAnchor, recycleAnchor) => {
				parentNode.insertBefore(tempAnchor, anchorNode)
				queueDom(() => {
					parentNode.insertBefore(tempFragment, tempAnchor)
					parentNode.removeChild(tempAnchor)
					recycleAnchor()
					recycleFragment()
				})
			})
			exec()
		})
	}
}

DOM.after = (anchorNode, ...nodes) => {
	if (anchorNode.nextSibling) return DOM.before(anchorNode.nextSibling, ...nodes)
	return DOM.append(anchorNode.parentNode, ...nodes)
}

DOM.append = (parentNode, ...nodes) => {
	if (DOM.isNodeInstance(parentNode)) {
		if (nodes.length === 1 && DOM.isNodeInstance(nodes[0])) {
			parentNode.appendChild(nodes[0])
			handleMountPoint(nodes[0], parentNode)
		} else if (parentNode.nodeType === 11) {
			appendToTarget(parentNode, nodes)
		} else if (parentNode.nodeType === 1 || parentNode.nodeType === 9) {
			useFragment((tempFragment, recycleFragment) => {
				inform()
				appendToTarget(tempFragment, nodes)
				useAnchor((tempAnchor, recycleAnchor) => {
					parentNode.appendChild(tempAnchor)
					queueDom(() => {
						parentNode.insertBefore(tempFragment, tempAnchor)
						parentNode.removeChild(tempAnchor)
						recycleAnchor()
						recycleFragment()
					})
				})
				exec()
			})
		}

		return
	}

	// Handle EFComponent
	if (parentNode instanceof shared.EFBaseComponent) {
		if (!(ARR.isArray(parentNode.children))) {
			if (process.env.NODE_ENV !== 'production') dbg.warn(parentNode, 'has no `children` list mount point! Child nodes are all ignored!')
			return
		}

		parentNode.children.push(...nodes)

		return
	}

	// Handle fragment
	// if (isInstance(parentNode, EFFragment)) parentNode.append(...nodes)
	parentNode.append(...nodes)
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
					return DOM.passiveSupported
				}
			},
			once: {
				get: () => {
					DOM.onceSupported = true
					return DOM.onceSupported
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

export {DOM, EFFragment, EFMountPoint, setDOMImpl, useFragment, useAnchor}
