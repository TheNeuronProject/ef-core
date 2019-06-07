import { create, nullComponent } from './creator.js'
import initBinding from './binding.js'
import { queueDom, inform, exec } from './render-queue.js'
import { resolveSubscriber } from './resolver.js'
import DOM from './utils/dom-helper.js'
import ARR from './utils/array-helper.js'
import { assign } from './utils/polyfills.js'
import dbg from './utils/debug.js'
import mountOptions from '../mount-options.js'

const unsubscribe = (pathStr, fn, subscribers) => {
	const subscriberNode = resolveSubscriber(pathStr, subscribers)
	ARR.remove(subscriberNode, fn)
}

// const checkDestroied = (state) => {
// 	if (!state.$ctx) throw new Error('[EF] This component has been destroied!')
// }

const state = class {
	constructor (ast) {
		const children = {}
		const refs = {}
		const data = {}
		const innerData = {}
		const methods = {}
		const handlers = {}
		const subscribers = {}
		const nodeInfo = {
			placeholder: document.createTextNode(''),
			replace: [],
			parent: null,
			key: null
		}

		/* Detatched components will be put in the safe zone.
		 * Split safe zone to each component in order to make
		 * the component memory recycleable when lost reference
		 */
		const safeZone = document.createDocumentFragment()

		if (process.env.NODE_ENV !== 'production') nodeInfo.placeholder = document.createComment('EF COMPONENT PLACEHOLDER')

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
			children, state: this
		}

		Object.defineProperty(this, '$ctx', {
			value: ctx,
			enumerable: false,
			configurable: true
		})

		inform()

		nodeInfo.element = create({node: ast, ctx, innerData, refs, handlers, subscribers, svg: false, create})
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		exec()
	}

	get $data() {
		return this.$ctx.data
	}

	set $data(newData) {
		inform()
		assign(this.$ctx.data, newData)
		exec()
	}

	get $methods() {
		return this.$ctx.methods
	}

	set $methods(newMethods) {
		this.$ctx.methods = newMethods
	}

	get $refs() {
		return this.$ctx.refs
	}

	$mount({target, option, parent, key}) {
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
				DOM.append(target, nodeInfo.placeholder)
			}
		}
		return exec()
	}

	$umount() {
		const { nodeInfo, safeZone, mount } = this.$ctx
		const { parent, key } = nodeInfo
		nodeInfo.parent = null
		nodeInfo.key = null

		inform()
		if (parent && key !== '__DIRECTMOUNT__' && parent[key]) {
			if (Array.isArray(parent[key])) ARR.remove(parent[key], this)
			else parent[key] = nullComponent
		}
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		return exec()
	}

	$subscribe(pathStr, subscriber) {
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
		const { subscribers } = this.$ctx
		unsubscribe(pathStr, fn, subscribers)
	}

	$update(newState) {
		inform()
		assign(this, newState)
		exec()
	}

	$destroy() {
		const { nodeInfo } = this.$ctx
		delete this.$ctx
		inform()
		this.$umount()
		for (let i in this) {
			this[i] = null
			delete this[i]
		}
		// Push DOM removement operation to query
		queueDom(() => {
			DOM.remove(nodeInfo.element)
			DOM.remove(nodeInfo.placeholder)
		})
		// Render
		return exec()
	}
}

// Workaround for bug of buble
// https://github.com/bublejs/buble/issues/197
for (let i of ['$mount', '$umount', '$subscribe', '$unsubscribe', '$update', '$destroy']) {
	Object.defineProperty(state.prototype, i, {enumerable: false})
}

export default state
