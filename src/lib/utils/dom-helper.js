// import ARR from './array-helper.js'
import isInstance from './fast-instance-of.js'
import noop from './noop.js'
import {assign} from './polyfills.js'
import {prepareArgs} from './buble-fix.js'
import dbg from './debug.js'
import isBrowser from './is-browser.js'
import ARR from './array-helper.js'
import {inform, exec} from '../render-queue.js'

import shared from './global-shared.js'

// Will require a weakmap polyfill for IE10 and below
const mountingPointStore = new WeakMap()

const DOM = {}

const EFFragment = class {
	constructor() {
		this.$children = []
		this.$safeZone = DOM.document.createDocumentFragment()
	}

	append(...args) {
		DOM.append.apply(null, prepareArgs(args, this.$safeZone))
		return this.$children.push(...args)
	}

	appendTo(node) {
		DOM.append.apply(null, prepareArgs(this.$children, node))
	}

	removeChild(node) {
		DOM.remove(node)
		ARR.remove(this.$children, node)
	}

	remove() {
		for (let i of this.$children) DOM.append(this.$safeZone, i)
	}
}

const appendNode = (node, tempFragment) => {
	const {element, placeholder} = node.$ctx.nodeInfo
	DOM.append(tempFragment, element, placeholder)
}

const handleMountingPoint = (element, tempFragment) => {
	if (element.nodeType !== 3) return

	const mountingPoint = mountingPointStore.get(element)
	if (!mountingPoint) return

	const {node} = mountingPoint
	if (!node) return
	if (ARR.isArray(node)) {
		for (let i of node) appendNode(i, tempFragment)
	} else appendNode(node, tempFragment)
}

DOM.isNodeInstance = (node) => {
	if (DOM.isNode) return DOM.isNode(node)
	return node instanceof DOM.Node
}

DOM.before = (node, ...nodes) => {
	const tempFragment = DOM.document.createDocumentFragment()
	inform()
	for (let i of nodes) {
		if (i instanceof shared.EFBaseComponent) {
			i.$mount({target: tempFragment})
		} else if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else {
			tempFragment.appendChild(i)
			handleMountingPoint(i, tempFragment)
		}
	}
	node.parentNode.insertBefore(tempFragment, node)
	exec()
}

DOM.after = (node, ...nodes) => {
	const tempFragment = DOM.document.createDocumentFragment()
	inform()
	for (let i of nodes) {
		if (i instanceof shared.EFBaseComponent) {
			i.$mount({target: tempFragment})
		} else if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else tempFragment.appendChild(i)
	}
	if (node.nextSibling) node.parentNode.insertBefore(tempFragment, node.nextSibling)
	else node.parentNode.appendChild(tempFragment)
	exec()
}

DOM.append = (node, ...nodes) => {
	// Handle fragment
	if (isInstance(node, EFFragment)) return node.append(...nodes)
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

	if ([1,9,11].indexOf(node.nodeType) === -1) return
	const tempFragment = DOM.document.createDocumentFragment()
	for (let i of nodes) {
		if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else if (DOM.isNodeInstance(i)) {
			tempFragment.appendChild(i)
			handleMountingPoint(i, tempFragment)
		} else if (i instanceof shared.EFBaseComponent) {
			i.$mount({target: tempFragment})
		}
	}
	node.appendChild(tempFragment)
}

DOM.remove = (node) => {
	if (isInstance(node, EFFragment)) node.remove()
	else if (node instanceof shared.EFBaseComponent) node.$umount()
	else node.parentNode.removeChild(node)
}

// addClass(node, className) {
// 	const classes = className.split(' ')
// 	node.classList.add(...classes)
// },

// removeClass(node, className) {
// 	const classes = className.split(' ')
// 	node.classList.remove(...classes)
// },

// toggleClass(node, className) {
// 	const classes = className.split(' ')
// 	const classArr = node.className.split(' ')
// 	for (let i of classes) {
// 		const classIndex = classArr.indexOf(i)
// 		if (classIndex > -1) {
// 			classArr.splice(classIndex, 1)
// 		} else {
// 			classArr.push(i)
// 		}
// 	}
// 	node.className = classArr.join(' ').trim()
// },

// replaceWith(node, newNode) {
// 	const parent = node.parentNode
// 	if (parent) parent.replaceChild(newNode, node)
// },

// swap(node, newNode) {
// 	const nodeParent = node.parentNode
// 	const newNodeParent = newNode.parentNode
// 	const nodeSibling = node.nextSibling
// 	const newNodeSibling = newNode.nextSibling
// 	if (nodeParent && newNodeParent) {
// 		nodeParent.insertBefore(newNode, nodeSibling)
// 		newNodeParent.insertBefore(node, newNodeSibling)
// 	}
// },

// prepend(node, ...nodes) {
// 	if ([1,9,11].indexOf(node.nodeType) === -1) {
// 		return
// 	}
// 	const tempFragment = DOM.document.createDocumentFragment()
// 	nodes.reverse()
// 	for (let i of nodes) {
// 		tempFragment.appendChild(i)
// 	}
// 	if (node.firstChild) {
// 		node.insertBefore(tempFragment, node.firstChild)
// 	} else {
// 		node.appendChild(tempFragment)
// 	}
// },

// appendTo(node, newNode) {
// 	newNode.appendChild(node)
// },

// prependTo(node, newNode) {
// 	if (newNode.firstChild) {
// 		newNode.insertBefore(node, node.firstChild)
// 	} else {
// 		newNode.appendChild(node)
// 	}
// },

// empty(node) {
// 	node.innerHTML = ''
// },

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

export {DOM, EFFragment, mountingPointStore, setDOMImpl}
