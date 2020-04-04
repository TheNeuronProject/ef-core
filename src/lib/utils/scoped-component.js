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
const scoped = (component, initScope) => class extends component {
	constructor(state, scope = initScope) {
		super(state, scope)
	}
}

export default scoped
