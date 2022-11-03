import initBinding from './binding.js'
import {queue, inform, exec} from './render-queue.js'
import {resolvePath} from './resolver.js'
import ARR from './utils/array-helper.js'
import {DOM, EFFragment} from './utils/dom-helper.js'
import getEvent from './utils/event-helper.js'
import {getNamespace} from './utils/namespaces.js'


const typeValid = obj => ['number', 'boolean', 'string'].indexOf(typeof obj) > -1

const createByTag = ({tagName, tagContent, attrs, namespace}) => {
	const tagType = typeof tagContent

	switch (tagType) {
		case 'string': {
			const creationOption = {}
			if (tagName === tagContent && attrs && attrs.is && typeof attrs.is === 'string') creationOption.is = attrs.is
			// if (tagContent.indexOf(':') > -1) [, tagContent] = tagContent.split(':')
			// Namespaced
			if (namespace) return DOM.document.createElementNS(namespace, tagContent, creationOption)
			// Then basic HTMLElements
			return DOM.document.createElement(tagContent, creationOption)
		}
		case 'function': {
			// Then custom component or class based custom component
			return new tagContent()
		}
		default: {
			// Then overriden basic element
			if (tagContent.tag) tagName = tagContent.tag
			// if (tagName.indexOf(':') > -1) [, tagName] = tagName.split(':')
			if (namespace) {
				return DOM.document.createElementNS(namespace, tagName, {is: tagContent.is})
			}

			return DOM.document.createElement(tagName, {is: tagContent.is})
		}
	}
}

const getElement = ({tagName, tagContent, attrs, ref, refs, namespace}) => {
	const element = createByTag({tagName, tagContent, attrs, namespace})
	if (ref) Object.defineProperty(refs, ref, {
		value: element,
		enumerable: true
	})
	return element
}

const getVal = (dataNode, key) => {
	const data = dataNode[key]
	if (typeof data === 'undefined') return ''
	return data
}

const regTmpl = ({val, ctx, handlers, subscribers, innerData, handler}) => {
	if (ARR.isArray(val)) {
		const [strs, ...exprs] = val

		if (!strs) {
			const {dataNode, handlerNode, _key} = initBinding({bind: exprs[0], ctx, handlers, subscribers, innerData})
			const _handler = () => handler(getVal(dataNode, _key))
			handlerNode.push(_handler)

			return _handler
		}

		const tmpl = new Array(strs.length + exprs.length)
		const evalList = []

		for (let i in strs) {
			tmpl[i * 2] = strs[i]
		}

		const _handler = () => {
			for (let i of evalList) i()
			return handler(''.concat(...tmpl))
		}

		evalList.push(...exprs.map((item, index) => {
			const {dataNode, handlerNode, _key} = initBinding({bind: item, ctx, handlers, subscribers, innerData})
			handlerNode.push(_handler)

			index = index * 2 + 1

			return () => {
				tmpl[index] = getVal(dataNode, _key)
			}
		}))

		return _handler
	}
	return () => val
}

const applyEventListener = ({element, custom, handler, trigger: {l, s, i, p, h, a, c, t, u, e, o, k}}) => {

	/*
	 *  l: listener                 : string
	 *  s: stopPropagation          : number/undefined
	 *  i: stopImmediatePropagation : number/undefined
	 *  p: preventDefault           : number/undefined
	 *  h: shiftKey                 : number/undefined
	 *  a: altKey                   : number/undefined
	 *  c: ctrlKey                  : number/undefined
	 *  t: metaKey                  : number/undefined
	 *  u: capture                  : number/undefined
	 *  e: passive                  : number/undefined
	 *  o: once                     : number/undefined
	 *  k: keyCodes                 : array<number>/undefined
	 */

	const checkEventProps = (event) => {
		if (!!h !== !!event.shiftKey ||
			!!a !== !!event.altKey ||
			!!c !== !!event.ctrlKey ||
			!!t !== !!event.metaKey ||
			(k && k.indexOf(event.which) === -1)) return false
		return true
	}

	const handleStopOptions = (event) => {
		if (s) event.stopPropagation()
		if (i) event.stopImmediatePropagation()
	}

	let eventOptions = {
		capture: !!u
	}

	let baseEventHandler = (event) => {
		handleStopOptions(event)
		if (p && !e) event.preventDefault()
		handler(event)
	}

	let eventHandler = (event) => {
		if (!checkEventProps(event)) return
		baseEventHandler(event)
	}

	const makePassiveEventHandler = () => {
		baseEventHandler = (event) => {
			handleStopOptions(event)
			setTimeout(() => handler(event), 0)
		}
		eventHandler = (event) => {
			if (!checkEventProps(event)) return
			baseEventHandler(event)
		}
	}

	const makeOnceEventHandler = () => {
		const removeListener = custom && '$off' || 'removeEventListener'
		eventHandler = (event) => {
			if (!checkEventProps(event)) return
			element[removeListener](l, eventHandler, eventOptions)
			baseEventHandler(event)
		}
	}

	if (e || o) {
		if (DOM.passiveSupported || DOM.onceSupported) {
			if (e === 0 && DOM.passiveSupported) {
				eventOptions.passive = false
			} else if (e) {
				if (DOM.passiveSupported) eventOptions.passive = true
				else makePassiveEventHandler()
			}

			if (o) {
				if (DOM.onceSupported) eventOptions.once = true
				else makeOnceEventHandler()
			}

		} else {
			if (e) makePassiveEventHandler()
			if (o) makeOnceEventHandler()
		}
	}

	const addListener = custom && '$on' || 'addEventListener'
	element[addListener](l, eventHandler, eventOptions)
}

const addValListener = ({ctx, trigger, updateLock, handlers, subscribers, innerData, element, lastNode, key, expr, custom}) => {
	const addListener = custom && '$on' || 'addEventListener'
	const {parentNode, _key} = initBinding({bind: expr, ctx, handlers, subscribers, innerData})

	const handler = () => {
		updateLock.locked = true
		inform()
		parentNode[_key] = lastNode[key]
		exec()
		updateLock.locked = false
	}

	const eventOptions = {
		capture: true
	}

	if (trigger) {
		applyEventListener({element, custom, handler, trigger})
	} else if (key === 'value') {
		// Listen to input, keyup and change events in order to work in most browsers.
		element[addListener]('input', handler, eventOptions)
		element[addListener]('keyup', handler, eventOptions)
		element[addListener]('change', handler, eventOptions)
	} else {
		const dispatch = custom && '$dispatch' || 'dispatchEvent'
		element[addListener]('change', () => {
			// Trigger change to the element it-self
			element[dispatch](getEvent('__ef_change_event__'), {bubbles: false, cancelable: false})
			if (element.tagName === 'INPUT' && element.type === 'radio' && element.name !== '') {
				// Trigger change to the the same named radios
				const radios = DOM.document.querySelectorAll(`input[name=${element.name}][type=radio]`)
				if (radios) {
					const selected = ARR.copy(radios)
					ARR.remove(selected, element)

					/* Event triggering could cause unwanted render triggers
					 * no better ways came up at the moment
					 */
					for (let i of selected) i.dispatchEvent(getEvent('__ef_change_event__'))
				}
			}
		}, eventOptions)
		// Use custom event to avoid loops and conflicts
		element[addListener]('__ef_change_event__', handler)
	}
}

const getAttrHandler = ({element, key, custom, ctx}) => {
	// Pass directly to custom component
	if (custom) return (val) => {
		element[key] = val
	}

	// Beautify class name
	if (key === 'class') return (val) => {
		val = `${val}`.replace(/\s+/g, ' ').trim()
		// Remove attribute when value is empty
		if (!val) return element.removeAttribute(key)
		element.setAttribute(key, val)
	}

	// Handle namespace
	if (key.indexOf(':') > -1) {
		const [prefix] = key.split(':')
		const namespace = ctx.localNamespaces[prefix] || getNamespace(prefix)
		return (val) => {
			// Remove attribute when value is empty
			if (val === '') return element.removeAttributeNS(namespace, key)
			element.setAttributeNS(namespace, key, val)
		}
	}

	return (val) => {
		// Remove attribute when value is empty
		if (val === '') return element.removeAttribute(key)
		element.setAttribute(key, val)
	}
}

const addAttr = ({element, attr, key, ctx, handlers, subscribers, innerData, custom}) => {
	if (typeValid(attr)) {
		if (custom) {
			if (attr === '') element[key] = true
			else element[key] = attr
			return
		}
		// Do not set or update `is` again
		if (key === 'is') return
		// Handle namespaces
		if (key.indexOf(':') > -1) {
			const [prefix] = key.split(':')
			if (prefix !== 'xmlns') return element.setAttributeNS(ctx.localNamespaces[prefix] || getNamespace(prefix), key, attr)
		}
		return element.setAttribute(key, attr)
	}

	const handler = getAttrHandler({element, key, custom, ctx})
	queue([regTmpl({val: attr, ctx, handlers, subscribers, innerData, handler})])
}

const addProp = ({element, propPath, value, trigger, updateOnly, ctx, handlers, subscribers, innerData, custom}) => {
	const keyPath = ARR.copy(propPath)
	const lastKey = keyPath.pop()
	if (custom) keyPath.unshift('$data')
	const lastNode = resolvePath(keyPath, element)
	if (typeValid(value)) lastNode[lastKey] = value
	else {
		const updateLock = {locked: false}
		let handler = (val) => {
			if (!updateLock.locked && lastNode[lastKey] !== val) {
				lastNode[lastKey] = val
			}
			updateLock.locked = false
		}

		if (updateOnly) handler = () => {
			updateLock.locked = false
		}
		const _handler = regTmpl({val: value, ctx, handlers, subscribers, innerData, handler})
		if (trigger ||
			(propPath.length === 1 && (lastKey === 'value' || lastKey === 'checked')) &&
			!value[0]) addValListener({ctx, trigger, updateLock, handlers, subscribers, innerData, element, lastNode, key: lastKey, expr: value[1], custom})
		queue([_handler])
	}
}

const rawHandler = val => val

const addEvent = ({element, trigger, ctx, handlers, subscribers, innerData, custom}) => {

	/*
	 *  m: method                   : string
	 *  v: value                    : string/array/undefined
	 */
	const {m, v} = trigger
	const _handler = regTmpl({val: v, ctx, handlers, subscribers, innerData, handler: rawHandler})

	const callEventHandler = (event) => {
		if (ctx.methods[m]) ctx.methods[m]({e: event, event, value: _handler(), state: ctx.state})
		else ctx.state.$emit(m)
	}

	applyEventListener({element, custom, handler: callEventHandler, trigger})
}

const createElement = ({info, ctx, innerData, refs, handlers, subscribers, namespace, fragment, custom}) => {
	if (fragment) return new EFFragment()

	/*
	 *  t: tag           : class | string | int, 0 means fragment
	 *  a: attr          : object
	 *  p: prop          : object
	 *  e: event trigger : array
	 *  r: reference     : string
	 */
	const {t, a, p, e, r} = info
	const tagName = t
	const tagContent = ctx.scope[t] || t
	const element = getElement({tagName, tagContent, attrs: a, ref: r, refs, namespace})
	if (a) for (let key in a) addAttr({element, custom, attr: a[key], key, ctx, handlers, subscribers, innerData})
	if (p) for (let [propPath, value, trigger, updateOnly] of p) addProp({element, custom, value, propPath, trigger, updateOnly, ctx, handlers, subscribers, innerData})
	if (e) for (let trigger of e) addEvent({element, custom, trigger, ctx, handlers, subscribers, innerData})

	return element
}

export {createElement, typeValid}
