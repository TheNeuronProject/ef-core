const SavedArray = Array
const proto = SavedArray.prototype

const ARR = {
	copy(arr) {
		return proto.slice.call(arr, 0)
	},
	empty(arr) {
		arr.length = 0
		return arr
	},
	equals(left, right) {
		if (!SavedArray.isArray(right)) return false
		if (left === right) return true
		if (left.length !== right.length) return false
		for (let i = 0, l = left.length; i < l; i++) {
			if (left[i] !== right[i]) return false
		}
		return true
	},
	pop(arr) {
		return proto.pop.call(arr)
	},
	push(arr, ...items) {
		return proto.push.apply(arr, items)
	},
	remove(arr, item) {
		const index = proto.indexOf.call(arr, item)
		if (index > -1) {
			proto.splice.call(arr, index, 1)
			return item
		}
	},
	reverse(arr) {
		return proto.reverse.call(arr)
	},
	rightUnique(arr) {
		const newArr = []
		for (let i = 0; i < arr.length; i++) {
			for (let j = i + 1; j < arr.length; j++) if (arr[i] === arr[j]) j = i += 1
			newArr.push(arr[i])
		}
		return newArr
	},
	shift(arr) {
		return proto.shift.call(arr)
	},
	slice(arr, index, length) {
		return proto.slice.call(arr, index, length)
	},
	sort(arr, fn) {
		return proto.sort.call(arr, fn)
	},
	splice(arr, ...args) {
		return proto.splice.apply(arr, args)
	},
	unshift(arr, ...items) {
		return proto.unshift.apply(arr, items)
	},
	isArray(arr) {
		return SavedArray.isArray(arr)
	}
}

if (typeof Set !== 'undefined' && SavedArray.from) ARR.unique = arr => SavedArray.from(new Set(arr))
else ARR.unique = ARR.rightUnique

export default ARR
