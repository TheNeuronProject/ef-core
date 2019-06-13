import ARR from './utils/array-helper.js'
import dbg from './utils/debug.js'

const modificationQueue = []
const domQueue = []
const userQueue = []
let count = 0

const queue = handlers => modificationQueue.push(...handlers)
const queueDom = handler => domQueue.push(handler)
const onNextRender = handler => userQueue.push(handler)

const isPaused = () => count > 0

const inform = () => {
	count += 1
	return count
}

const execModifications = () => {
	if (modificationQueue.length === 0) return
	const renderQueue = ARR.unique(modificationQueue)
	ARR.empty(modificationQueue)
	for (let i of renderQueue) i()
}

const execDomModifications = () => {
	if (domQueue.length === 0) return
	const domRenderQueue = ARR.rightUnique(domQueue)
	ARR.empty(domQueue)
	for (let i of domRenderQueue) i()
}

const execUserQueue = () => {
	if (userQueue.length === 0) return
	const userFnQueue = ARR.unique(userQueue)
	ARR.empty(userQueue)
	for (let i of userFnQueue) i()
}

const exec = (immediate) => {
	if (!immediate && (count -= 1) > 0) return count
	count = 0

	if (modificationQueue.length > 0) execModifications()

	if (domQueue.length > 0) execDomModifications()

	// Execute user queue after DOM update
	if (userQueue.length > 0) setTimeout(execUserQueue, 0)

	return count
}

const bundle = (cb) => {
	inform()
	try {
		return exec(cb(inform, exec))
	} catch (e) {
		dbg.error('Error caught when executing bundle:\n', e)
		return exec()
	}
}

export { queue, queueDom, onNextRender, inform, exec, bundle, isPaused }
