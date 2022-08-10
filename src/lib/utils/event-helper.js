import {DOM} from './dom-helper.js'

/**
 * @typedef {{bubbles: boolean, cancelable: boolean, composed: boolean}} EFEventOptions
 */

/* Get new events that works in all target browsers
 * though a little bit old-fashioned
 */
const getEvent = (name, options = {}) => {
	const event = DOM.document.createEvent && DOM.document.createEvent('CustomEvent') || new Event(name, options)
	if (event.initEvent) event.initEvent(name, options.bubbles, options.cancelable)
	return event
}

export default getEvent
