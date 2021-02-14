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
 * @typedef {Array} EFAST
 * @typedef {Object.<string,EFBaseComponent>} EFTemplateScope
 */

/**
 * @typedef {Object} EFSubscriberHandlerArg
 * @property {EFBaseComponent} ctx - The component who calls the handler
 * @property {*} value - Value been subscribed
 */

/**
 * @event Event
 */

/**
 * @typedef {Object} EFEventHandlerArg
 * @property {EFBaseComponent} ctx - The component who calls the handler
 * @property {*} value - Value been passed to the event handler
 * @property {Event} event - Event object that has been triggered
 */

/**
 * @typedef {Function} EFSubscriberHandlerMethod
 * @param {EFSubscriberHandlerArg} arg
 * @returns {void}
 */

/**
 * @typedef {Function} EFEventHandlerMethod
 * @param {EFEventHandlerArg} arg
 * @returns {void}
 */

/**
 * The very basic ef component
 * @class EFBaseComponent
 * @param {EFAST} ast - ast for the component
 * @param {EFTemplateScope} scope - scope which contains custom components
 * @private {Object} $ctx - Inner component data, DO NOT TOUCH
 * @property {Object} $data - Data on component
 * @property {Object.<string,EFEventHandlerMethod>} $methods - Methods on component
 * @property {Object.<string,(EFBaseComponent|Node)>} $refs - References on component
 */
const EFBaseComponent = class {

	/**
	 * Create an EFBaseComponent with ef AST
	 * @param {EFAST} ast - ast for the component
	 * @param {EFTemplateScope=} scope - scope which contains custom components
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
		const safeZone = DOM.document.createDocumentFragment()

		if (process.env.NODE_ENV === 'production') nodeInfo.placeholder = DOM.document.createTextNode('')
		else nodeInfo.placeholder = DOM.document.createComment('EF COMPONENT PLACEHOLDER')

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
			children, state: this, isFragment: ast[0].t === 0,
			localNamespaces: this.constructor.__local_namespaces
		}

		Object.defineProperty(this, '$ctx', {
			value: ctx,
			enumerable: false,
			configurable: true
		})

		inform()

		nodeInfo.element = create({node: ast, ctx, innerData, refs, handlers, subscribers, namespace: ''})
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

	/**
	 * @typedef {import('../mount-options.js').EFMountConfig} EFMountConfig
	 */

	/**
	 * Mount component to a specitic position
	 * @param {EFMountConfig} config - Mount contigurations
	 * @returns {number} - Render count down
	 */
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

	/**
	 * @returns {number} - Render count down
	 */
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
					if (ARR.isArray(parent[key])) {
						// Remove self from parent list mounting point
						ARR.remove(parent[key], this)
					} else parent[key] = nullComponent
				}
			// Else Remove elements from fragment parent
			} else if (isInstance(parent, EFFragment)) parent.$ctx.nodeInfo.element.removeChild(nodeInfo.element)
		}
		DOM.append(safeZone, nodeInfo.placeholder)
		queueDom(mount)
		return exec()
	}

	/**
	 * Subscribe a value's changing
	 * @param {string} pathStr - Path string to the subribed value based on `$data`, splitted by `.`
	 * @param {EFSubscriberHandlerMethod} subscriber - Subscription event handler to be added
	 * @returns {void}
	 */
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

	/**
	 * Unsubscribe a value's changing
	 * @param {string} pathStr - Path string to the subribed value based on `$data`, splitted by `.`
	 * @param {EFSubscriberHandlerMethod} subscriber - Subscription event handler to be removed
	 * @returns {void}
	 */
	$unsubscribe(pathStr, subscriber) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		const { subscribers } = this.$ctx
		unsubscribe(pathStr, subscriber, subscribers)
	}

	/**
	 * Update the component's state with a new state
	 * @param {Object} newState - New state to be set on this component
	 * @returns {void}
	 */
	$update(newState) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		inform()
		legacyAssign(this, newState)
		exec()
	}

	/**
	 * Fire a custom event using an Event object on this component
	 * @param {Event} event - Event object to be dispatched on this component
	 * @returns {*} - Same as the return of Node.dispatchEvent
	 */
	$dispatch(event) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.nodeInfo.placeholder.dispatchEvent(event)
	}

	/**
	 * @typedef {import('./utils/event-helper.js').EFEventOptions} EFEventOptions
	 */

	/**
	 * Fire a custom event using event name on this component
	 * @param {string} eventName - Name of the custom event
	 * @param {EFEventOptions} options - Event Options
	 * @returns {*} - Same as the return of Node.dispatchEvent
	 */
	$emit(eventName, options) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$dispatch(getEvent(eventName, options))
	}

	/**
	 * Add custom event listener on this component
	 * @param {...*} args - Same as Node.addEventListener
	 * @returns {*} - Same as the return of Node.addEventListener
	 */
	$on(...args) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.nodeInfo.placeholder.addEventListener(...args)
	}

	/**
	 * Remove custom event listener on this component
	 * @param {...*} args - Same as Node.removeEventListener
	 * @returns {*} - Same as the return of Node.removeEventListener
	 */
	$off(...args) {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		return this.$ctx.nodeInfo.placeholder.removeEventListener(...args)
	}

	/**
	 * Destroy this component
	 * @returns {number} - Render count down
	 */
	$destroy() {
		if (process.env.NODE_ENV !== 'production') checkDestroyed(this)
		const { nodeInfo, children } = this.$ctx
		inform()
		this.$umount()
		for (let i in children) mountingPointStore.delete(children[i].anchor)
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

/**
 * @typedef {typeof EFBaseComponent} EFBaseClass
 */

const fragmentAST = [{t: 0}]

/**
 * ef component node wrapper
 * Better using this than Fragments if wrapping only HTML elements.
 * @class EFNodeWrapper
 * @extends EFBaseComponent
 * @param {...Node} nodes - Nodes to be wrapped
 * @property {Array<Node>} - Nodes that are wrapped
 */
const EFNodeWrapper = class extends EFBaseComponent {

	/**
	 * Wrap given nodes into an ef component
	 * @param  {...Node} nodes - Nodes to be wrapped
	 */
	constructor(...nodes) {
		super(fragmentAST)

		const element = this.$ctx.nodeInfo.element
		const childrenArr = element.$children
		element.append(...nodes)

		if (process.env.NODE_ENV !== 'production') element.append(ARR.remove(childrenArr, childrenArr[1]))

		this.$ctx.elements = nodes
	}

	get $el() {
		return this.$ctx.elements
	}
}

/**
 * Component fragment wrapper
 * @class Fragment
 * @extends EFBaseComponent
 * @param {...*} children - Things to be wrapped into an ef component
 */
const Fragment = class extends EFBaseComponent {
	constructor(...children) {
		super([{t: 0}, ...children])
	}
}

const textFragmentAst = [{t: 0},[['text']]]

/**
 * ef component text wrapper
 * @class EFTextFragment
 * @extends EFBaseComponent
 * @param {string} text - String to be wrapped
 * @property {string} text - Text on the fragment component
 */
const EFTextFragment = class extends EFBaseComponent {

	/**
	 * Wrap given text into an ef component
	 * @param {string} text - String to be wrapped
	 */
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
 * @template {value} T
 * @param {T} value - Things to be transformed into ef component
 * @returns {(EFNodeWrapper|EFTextFragment|T)} - Wrapped component or value it self if not supports converting
 */
const toEFComponent = (value) => {
	if (value === null || typeof value === 'undefined' || value instanceof EFBaseComponent) return value

	if (value !== nullComponent) {
		if (value instanceof Node) return new EFNodeWrapper(value)
		else if (typeof value === 'string') return new EFTextFragment(value)
		else return new EFTextFragment(JSON.stringify(value))
	}
}

shared.EFBaseComponent = EFBaseComponent
shared.toEFComponent = toEFComponent

export {EFBaseComponent, EFNodeWrapper, EFTextFragment, Fragment, toEFComponent}
