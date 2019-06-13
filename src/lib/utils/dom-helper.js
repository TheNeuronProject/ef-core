import ARR from './array-helper.js'
import isInstance from './fast-instance-of.js'
import {enumerableFalse, prepareArgs} from './buble-fix.js'
import {inform, exec} from '../render-queue.js'

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

const MountingList = class extends Array {
	constructor(info, ...args) {
		super(...args)
		Object.defineProperty(this, '__info__', {value: info})
	}
	empty() {
		inform()
		for (let i of ARR.copy(this)) i.$destroy()
		exec()
		ARR.empty(this)
	}
	clear() {
		inform()
		for (let i of ARR.copy(this)) i.$umount()
		exec()
		ARR.empty(this)
	}
	pop() {
		if (this.length === 0) return
		const poped = super.pop()
		poped.$umount()
		return poped
	}
	push(...items) {
		const {ctx, key, anchor} = this.__info__
		const elements = []
		inform()
		for (let i of items) ARR.push(elements, i.$mount({parent: ctx.state, key}))
		if (this.length === 0) DOM.after(anchor, ...elements)
		else DOM.after(this[this.length - 1].$ctx.nodeInfo.placeholder, ...elements)
		exec()
		return super.push(...items)
	}
	remove(item) {
		if (this.indexOf(item) === -1) return
		item.$umount()
		return item
	}
	reverse() {
		const {ctx, key, anchor} = this.__info__
		if (this.length === 0) return this
		const tempArr = ARR.copy(this)
		const elements = []
		inform()
		for (let i = tempArr.length - 1; i >= 0; i--) {
			tempArr[i].$umount()
			ARR.push(elements, tempArr[i].$mount({parent: ctx.state, key}))
		}
		super.push(...ARR.reverse(tempArr))
		DOM.after(anchor, ...elements)
		exec()
		return this
	}
	shift() {
		if (this.length === 0) return
		const shifted = super.shift()
		shifted.$umount()
		return shifted
	}
	sort(fn) {
		const {ctx, key, anchor} = this.__info__
		if (this.length === 0) return this
		const sorted = ARR.copy(super.sort(fn))
		const elements = []
		inform()
		for (let i of sorted) {
			i.$umount()
			ARR.push(elements, i.$mount({parent: ctx.state, key}))
		}
		super.push(...sorted)
		DOM.after(anchor, ...elements)
		exec()
		return this
	}
	splice(...args) {
		if (this.length === 0) return this
		const spliced = ARR.splice(ARR.copy(this), ...args)
		inform()
		for (let i of spliced) i.$umount()
		exec()
		return spliced
	}
	unshift(...items) {
		const {ctx, key, anchor} = this.__info__
		if (this.length === 0) return this.push(...items).length
		const elements = []
		inform()
		for (let i of items) ARR.push(elements, i.$mount({parent: ctx.state, key}))
		DOM.after(anchor, ...elements)
		exec()
		return super.unshift(...items)
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
	if (isInstance(node, MountingList)) {
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
			const mountingPoint = mountingPointStore.get(i)
			if (mountingPoint) handleMountingPoint(mountingPoint, tempFragment)
			proto.appendChild.call(tempFragment, i)
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

enumerableFalse(MountingList, ['constructor', 'empty', 'clear', 'pop', 'push', 'remove', 'reverse', 'shift', 'sort', 'splice', 'unshift'])

export {DOM, EFFragment, MountingList, mountingPointStore}
