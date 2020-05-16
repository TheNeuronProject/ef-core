// import ARR from './array-helper.js'
import isInstance from './fast-instance-of.js'
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
	if (Array.isArray(node)) {
		for (let i of node) appendNode(i, tempFragment)
	} else appendNode(node, tempFragment)
}

DOM.before = (node, ...nodes) => {
	const tempFragment = DOM.document.createDocumentFragment()
	inform()
	for (let i of nodes) {
		if (i instanceof shared.EFBaseComponent) {
			i.$mount({target: tempFragment})
		} else if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else {
			DOM.Node.prototype.appendChild.call(tempFragment, i)
			handleMountingPoint(i, tempFragment)
		}
	}
	DOM.Node.prototype.insertBefore.call(node.parentNode, tempFragment, node)
	exec()
}

DOM.after = (node, ...nodes) => {
	const tempFragment = DOM.document.createDocumentFragment()
	inform()
	for (let i of nodes) {
		if (i instanceof shared.EFBaseComponent) {
			i.$mount({target: tempFragment})
		} else if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else DOM.Node.prototype.appendChild.call(tempFragment, i)
	}
	if (node.nextSibling) DOM.Node.prototype.insertBefore.call(node.parentNode, tempFragment, node.nextSibling)
	else DOM.Node.prototype.appendChild.call(node.parentNode, tempFragment)
	exec()
}

DOM.append = (node, ...nodes) => {
	// Handle fragment
	if (isInstance(node, EFFragment)) return node.append(...nodes)
	// Handle EFComponent
	if (node instanceof shared.EFBaseComponent) {
		if (!(Array.isArray(node.children))) {
			if (process.env.NODE_ENV !== 'production') dbg.warn(node, 'has no `children` list mount point! Child nodes are all ignored!')
			return
		}

		inform()
		for (let i of nodes) {
			i = new shared.toEFComponent(i)
			node.children.push(i)
		}
		exec()

		return
	}

	if ([1,9,11].indexOf(node.nodeType) === -1) return
	const tempFragment = DOM.document.createDocumentFragment()
	for (let i of nodes) {
		if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else if (i instanceof DOM.Node) {
			DOM.Node.prototype.appendChild.call(tempFragment, i)
			handleMountingPoint(i, tempFragment)
		} else if (i instanceof shared.EFBaseComponent) {
			i.$mount({target: tempFragment})
		}
	}
	DOM.Node.prototype.appendChild.call(node, tempFragment)
}

DOM.remove = (node) => {
	if (isInstance(node, EFFragment)) node.remove()
	else if (node instanceof shared.EFBaseComponent) node.$umount()
	else DOM.Node.prototype.removeChild.call(node.parentNode, node)
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
// 	if (parent) DOM.Node.prototype.replaceChild.call(parent, newNode, node)
// },

// swap(node, newNode) {
// 	const nodeParent = node.parentNode
// 	const newNodeParent = newNode.parentNode
// 	const nodeSibling = node.nextSibling
// 	const newNodeSibling = newNode.nextSibling
// 	if (nodeParent && newNodeParent) {
// 		DOM.Node.prototype.insertBefore.call(nodeParent, newNode, nodeSibling)
// 		DOM.Node.prototype.insertBefore.call(newNodeParent, node, newNodeSibling)
// 	}
// },

// prepend(node, ...nodes) {
// 	if ([1,9,11].indexOf(node.nodeType) === -1) {
// 		return
// 	}
// 	const tempFragment = DOM.document.createDocumentFragment()
// 	nodes.reverse()
// 	for (let i of nodes) {
// 		DOM.Node.prototype.appendChild.call(tempFragment, i)
// 	}
// 	if (node.firstChild) {
// 		DOM.Node.prototype.insertBefore.call(node, tempFragment, node.firstChild)
// 	} else {
// 		DOM.Node.prototype.appendChild.call(node, tempFragment)
// 	}
// },

// appendTo(node, newNode) {
// 	DOM.Node.prototype.appendChild.call(newNode, node)
// },

// prependTo(node, newNode) {
// 	if (newNode.firstChild) {
// 		DOM.Node.prototype.insertBefore.call(newNode, node, node.firstChild)
// 	} else {
// 		DOM.Node.prototype.appendChild.call(newNode, node)
// 	}
// },

// empty(node) {
// 	node.innerHTML = ''
// },

const setDOMImpl = sim => assign(DOM, sim)

if (isBrowser) setDOMImpl({Node, document})

export {DOM, EFFragment, mountingPointStore, setDOMImpl}
