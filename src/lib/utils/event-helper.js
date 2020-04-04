/**
 * @typedef {{bubbles: boolean, cancelable: boolean}} EFEventOptions
 */

/* Get new events that works in all target browsers
 * though a little bit old-fashioned
 */
const getEvent = (name, {bubbles, cancelable} = {
	bubbles: false,
	cancelable: false
}) => {
	const event = document.createEvent('CustomEvent')
	event.initEvent(name, bubbles, cancelable)
	return event
}

export default getEvent
