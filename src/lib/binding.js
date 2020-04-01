import {resolve} from './resolver.js'
import {inform, exec, queue} from './render-queue.js'
import ARR from './utils/array-helper.js'
import isnan from './utils/isnan.js'
import dbg from './utils/debug.js'

const initDataNode = ({parentNode, dataNode, handlerNode, subscriberNode, ctx, _key}) => {
	let subscriberExecuting = false
	Object.defineProperty(parentNode, _key, {
		get() {
			return dataNode[_key]
		},
		set(value) {
			if (subscriberExecuting) return
			// Comparing NaN is like eating a cake and suddenly encounter a grain of sand
			if (dataNode[_key] === value || (isnan(dataNode[_key]) && isnan(value))) return
			dataNode[_key] = value
			inform()
			queue(handlerNode)
			exec()
			if (subscriberNode.length > 0) {
				subscriberExecuting = true
				inform()
				try {
					for (const subscriber of subscriberNode) subscriber({state: ctx.state, value})
				} catch (e) {
					dbg.error('Error caught when executing subscribers:\n', e)
				}
				exec()
				subscriberExecuting = false
			}
		},
		enumerable: true
	})
}

const initBinding = ({bind, ctx, handlers, subscribers, innerData}) => {
	const _path = ARR.copy(bind[0])
	const _key = _path.pop()
	const {parentNode, handlerNode, subscriberNode, dataNode} = resolve({
		_path,
		_key,
		data: ctx.data,
		handlers,
		subscribers,
		innerData
	})

	// Initlize data binding node if not exist
	if (!Object.prototype.hasOwnProperty.call(parentNode, _key)) initDataNode({parentNode, dataNode, handlerNode, subscriberNode, ctx, _key})
	// Update default value
	// bind[1] is the default value for this node
	if (bind.length > 1) parentNode[_key] = bind[1]

	return {dataNode, parentNode, handlerNode, subscriberNode, _key}
}

export default initBinding
