import ARR from './array-helper.js'
import isInstance from './fast-instance-of.js'
import {prepareArgs} from './buble-fix.js'

const proto = Node.prototype

// Will require a weakmap polyfill for IE10 and below
const mountingPointStore = new WeakMap()

const DOM = {}

const EFFragment = class extends Array {
	appendTo(node) {
		DOM.append.apply(null, prepareArgs(this, node))
	}
	insertBeforeTo(node) {
		const args = ARR.copy(this)
		ARR.unshift(args, node)
		DOM.before.apply(null, prepareArgs(this, node))
	}
	insertAfterTo(node) {
		const args = ARR.copy(this)
		ARR.unshift(args, node)
		DOM.after.apply(null, prepareArgs(this, node))
	}
	remove() {
		for (let i of this) DOM.remove(i)
	}
}

DOM.before = (node, ...nodes) => {
	const tempFragment = document.createDocumentFragment()
	for (let i of nodes) {
		if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else proto.appendChild.call(tempFragment, i)
	}
	proto.insertBefore.call(node.parentNode, tempFragment, node)
}

DOM.after = (node, ...nodes) => {
	const tempFragment = document.createDocumentFragment()
	for (let i of nodes) {
		if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else proto.appendChild.call(tempFragment, i)
	}
	if (node.nextSibling) proto.insertBefore.call(node.parentNode, tempFragment, node.nextSibling)
	else proto.appendChild.call(node.parentNode, tempFragment)
}

const handleMountingPoint = (mountingPoint, tempFragment) => {
	const {node} = mountingPoint
	if (!node) return
	if (Array.isArray(node) && node.clear) {
		for (let j of node) {
			const {element, placeholder} = j.$ctx.nodeInfo
			DOM.append(tempFragment, element, placeholder)
		}
	} else {
		const {element, placeholder} = node.$ctx.nodeInfo
		DOM.append(tempFragment, element, placeholder)
	}
}

DOM.append = (node, ...nodes) => {
	if (isInstance(node, EFFragment)) return node.push(...nodes)
	if ([1,9,11].indexOf(node.nodeType) === -1) return
	const tempFragment = document.createDocumentFragment()
	for (let i of nodes) {
		if (isInstance(i, EFFragment)) i.appendTo(tempFragment)
		else {
			proto.appendChild.call(tempFragment, i)
			const mountingPoint = mountingPointStore.get(i)
			if (mountingPoint) handleMountingPoint(mountingPoint, tempFragment)
		}
	}
	proto.appendChild.call(node, tempFragment)
}

DOM.remove = (node) => {
	if (isInstance(node, EFFragment)) node.remove()
	else proto.removeChild.call(node.parentNode, node)
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
// 	if (parent) proto.replaceChild.call(parent, newNode, node)
// },

// swap(node, newNode) {
// 	const nodeParent = node.parentNode
// 	const newNodeParent = newNode.parentNode
// 	const nodeSibling = node.nextSibling
// 	const newNodeSibling = newNode.nextSibling
// 	if (nodeParent && newNodeParent) {
// 		proto.insertBefore.call(nodeParent, newNode, nodeSibling)
// 		proto.insertBefore.call(newNodeParent, node, newNodeSibling)
// 	}
// },

// prepend(node, ...nodes) {
// 	if ([1,9,11].indexOf(node.nodeType) === -1) {
// 		return
// 	}
// 	const tempFragment = document.createDocumentFragment()
// 	nodes.reverse()
// 	for (let i of nodes) {
// 		proto.appendChild.call(tempFragment, i)
// 	}
// 	if (node.firstChild) {
// 		proto.insertBefore.call(node, tempFragment, node.firstChild)
// 	} else {
// 		proto.appendChild.call(node, tempFragment)
// 	}
// },

// appendTo(node, newNode) {
// 	proto.appendChild.call(newNode, node)
// },

// prependTo(node, newNode) {
// 	if (newNode.firstChild) {
// 		proto.insertBefore.call(newNode, node, node.firstChild)
// 	} else {
// 		proto.appendChild.call(newNode, node)
// 	}
// },

// empty(node) {
// 	node.innerHTML = ''
// },

export {DOM, EFFragment, mountingPointStore}
