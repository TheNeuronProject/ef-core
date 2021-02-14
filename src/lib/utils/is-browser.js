import dbg from './debug.js'

const isBrowser = typeof document !== 'undefined' && typeof Node !== 'undefined'

if (process.env.NODE_ENV !== 'production') {
	if (isBrowser) dbg.info('Running in browser mode.')
	else dbg.info('Running in non-browser mode, please be sure to set a DOM simulation using `setDOMImpl`. See https://github.com/TheNeuronProject/ef.js#server-side-rendering for detail.')
}

export default isBrowser
