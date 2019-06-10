// Import everything
import state from './lib/renderer.js'
import {applyMountingPoint} from './lib/creator.js'
import mountOptions from './mount-options.js'
import { onNextRender, inform, exec, bundle, isPaused } from './lib/render-queue.js'
import dbg from './lib/utils/debug.js'
import typeOf from './lib/utils/type-of.js'
import { version } from '../package.json'

// Apply mounting point properties for classes
const applyMountingPoints = (node, proto) => {
	switch (typeOf(node)) {
		case 'array': {
			const [info, ...childNodes] = node
			if (typeOf(info) === 'object') for (let i of childNodes) applyMountingPoints(i, proto)
			break
		}
		case 'object': {
			if (node.t > 1) throw new TypeError(`[EF] Not a standard ef.js AST: Unknown mounting point type '${node.t}'`)
			applyMountingPoint(node.t, node.n, proto)
			break
		}
		default:
	}
}

// Return a brand new class for the new component
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
	applyMountingPoints(ast, ef.prototype)

	// Workaround for bug of buble
	// https://github.com/bublejs/buble/issues/197
	Object.defineProperty(ef.prototype, 'constructor', {enumerable: false})

	return ef
}

export { create, onNextRender, inform, exec, bundle, isPaused, mountOptions, version }

if (process.env.NODE_ENV !== 'production') dbg.info(`ef-core v${version} initialized!`)
