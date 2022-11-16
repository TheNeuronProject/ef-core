// Import everything
import {EFBaseComponent, EFNodeWrapper, EFTextFragment, Fragment, toEFComponent} from './lib/renderer.js'
import {applyMountPoint} from './lib/creator.js'
import mountOptions from './mount-options.js'
import createElement from './lib/jsx-create-element.js'
import mapAttrs from './lib/map-attrs.js'
import {onNextRender, inform, exec, bundle, isPaused} from './lib/render-queue.js'
import dbg from './lib/utils/debug.js'
import typeOf from './lib/utils/type-of.js'
import scoped from './lib/utils/scoped-component.js'
import {setDOMImpl} from './lib/utils/dom-helper.js'
import {declareNamespace} from './lib/utils/namespaces.js'

const registerNS = (attrs, component) => {
	for (let i in attrs) {
		if (i.indexOf('xmlns:') === 0) {
			const [, prefix] = i.split(':')
			component.__local_namespaces[prefix] = attrs[i]
		}
	}
}

// Intialize components
const initComponent = (component, node) => {
	const nodeType = typeOf(node)
	switch (nodeType) {
		case 'array': {
			const [info, ...childNodes] = node
			if (typeOf(info) === 'object') {
				if (info.a) registerNS(info.a, component)
				for (let i of childNodes) initComponent(component, i)
			}
			break
		}
		case 'object': {
			if (node.t > 1) throw new TypeError(`[EF] Not a standard ef.js AST: Unknown mount point type '${node.t}'`)
			applyMountPoint(node.t, node.n, component)
			break
		}
		case 'string': {
			break
		}
		default: {
			throw new TypeError(`[EF] Not a standard ef.js AST: Unknown node type '${nodeType}'`)
		}
	}
}

/**
 * @typedef {import('./mount-options.js').EFMountOption} EFMountOption
 * @typedef {import('./mount-options.js').EFMountConfig} EFMountConfig
 * @typedef {import('./lib/renderer.js').EFAST} EFAST
 * @typedef {import('./lib/renderer.js').EFBaseClass} EFBaseClass
 * @typedef {import('./lib/renderer.js').EFEventHandlerArg} EFEventHandlerArg
 * @typedef {import('./lib/renderer.js').EFEventHandlerMethod} EFEventHandlerMethod
 * @typedef {import('./lib/renderer.js').EFSubscriberHandlerArg} EFSubscriberHandlerArg
 * @typedef {import('./lib/renderer.js').EFSubscriberHandlerMethod} EFSubscriberHandlerMethod
 * @typedef {import('./lib/renderer.js').EFTemplateScope} EFTemplateScope
 * @typedef {import('./lib/renderer.js').Fragment} Fragment
 * @typedef {import('./lib/renderer.js').EFNodeWrapper} EFNodeWrapper
 * @typedef {import('./lib/renderer.js').EFTextFragment} EFTextFragment
 * @typedef {import('./lib/utils/event-helper.js').EFEventOptions} EFEventOptions
 */

// eslint-disable-next-line valid-jsdoc
/**
 * Create a brand new component class for the new component
 * @param {EFAST} ast - AST for the component
 * @param {string=} name - Name of the component
 */
const create = (ast, name) => {

	/**
	 * The very basic component which users can use
	 * @class EFComponent
	 * @param {Object=} initState - Initial state for the component to create with
	 * @param {EFTemplateScope=} scope - Scope for the component to render template with
	 */
	const EFComponent = class extends EFBaseComponent {

		/**
		 * Create an EFComponent with initial state
		 * @param {Object=} initState - Initial state for the component to create with
		 * @param {EFTemplateScope=} scope - Scope for the component to render template with
		 */
		constructor(initState, scope) {
			inform()
			super(ast, scope)
			if (initState) this.$update(initState)
			exec()
		}
	}

	if (name) {
		Object.defineProperty(EFComponent, 'name', {value: name})
	}

	// Workaround for a bug of buble
	// https://github.com/bublejs/buble/issues/197
	Object.defineProperty(EFComponent.prototype, 'constructor', {enumerable: false})

	Object.defineProperty(EFComponent, '__local_namespaces', {enumerable: false, value: {}})
	initComponent(EFComponent, ast)
	return EFComponent
}

let coreVersion = '0.16.2'

if (process.env.NODE_ENV !== 'production') {
	coreVersion = `${coreVersion}+debug`

	dbg.info(`ef-core v${coreVersion} initialized!`)

	if (typeof globalThis !== 'undefined') {
		if (!globalThis.devtoolsFormatters) globalThis.devtoolsFormatters = []

		const shallowCloneObj = (obj, deletes) => {
			const cloned = Object.create(null)
			const descriptors = Object.getOwnPropertyDescriptors(obj)
			if (deletes) {
				for (let i of deletes) {
					delete descriptors[i]
				}
			}
			Object.defineProperties(cloned, descriptors)
			return cloned
		}

		const formatter = {
			header(obj, config) {
				if (config && config.__raw) return null
				if (obj instanceof EFBaseComponent) return ['div', {style: 'font-weight: bold; color: #5ccccc'}, `>${obj.constructor.name || '[Anonymous]'}`]
				return null
			},
			hasBody() {
				return true
			},
			body(obj) {
				const mountPoints = Object.create(null)
				for (let i in obj.$ctx.children) {
					mountPoints[i] = obj.$ctx.children[i].node
				}

				const elements = [
					['div', {style: 'color: #4bcb5b'}, '$data:           ', ['object', {object: Object.assign(Object.create(null), obj.$ctx.data)}]],
					['div', {style: 'color: #4bcb5b'}, '$refs:           ', ['object', {object: shallowCloneObj(obj.$ctx.refs)}]],
					['div', {style: 'color: #4bcb5b'}, '$methods:        ', ['object', {object: shallowCloneObj(obj.$ctx.methods)}]],
					['div', {style: 'color: #4bcb5b'}, '[[mountpoints]]: ', ['object', {object: mountPoints}]],
					['div', {style: 'color: #cc22bb'}, '[[props]]:       ', ['object', {object: shallowCloneObj(obj, ['$ctx'])}]],
					['div', {style: 'color: #4bcb5b88'}, '[[element]]:     ', ['object', {object: obj.$ctx.nodeInfo.element}]],
					['div', {style: 'color: #4bcb5b88'}, '[[parent]]:      ', ['object', {object: obj.$ctx.nodeInfo.parent}]],
					['div', {style: 'color: #4bcb5b88'}, '[[slot]]:        ', ['object', {object: obj.$ctx.nodeInfo.key}]]
				]
				return ['div', {}, ...elements]
			}
		}

		globalThis.devtoolsFormatters.push(formatter)
	}
}

export {
	create,
	mapAttrs,
	createElement,
	EFNodeWrapper,
	EFTextFragment,
	Fragment,
	toEFComponent,
	scoped,
	onNextRender,
	inform,
	exec,
	bundle,
	isPaused,
	mountOptions,
	setDOMImpl,
	declareNamespace,
	coreVersion as version
}
