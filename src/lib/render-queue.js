const userQueue = []
let count = 0

const modificationQueue = {
	first: null,
	last: null
}

const domQueue = {
	first: null,
	last: null
}

// const queue = handlers => modificationQueue.push(...handlers)
const onNextRender = handler => userQueue.push(handler)

const addQueue = (ctx, handler) => {
	if (handler === ctx.last) return

	if (handler.__next) handler.__next.__prev = handler.__prev
	if (handler.__prev) handler.__prev.__next = handler.__next

	if (ctx.first) {
		if (handler === ctx.first) ctx.first = handler.__next
	} else ctx.first = handler

	if (ctx.last) {
		ctx.last.__next = handler
		handler.__prev = ctx.last
	}

	ctx.last = handler
	ctx.first.__prev = null
	ctx.last.__next = null
}

const runQueue = (ctx) => {
	let currentFn = ctx.first
	if (!currentFn) return

	const queueArr = []
	while (currentFn) {
		const nextFn = currentFn.__next
		currentFn.__prev = null
		currentFn.__next = null
		queueArr.push(currentFn)
		currentFn = nextFn
	}

	ctx.first = null
	ctx.last = null

	for (let i of queueArr) i()
}

const queue = (handlers) => {
	for (let i of handlers) addQueue(modificationQueue, i)
}

const queueDom = (handler) => {
	addQueue(domQueue, handler)
}

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

const execUserQueue = () => {
	for (let i of userQueue) i()
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

	runQueue(modificationQueue)
	runQueue(domQueue)

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
