import ARR from './utils/array-helper.js'

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
	const renderQueue = ARR.unique(modificationQueue)
	for (let i of renderQueue) i()
	if (process.env.NODE_ENV !== 'production') console.info('[EF]', `${modificationQueue.length} modification operation(s) cached, ${renderQueue.length} executed.`)
	ARR.empty(modificationQueue)
}

const execDomModifications = () => {
	const domRenderQueue = ARR.rightUnique(domQueue)
	for (let i of domRenderQueue) i()
	if (process.env.NODE_ENV !== 'production') console.info('[EF]', `${domQueue.length} DOM operation(s) cached, ${domRenderQueue.length} executed.`)
	ARR.empty(domQueue)
}

const execUserQueue = () => {
	if (userQueue.length === 0) return
	const userFnQueue = ARR.unique(userQueue)
	for (let i of userFnQueue) i()
	if (process.env.NODE_ENV !== 'production') console.info('[EF]', `${userQueue.length} user operation(s) cached, ${userFnQueue.length} executed.`)
	ARR.empty(userQueue)
}

const exec = (immediate) => {
	if (!immediate && (count -= 1) > 0) return count
	count = 0

	if (queue.length > 0) execModifications()

	if (domQueue.length > 0) execDomModifications()

	// Execute user queue after DOM update
	if (userQueue.length > 0) setTimeout(execUserQueue, 0)

	return count
}

const bundle = (cb) => {
	inform()
	return exec(cb(inform, exec))
}

export { queue, queueDom, onNextRender, inform, exec, bundle, isPaused }
