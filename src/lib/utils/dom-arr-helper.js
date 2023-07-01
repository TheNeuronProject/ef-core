import {DOM, useFragment, useAnchor} from './dom-helper.js'
import ARR from './array-helper.js'
import {queueDom, inform, exec} from '../render-queue.js'
import shared from './global-shared.js'

const DOMARR = {
	empty() {
		inform()
		for (let i of ARR.copy(this)) i.$destroy()
		exec()
		ARR.empty(this)
	},
	clear() {
		inform()
		for (let i of ARR.copy(this)) i.$umount()
		exec()
		ARR.empty(this)
	},
	pop() {
		if (this.length === 0) return
		const poped = ARR.pop(this)
		poped.$umount()
		return poped
	},
	push({ctx, key, aftAnchor}, ...items) {
		if (!items.length) return
		items = items.map(shared.toEFComponent)
		inform()
		if (items.length === 1) {
			const placeholder = items[0].$mount({parent: ctx.state, key})
			DOM.before(aftAnchor, placeholder)
		} else {
			useFragment((tempFragment, recycleFragment) => {
				DOM.append(tempFragment, ...items.map(i => i.$mount({parent: ctx.state, key})))
				useAnchor((tempAnchor, recycleAnchor) => {
					DOM.before(aftAnchor, tempAnchor)
					queueDom(() => {
						DOM.after(tempAnchor, tempFragment)
						recycleAnchor()
						recycleFragment()
					})
				})
			})
		}
		const ret = ARR.push(this, ...items)
		exec()
		return ret
	},
	remove(item) {
		if (this.indexOf(item) === -1) return
		item.$umount()
		return item
	},
	reverse({ctx, key, anchor}) {
		if (this.length === 0) return this
		const tempArr = ARR.copy(this)
		const elements = []
		inform()
		queueDom(() => DOM.after(anchor, ...ARR.reverse(elements)))
		for (let i of tempArr) {
			i.$umount()
			ARR.push(elements, i.$mount({parent: ctx.state, key}))
		}
		ARR.push(this, ...ARR.reverse(tempArr))
		exec()
		return this
	},
	shift() {
		if (this.length === 0) return
		const shifted = ARR.shift(this)
		shifted.$umount()
		return shifted
	},
	sort({ctx, key, anchor}, fn) {
		if (this.length === 0) return this
		const sorted = ARR.copy(ARR.sort(this, fn))
		const elements = []
		inform()
		queueDom(() => DOM.after(anchor, ...elements))
		for (let i of sorted) {
			i.$umount()
			ARR.push(elements, i.$mount({parent: ctx.state, key}))
		}
		ARR.push(this, ...sorted)
		exec()
		return this
	},
	splice({ctx, key, anchor}, ...args) {
		if (this.length === 0) return this
		const [idx, , ...inserts] = args
		if (args.length > 2) args.length = 2
		const spliced = ARR.splice(this, ...args)
		let insertIdx = idx
		if (insertIdx < 0) insertIdx = this.length + idx
		if (insertIdx < 0) insertIdx = 0
		inform()
		for (let i of spliced) i.$umount()
		if (inserts.length) {
			if (inserts.length === 1) {
				const item = shared.toEFComponent(inserts[0])
				item.$mount({parent: ctx.state, key})
				const placeholder = item.$ctx.nodeInfo.placeholder
				if (this[insertIdx]) DOM.before(this[insertIdx].$ctx.nodeInfo.firstElement, placeholder)
				else DOM.after(anchor, placeholder)
				ARR.splice(this, insertIdx, 0, item)
			} else {
				useAnchor((tempAnchor, recycleAnchor) => {
					if (this[insertIdx]) DOM.before(this[insertIdx].$ctx.nodeInfo.firstElement, tempAnchor)
					else DOM.after(anchor, tempAnchor)
					useFragment((fragment, recycleFragment) => {
						const insertItems = inserts.map(i => shared.toEFComponent(i))
						DOM.append(fragment, ...insertItems.map(i => i.$mount({parent: ctx.state, key})))
						ARR.splice(this, insertIdx, 0, ...insertItems)
						queueDom(() => {
							DOM.before(tempAnchor, fragment)
							DOM.remove(tempAnchor)
							recycleAnchor()
							recycleFragment()
						})
					})
				})
			}
		}
		exec()
		return spliced
	},
	unshift({ctx, key, anchor}, ...items) {
		if (this.length === 0) return this.push(...items).length
		items = items.map(shared.toEFComponent)
		const elements = []
		inform()
		queueDom(() => DOM.after(anchor, ...elements))
		for (let i of items) ARR.push(elements, i.$mount({parent: ctx.state, key}))
		const ret = ARR.unshift(this, ...items)
		exec()
		return ret
	}
}

const defineArr = (arr, info) => {
	Object.defineProperties(arr, {
		empty: {value: DOMARR.empty},
		clear: {value: DOMARR.clear},
		pop: {value: DOMARR.pop},
		push: {value: DOMARR.push.bind(arr, info)},
		remove: {value: DOMARR.remove},
		reverse: {value: DOMARR.reverse.bind(arr, info)},
		shift: {value: DOMARR.shift},
		sort: {value: DOMARR.sort.bind(arr, info)},
		splice: {value: DOMARR.splice.bind(arr, info)},
		unshift: {value: DOMARR.unshift.bind(arr, info)}
	})
	return arr
}

export default defineArr
