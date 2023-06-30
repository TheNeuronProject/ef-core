import {resolve} from './resolver.js'
import {inform, exec, queue} from './render-queue.js'
import ARR from './utils/array-helper.js'
import isnan from './utils/isnan.js'
import dbg from './utils/debug.js'

const initDataNode = (ctx, {parentNode, dataNode, handlerNode, subscriberNode, _key}) => {
	const { state } = ctx

	const applyQueue = () => queue(...handlerNode)
	let updateInProgress = false

	Object.defineProperty(parentNode, _key, {
		get() {
			return dataNode[_key]
		},
		set(value) {
			const oldValue = dataNode[_key]
			// Comparing NaN is like eating a cake and suddenly encounter a grain of sand
			if (updateInProgress || oldValue === value || (isnan(oldValue) && isnan(value))) return

			updateInProgress = true

			dataNode[_key] = value

			inform()

			queue(applyQueue)

			if (subscriberNode.length > 0) {
				try {
					for (const subscriber of subscriberNode) subscriber({state, value, oldValue})
				} catch (e) {
					dbg.error('Error caught when executing subscribers:\n', e)
				}
			}

			exec()

			updateInProgress = false
		},
		enumerable: true
	})

	// Handle class data
	if (typeof dataNode[_key] !== 'undefined') queue(applyQueue)
}

const initBinding = (ctx, {bind}) => {
	const _path = ARR.copy(bind[0])
	const _key = _path.pop()

	const {data, handlers, subscribers, innerData} = ctx

	const {parentNode, handlerNode, subscriberNode, dataNode} = resolve({
		_path,
		_key,
		data,
		handlers,
		subscribers,
		innerData
	})

	// Initlize data binding node if not initialized
	const keyStatus = Object.getOwnPropertyDescriptor(parentNode, _key)
	if (!keyStatus || !(keyStatus.get || keyStatus.set)) initDataNode(ctx, {parentNode, dataNode, handlerNode, subscriberNode, _key})
	// Update default value
	// bind[1] is the default value for this node
	// Only apply default value when class def doesn't exist
	if (bind.length > 1 && typeof dataNode[_key] === 'undefined') parentNode[_key] = bind[1]

	return {dataNode, parentNode, handlerNode, subscriberNode, _key}
}

export default initBinding
