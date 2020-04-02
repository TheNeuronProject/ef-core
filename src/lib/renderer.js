import {create, nullComponent, checkDestroyed} from './creator.js'
import initBinding from './binding.js'
import {queueDom, inform, exec} from './render-queue.js'
import {resolveSubscriber} from './resolver.js'
import mapAttrs from './map-attrs.js'
import {DOM, EFFragment, mountingPointStore} from './utils/dom-helper.js'
import ARR from './utils/array-helper.js'
import {assign, legacyAssign} from './utils/polyfills.js'
import isInstance from './utils/fast-instance-of.js'
import typeOf from './utils/type-of.js'
import {enumerableFalse} from './utils/buble-fix.js'
import dbg from './utils/debug.js'
import getEvent from './utils/event-helper.js'
import mountOptions from '../mount-options.js'

import shared from './utils/global-shared.js'

const unsubscribe = (pathStr, fn, subscribers) => {
	const subscriberNode = resolveSubscriber(pathStr, subscribers)
	ARR.remove(subscriberNode, fn)
}

/**
 * The very basic ef component
 * @class EFBaseComponent
 */
const EFBaseComponent = class {

	/**
	 * Create an EFBaseComponent
	 * @param {Array} ast - ast for the component
	 * @param {Object.<string,EFBaseComponent>} scope - scope which contains custom components
	 */
	constructor(ast, scope = {}) {
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
			scope, mount, refs, data, innerData, methods,
			handlers, subscribers, nodeInfo, safeZone,
			children, state: this, isFragment: ast[0].t === 0
		}

		Object.defineProperty(this, '$ctx', {
			value: ctx,
			enumerable: false,
			configurable: true
		})

		inform()

		nodeInfo.element = create({node: ast, ctx, innerData, refs, handlers, subscribers, svg: false})
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		exec()
	}

	/**
	 * Get data on the component
	 * @returns {Object} Data on component
	 */
	get $data() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.data
	}

	/**
	 * Set data on the compnent
	 * @param {Object} newData - Data to be set to component
	 */
	set $data(newData) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		inform()
		assign(this.$ctx.data, newData)
		exec()
	}

	/**
	 * Get methods on the component
	 * @returns {Object.<string,Function>} Methods on component
	 */
	get $methods() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.methods
	}

	/**
	 * Set methods on the component
	 * @param {Object.<string,Function>} newMethods - Methods to be set to component
	 */
	set $methods(newMethods) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		this.$ctx.methods = newMethods
	}

	/**
	 * Get all references on the component
	 * @returns {Object.<string,(Node|EFBaseComponent)>} References on component
	 */
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

	$dispatch(event) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		this.$ctx.nodeInfo.placeholder.dispatchEvent(event)
	}

	$emit(event, options) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		this.$dispatch(getEvent(event, options))
	}

	$on(...args) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		this.$ctx.nodeInfo.placeholder.addEventListener(...args)
	}

	$off(...args) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
			this.$ctx.nodeInfo.placeholder.removeEventListener(...args)
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

const fragmentAST = [{t: 0}]
const EFNodeWrapper = class extends EFBaseComponent {
	constructor(...nodes) {
		super(fragmentAST)
		// Use parens to bypass ESLint's semicolon check
		// Semi is needed for preventing Buble's bug
		;(this).$ctx.nodeInfo.element.push(...nodes)
		this.$ctx.elements = nodes
	}

	get $el() {
		return this.$ctx.elements
	}
}

const Fragment = class extends EFBaseComponent {
	constructor(...children) {
		super([{t: 0}, ...children])
	}
}

// Make a helper component for text fragments
const textFragmentAst = [{t: 0},[['text']]]
const EFTextFragment = class extends EFBaseComponent {
	constructor(text) {
		inform()
		super(textFragmentAst)
		this.text = text
		exec()
	}
}
mapAttrs(EFTextFragment, {text: {}})

enumerableFalse(EFBaseComponent, ['$mount', '$umount', '$subscribe', '$unsubscribe', '$update', '$dispatch', '$emit', '$on', '$off', '$destroy'])
enumerableFalse(EFNodeWrapper, ['$el'])


/**
 * Transform almost anyting into ef component
 * @param {*} value - Things to be transformed into ef component
 * @returns {EFBaseComponent} Wrapped component
 */
const toEFComponent = (value) => {
	if (value instanceof EFBaseComponent) return value
	if (value !== nullComponent) {
		if (value instanceof Node) return new EFNodeWrapper(value)
		else if (typeof value === 'string') return new EFTextFragment(value)
		else return new EFTextFragment(JSON.stringify(value))
	}

	return value
}

shared.EFBaseComponent = EFBaseComponent
shared.toEFComponent = toEFComponent

export {EFBaseComponent, EFNodeWrapper, EFTextFragment, Fragment, toEFComponent}
