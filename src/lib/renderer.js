import create from './creator.js'
import initBinding from './binding.js'
import { queueDom, inform, exec } from './render-queue.js'
import { resolveReactivePath, resolveSubscriber } from './resolver.js'
import DOM from './utils/dom-helper.js'
import ARR from './utils/array-helper.js'
import { assign } from './utils/polyfills.js'

const unsubscribe = (_path, fn, subscribers) => {
	const subscriberNode = resolveSubscriber(_path, subscribers)
	ARR.remove(subscriberNode, fn)
}

const state = class {
	constructor (ast) {
		const children = {}
		const refs = {}
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
			mount, refs, innerData, methods, handlers,
			subscribers, nodeInfo, safeZone
		}

		Object.defineProperty(this, '$ctx', {
			get() {
				return ctx
			}
		})

		inform()
		// Init root data node
		resolveReactivePath(['$data'], this, false)

		nodeInfo.element = create({node: ast, state: this, innerData, refs, children, handlers, subscribers, svg: false, create})
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		exec()
	}

	get $methods() {
		const { methods } = this.$ctx
		return methods
	}

	set $methods(newMethods) {
		const { methods } = this.$ctx
		assign(methods, newMethods)
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
			if (process.env.NODE_ENV !== 'production') console.warn('[EF]', 'Component detached from previous mounting point.')
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
			case 'before': {
				DOM.before(target, nodeInfo.placeholder)
				break
			}
			case 'after': {
				DOM.after(target, nodeInfo.placeholder)
				break
			}
			case 'replace': {
				DOM.before(target, nodeInfo.placeholder)
				nodeInfo.replace.push(target)
				break
			}
			case 'append':
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
			else {
				parent[key] = null
				return exec()
			}
		}
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		return exec()
	}

	$subscribe(pathStr, subscriber) {
		const { handlers, subscribers, innerData } = this.$ctx
		const _path = pathStr.split('.')
		const { dataNode, subscriberNode, _key } = initBinding({bind: [_path], state: this, handlers, subscribers, innerData})
		inform()
		// Execute the subscriber function immediately
		try {
			subscriber({state: this, value: dataNode[_key]})
			// Put the subscriber inside the subscriberNode
			subscriberNode.push(subscriber)
		} catch (e) {
			console.error('[EF]', 'Error caught when registering subscriber:\n', e)
		}
		exec()
	}

	$unsubscribe(_path, fn) {
		const { subscribers } = this.$ctx
		unsubscribe(_path, fn, subscribers)
	}

	$update(newState) {
		inform()
		const tmpState = assign({}, newState)
		if (tmpState.$data) {
			assign(this.$data, tmpState.$data)
			delete(tmpState.$data)
		}
		if (tmpState.$methods) {
			assign(this.$methods, tmpState.$methods)
			delete(tmpState.$methods)
		}
		assign(this, tmpState)
		exec()
	}

	$destroy() {
		const { nodeInfo } = this.$ctx
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

export default state
