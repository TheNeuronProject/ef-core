import { inform, exec } from './render-queue.js'
import ARR from './utils/array-helper.js'

const subscriberCallStack = []

const checkStack = subscriberNode => subscriberCallStack.indexOf(subscriberNode) >= 0

const pushStack = subscriberNode => subscriberCallStack.push(subscriberNode)

const popStack = subscriberNode => ARR.remove(subscriberCallStack, subscriberNode)

const execSubscribers = (subscriberNode, data) => {
	// Stop chain reaction when being called again in the context
	// There is no way for the caller to know it shouldn't update the node again
	// So this is the only method to avoid recursion
	// Push the current subscriberNode to stack as an identifier
	pushStack(subscriberNode)
	// Execute the subscriber function
	inform()
	for (const subscriber of subscriberNode) subscriber(data)
	exec()
	// Remove the subscriberNode from the stack so it could be called again
	popStack(subscriberNode)
}

export { subscriberCallStack, checkStack, pushStack, popStack, execSubscribers }
