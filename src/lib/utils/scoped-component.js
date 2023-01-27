import {assign} from './polyfills.js'

/**
 * @typedef {import('../renderer.js').EFBaseClass} EFBaseClass
 * @typedef {import('../renderer.js').EFTemplateScope} EFTemplateScope
 */

/**
 * Attach a default scope to the component class
 * @template {component} T
 * @param {EFBaseClass} component - Component class to be scoped
 * @param {EFTemplateScope} initScope - Scope to be bond on the component class
 * @returns {T} - Scoped component class
 */
const scoped = (component, initScope) => {
	const _scope = assign({}, initScope)
	return class Scoped extends component {
		constructor(state, scope) {
			if (scope) super(state, assign({}, _scope, scope))
			else super(state, _scope)
		}
	}
}

export default scoped
