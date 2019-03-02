// Import everything
import state from './lib/renderer.js'
import mountOptions from './mount-options.js'
import { onNextRender, inform, exec, bundle, isPaused } from './lib/render-queue.js'
import dbg from './lib/utils/debug.js'
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

export { create, onNextRender, inform, exec, bundle, isPaused, mountOptions, version }

if (process.env.NODE_ENV !== 'production') dbg.info(`ef-core v${version} initialized!`)
