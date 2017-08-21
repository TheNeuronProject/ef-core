// Import everything
import state from './lib/renderer.js'
import { onNextRender, inform, exec, bundle } from './lib/utils/render-query.js'
import { version } from '../package.json'

const create = (value) => {
	const ast = value
	const ef = class extends state {
		constructor(newState) {
			inform()
			super(ast)
			if (newState) this.$update(newState)
			exec()
		}
	}
	return ef
}

export { create, onNextRender, inform, exec, bundle, version }

if (ENV !== 'production') console.info('[EF]', `ef-core v${version} initialized!`)
