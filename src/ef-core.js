// Import everything
import State from './lib/renderer.js'
import {applyMountingPoint} from './lib/creator.js'
import mountOptions from './mount-options.js'
import {createElement, Fragment} from './lib/jsx-create-element.js'
import registerProps from './lib/register-props.js'
import { onNextRender, inform, exec, bundle, isPaused } from './lib/render-queue.js'
import dbg from './lib/utils/debug.js'
import typeOf from './lib/utils/type-of.js'
import { version } from '../package.json'

// Apply mounting point properties for classes
const applyMountingPoints = (node, proto) => {
	const nodeType = typeOf(node)
	switch (nodeType) {
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
		case 'string': {
			break
		}
		default: {
			throw new TypeError(`Not a standard ef.js AST: Unknown node type '${nodeType}'`)
		}
	}
}

// Return a brand new class for the new component
const create = (value) => {
	const ast = value
	const ef = class extends State {
		constructor(newState) {
			inform()
			super(ast)
			if (newState) this.$update(newState)
			exec()
		}
	}
	applyMountingPoints(ast, ef.prototype)

	// Workaround for a bug of buble
	// https://github.com/bublejs/buble/issues/197
	Object.defineProperty(ef.prototype, 'constructor', {enumerable: false})

	return ef
}

// Make a helper component for text fragments
const TextFragment = registerProps(create([{t: 0},[['text']]]), {text: {}})
const createTextFragment = text => new TextFragment({text})


export {create, createTextFragment, createElement, Fragment, onNextRender, inform, exec, bundle, isPaused, mountOptions, version}

if (process.env.NODE_ENV !== 'production') dbg.info(`ef-core v${version} initialized!`)
