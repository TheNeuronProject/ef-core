/**
 * @typedef {import('../renderer.js').EFBaseComponent} EFBaseComponent
 * @typedef {import('../renderer.js').EFTemplateScope} EFTemplateScope
 */

/**
 * Attach a default scope to the component
 * @param {EFBaseComponent} component - Component to be scoped
 * @param {EFTemplateScope} initScope - Scope to be bond on the component
 * @returns {EFBaseComponent} - Scoped component
 */
const scoped = (component, initScope) => class extends component {
	constructor(state, scope = initScope) {
		super(state, scope)
	}
}

export default scoped
