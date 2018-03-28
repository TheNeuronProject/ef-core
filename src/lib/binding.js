import { resolve } from './resolver.js'
import { queue } from './render-queue.js'
import { execSubscribers } from './subscriber-call-stack.js'
import ARR from './utils/array-helper.js'
import isnan from './utils/isnan.js'

const initDataNode = ({parentNode, dataNode, handlerNode, subscriberNode, state, _key}) => {
	Object.defineProperty(parentNode, _key, {
		get() {
			return dataNode[_key]
		},
		set(value) {
			// Comparing NaN is like eating a cake and suddenly encounter a grain of sand
			if (dataNode[_key] === value || (isnan(dataNode[_key]) && isnan(value))) return
			dataNode[_key] = value
			queue(handlerNode)
			if (subscriberNode.length > 0) execSubscribers(subscriberNode, {state, value})
		},
		enumerable: true
	})
}

const initBinding = ({bind, state, handlers, subscribers, innerData}) => {
	const _path = ARR.copy(bind[0])
	const _key = _path.pop()
	const { parentNode, handlerNode, subscriberNode, dataNode } = resolve({
		_path,
		_key,
		data: state.$data,
		handlers,
		subscribers,
		innerData
	})

	// Initlize data binding node if not exist
	if (!Object.prototype.hasOwnProperty.call(parentNode, _key)) initDataNode({parentNode, dataNode, handlerNode, subscriberNode, state, _key})
	// Update default value
	// bind[1] is the default value for this node
	if (bind.length > 1) parentNode[_key] = bind[1]

	return {dataNode, parentNode, handlerNode, subscriberNode, _key}
}

export default initBinding
