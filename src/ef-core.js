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
 */
const create = (ast) => {

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

	// Workaround for a bug of buble
	// https://github.com/bublejs/buble/issues/197
	Object.defineProperty(EFComponent.prototype, 'constructor', {enumerable: false})

	Object.defineProperty(EFComponent, '__local_namespaces', {enumerable: false, value: {}})
	initComponent(EFComponent, ast)
	return EFComponent
}

let coreVersion = '0.15.6'

if (process.env.NODE_ENV !== 'production') {
	coreVersion = `${coreVersion}+debug`
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

if (process.env.NODE_ENV !== 'production') dbg.info(`ef-core v${coreVersion} initialized!`)
