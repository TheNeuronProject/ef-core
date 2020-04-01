const scoped = (component, initScope) => class extends component {
	constructor(state, scope = initScope) {
		super(state, scope)
	}
}

export default scoped
