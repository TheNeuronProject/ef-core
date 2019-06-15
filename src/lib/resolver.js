import {inform, exec} from './render-queue.js'
import {assign} from './utils/polyfills.js'

const resolveAllPath = ({_path, handlers, subscribers, innerData}) => {
	for (let i of _path) {
		if (!handlers[i]) handlers[i] = {}
		if (!subscribers[i]) subscribers[i] = {}
		if (!innerData[i]) innerData[i] = {}
		handlers = handlers[i]
		subscribers = subscribers[i]
		innerData = innerData[i]
	}
	return {
		handlerNode: handlers,
		subscriberNode: subscribers,
		dataNode: innerData
	}
}

// Workaround for the third bug of buble:
// https://github.com/bublejs/buble/issues/106
const defineNode = (key, obj) => {
	const node = {}
	Object.defineProperty(obj, key, {
		get() {
			return node
		},
		set(data) {
			inform()
			assign(node, data)
			exec()
		},
		configurable: false,
		enumerable: true
	})
	return node
}

const resolveReactivePath = (_path, obj) => {
	for (let i of _path) {
		if (obj[i]) obj = obj[i]
		else obj = defineNode(i, obj)
	}
	return obj
}

const resolve = ({_path, _key, data, handlers, subscribers, innerData}) => {
	const parentNode = resolveReactivePath(_path, data)
	const {handlerNode, subscriberNode, dataNode} = resolveAllPath({_path, handlers, subscribers, innerData})
	if (!handlerNode[_key]) handlerNode[_key] = []
	if (!subscriberNode[_key]) subscriberNode[_key] = []
	/* eslint no-undefined: "off" */
	if (!Object.prototype.hasOwnProperty.call(dataNode, _key)) dataNode[_key] = undefined
	return { parentNode, handlerNode: handlerNode[_key], subscriberNode: subscriberNode[_key], dataNode }
}

const resolveSubscriber = (_path, subscribers) => {
	const pathArr = _path.split('.')
	const key = pathArr.pop()
	for (let i of pathArr) {
		if (!subscribers[i]) subscribers[i] = {}
		subscribers = subscribers[i]
	}
	return subscribers[key]
}

export {resolveReactivePath, resolve, resolveSubscriber}
