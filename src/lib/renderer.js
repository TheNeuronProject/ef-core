import {create, nullComponent, checkDestroyed} from './creator.js'
import initBinding from './binding.js'
import {queueDom, inform, exec} from './render-queue.js'
import {resolveSubscriber} from './resolver.js'
import {DOM, EFFragment, mountingPointStore} from './utils/dom-helper.js'
import ARR from './utils/array-helper.js'
import {assign, legacyAssign} from './utils/polyfills.js'
import isInstance from './utils/fast-instance-of.js'
import typeOf from './utils/type-of.js'
import {enumerableFalse} from './utils/buble-fix.js'
import dbg from './utils/debug.js'
import mountOptions from '../mount-options.js'

const unsubscribe = (pathStr, fn, subscribers) => {
	const subscriberNode = resolveSubscriber(pathStr, subscribers)
	ARR.remove(subscriberNode, fn)
}

const EFBaseComponent = class {
	constructor(ast) {
		const children = {}
		const refs = {}
		const data = {}
		const innerData = {}
		const methods = {}
		const handlers = {}
		const subscribers = {}
		const nodeInfo = {
			placeholder: null,
			replace: [],
			parent: null,
			key: null
		}

		/* Detatched components will be put in the safe zone.
		 * Split safe zone to each component in order to make
		 * the component memory recycleable when lost reference
		 */
		const safeZone = document.createDocumentFragment()

		if (process.env.NODE_ENV === 'production') nodeInfo.placeholder = document.createTextNode('')
		else nodeInfo.placeholder = document.createComment('EF COMPONENT PLACEHOLDER')

		const mount = () => {
			if (nodeInfo.replace.length > 0) {
				for (let i of nodeInfo.replace) DOM.remove(i)
				ARR.empty(nodeInfo.replace)
			}
			DOM.before(nodeInfo.placeholder, nodeInfo.element)
		}

		const ctx = {
			mount, refs, data, innerData, methods,
			handlers, subscribers, nodeInfo, safeZone,
			children, state: this, isFragment: ast[0].t === 0
		}

		Object.defineProperty(this, '$ctx', {
			value: ctx,
			enumerable: false,
			configurable: true
		})

		inform()

		nodeInfo.element = create({node: ast, ctx, innerData, refs, handlers, subscribers, svg: false, create, EFBaseComponent})
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		exec()
	}

	get $data() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.data
	}

	set $data(newData) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		inform()
		assign(this.$ctx.data, newData)
		exec()
	}

	get $methods() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.methods
	}

	set $methods(newMethods) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		this.$ctx.methods = newMethods
	}

	get $refs() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.refs
	}

	$mount({target, option, parent, key}) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		const { nodeInfo, mount } = this.$ctx
		if (typeof target === 'string') target = document.querySelector(target)

		inform()
		if (nodeInfo.parent) {
			this.$umount()
			if (process.env.NODE_ENV !== 'production') dbg.warn('Component detached from previous mounting point.')
		}

		if (!parent) parent = target
		if (!key) key = '__DIRECTMOUNT__'
		nodeInfo.parent = parent
		nodeInfo.key = key
		queueDom(mount)

		if (!target) {
			exec()
			return nodeInfo.placeholder
		}

		switch (option) {
			case mountOptions.BEFORE: {
				DOM.before(target, nodeInfo.placeholder)
				break
			}
			case mountOptions.AFTER: {
				DOM.after(target, nodeInfo.placeholder)
				break
			}
			case mountOptions.REPLACE: {
				DOM.before(target, nodeInfo.placeholder)
				nodeInfo.replace.push(target)
				break
			}
			case mountOptions.APPEND:
			default: {
				// Parent is EFFragment should only happen when using jsx
				if (isInstance(parent, EFFragment)) DOM.append(target, nodeInfo.element)
				else DOM.append(target, nodeInfo.placeholder)
			}
		}
		return exec()
	}

	$umount() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		const { nodeInfo, safeZone, mount } = this.$ctx
		const { parent, key } = nodeInfo
		nodeInfo.parent = null
		nodeInfo.key = null

		inform()
		if (parent) {
			if (key !== '__DIRECTMOUNT__') {
				if (parent[key]) {
					if (Array.isArray(parent[key])) {
						// Remove self from parent list mounting point
						ARR.remove(parent[key], this)
					} else parent[key] = nullComponent
				}
			// Else Remove elements from fragment parent
			} else if (isInstance(parent, EFFragment)) ARR.remove(parent.$ctx.nodeInfo.element, nodeInfo.element)
		}
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		return exec()
	}

	$subscribe(pathStr, subscriber) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		const ctx = this.$ctx
		const { handlers, subscribers, innerData } = ctx
		const _path = pathStr.split('.')
		const { dataNode, subscriberNode, _key } = initBinding({bind: [_path], ctx, handlers, subscribers, innerData})
		inform()
		// Execute the subscriber function immediately
		try {
			subscriber({state: this, value: dataNode[_key]})
			// Put the subscriber inside the subscriberNode
			subscriberNode.push(subscriber)
		} catch (e) {
			dbg.error('Error caught when registering subscriber:\n', e)
		}
		exec()
	}

	$unsubscribe(pathStr, fn) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		const { subscribers } = this.$ctx
		unsubscribe(pathStr, fn, subscribers)
	}

	$update(newState) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		inform()
		legacyAssign(this, newState)
		exec()
	}

	$destroy() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		const { nodeInfo, isFragment, children } = this.$ctx
		inform()
		this.$umount()
		if (isFragment) for (let i in children) mountingPointStore.delete(children[i].anchor)
		// Detatch all mounted components
		for (let i in this) {
			if (typeOf(this[i]) === 'array') this[i].clear()
			else this[i] = null
		}
		// Remove context
		delete this.$ctx
		// Push DOM removement operation to query
		queueDom(() => {
			DOM.remove(nodeInfo.element)
			DOM.remove(nodeInfo.placeholder)
		})
		// Render
		return exec()
	}
}

enumerableFalse(EFBaseComponent, ['$mount', '$umount', '$subscribe', '$unsubscribe', '$update', '$destroy'])
export default EFBaseComponent
