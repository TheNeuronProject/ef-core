import ARR from './utils/array-helper.js'

const modificationQueue = []
const domQueue = []
const userQueue = []
let count = 0

const queue = handlers => modificationQueue.push(...handlers)
const queueDom = handler => domQueue.push(handler)
const onNextRender = handler => userQueue.push(handler)

/**
 * @returns {boolean} - Is render paused
 */
const isPaused = () => count > 0

/**
 * Add 1 to render count down.
 * When countdown becomes 0, render will be triggered.
 * @returns {number} - Render count down
 */
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

/**
 * Minus 1 to render count down.
 * When countdown becomes 0, render will be triggered.
 * @param {boolean} immediate - Render immediately, will force countdown become 0
 * @returns {number} - Render count down
 */
const exec = (immediate) => {
	if (!immediate && (count -= 1) > 0) return count
	count = 0

	if (modificationQueue.length > 0) execModifications()

	if (domQueue.length > 0) execDomModifications()

	// Execute user queue after DOM update
	if (userQueue.length > 0) setTimeout(execUserQueue, 0)

	return count
}

/**
 * Run callback in a safe way, without worrying about unhandled errors may break rendering.
 * @param {Function} cb - Callback function to be executed safly
 * @returns {(void|Error)} - Error that happens when executing callback
 */
const bundle = (cb) => {
	inform()
	try {
		// eslint-disable-next-line callback-return
		exec(cb(inform, exec))
	} catch (e) {
		exec()
		return e
	}
}

export { queue, queueDom, onNextRender, inform, exec, bundle, isPaused }
