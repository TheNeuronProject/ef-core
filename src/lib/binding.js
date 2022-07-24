import {resolve} from './resolver.js'
import {inform, exec, queue} from './render-queue.js'
import ARR from './utils/array-helper.js'
import isnan from './utils/isnan.js'
import dbg from './utils/debug.js'

const initDataNode = ({parentNode, dataNode, handlerNode, subscriberNode, ctx, _key}) => {
	let updatingInProgress = false
	Object.defineProperty(parentNode, _key, {
		get() {
			return dataNode[_key]
		},
		set(value) {
			if (updatingInProgress) return
			updatingInProgress = true
			// Comparing NaN is like eating a cake and suddenly encounter a grain of sand
			if (dataNode[_key] === value || (isnan(dataNode[_key]) && isnan(value))) {
				updatingInProgress = false
				return
			}
			dataNode[_key] = value
			inform()
			queue(handlerNode)
			exec()
			if (subscriberNode.length > 0) {
				inform()
				try {
					for (const subscriber of subscriberNode) subscriber({state: ctx.state, value})
				} catch (e) {
					dbg.error('Error caught when executing subscribers:\n', e)
				}
				exec()
			}
			updatingInProgress = false
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

	// Initlize data binding node if not initialized
	const keyStatus = Object.getOwnPropertyDescriptor(parentNode, _key)
	if (!keyStatus || !(keyStatus.get || keyStatus.set)) initDataNode({parentNode, dataNode, handlerNode, subscriberNode, ctx, _key})
	// Update default value
	// bind[1] is the default value for this node
	if (bind.length > 1) parentNode[_key] = bind[1]

	return {dataNode, parentNode, handlerNode, subscriberNode, _key}
}

export default initBinding
