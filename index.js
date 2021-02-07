const {
  equals,
  without,
  concat,
  difference,
  uniq,
  reduce,
  range,
  pluck,
  descend,
  ascend,
  sortWith,
  intersection,
  includes,
  is,
  reverse,
  when,
  sortBy,
  path,
  filter,
  slice,
  map,
  mapObjIndexed,
  values,
  length,
  o,
  compose,
  append,
  isNil,
  mergeLeft,
  clone,
  isEmpty,
} = require("ramda")

const shortid = require("shortid")

let config = {}

let db = {}
let subscribes = {}

function build(paths) {
  let _db = db
  for (const p of paths) {
    if (isNil(_db[p])) _db[p] = {}
    _db = _db[p]
  }
  return _db
}

function ref(paths) {
  let _db = db
  for (const p of paths) {
    if (isNil(_db[p])) return null
    _db = _db[p]
  }
  return _db
}

async function broadcast(op) {
  for (let s in subscribes) {
    const sub = subscribes[s]
    const ss = await sub.ref.get()
    const new_data = sub.type === "doc" ? ss.data() : ss._raw
    if (!equals(sub.data, new_data)) {
      sub.data = clone(new_data)
      sub.fn(ss)
    }
  }
  if (!isNil(config.onChange)) config.onChange({ data: db, op })
}

function doc(paths) {
  return name => ({
    collection: collection(append(name)(paths)),
    onSnapshot: fn => {
      const id = shortid.generate()
      const ref = doc(paths)(name)
      const ss = ref._get()
      subscribes[id] = {
        type: "doc",
        fn,
        ref,
        id,
        data: clone(ss.data()),
      }
      subscribes[id].fn(ss)
      return () => delete subscribes[id]
    },
    _get: () => {
      const data = clone(ref(append(name, paths)))
      return { exists: data !== null, data: () => data || null, key: name }
    },
    get: () => new Promise((res, rej) => res(doc(paths)(name)._get())),
    update: data => {
      new Promise((res, rej) => {
        let _doc = build(paths)
        if (isNil(_doc[name])) {
          rej("doc desn't exist")
        } else {
          _doc[name] = make(data, _doc[name])
          res(name)
          broadcast({ paths, name, data, op: "update" })
        }
      })
    },
    delete: data => {
      new Promise((res, rej) => {
        let _doc = build(paths)
        if (isNil(_doc[name])) {
          rej("doc desn't exist")
        } else {
          delete _doc[name]
          res(name)
          broadcast({ paths, name, data: null, op: "delete" })
        }
      })
    },
    set: (data, opt = {}) =>
      new Promise((res, rej) => {
        let _doc = build(paths)
        if (isNil(_doc[name])) {
          _doc[name] = data
          res(name)
          broadcast({ paths, name, data, op: "set", opt })
        } else {
          if (opt.merge) {
            _doc[name] = make(data, _doc[name])
            res(name)
            broadcast({ paths, name, data, op: "set", opt })
          } else {
            rej("exists")
          }
        }
      }),
  })
}

function make(data, old = {}) {
  for (const k in data) {
    let v = data[k]
    if (is(Object, v) && v._FieldValue) {
      if (v.key === "increment") {
        if (isNil(old[k])) old[k] = 0
        old[k] += v.val
      } else if (v.key === "delete") {
        delete old[k]
      } else if (v.key === "serverTimestamp") {
        old[k] = Date.now()
      } else if (v.key === "arrayUnion") {
        if (isNil(old[k])) old[k] = []
        old[k] = concat(old[k])(difference(uniq(v.val), old[k]))
      } else if (v.key === "arrayRemove") {
        if (isNil(old[k])) old[k] = []
        old[k] = without(v.val, uniq(old[k]))
      }
    } else {
      old[k] = data[k]
    }
  }
  return old
}

function collection(paths, opt = { where: [], orderBy: [] }) {
  return name => ({
    onSnapshot: fn => {
      const id = shortid.generate()
      const ref = collection(paths, opt)(name)
      const ss = ref._get()
      subscribes[id] = {
        type: "collection",
        fn,
        ref,
        id,
        data: clone(ss._raw),
      }
      subscribes[id].fn(ss)
      return () => delete subscribes[id]
    },
    doc: doc(append(name)(paths)),
    add: data =>
      new Promise(res => {
        let _col = build(append(name)(paths))
        const id = shortid.generate()
        _col[id] = make(data)
        res(id)
        broadcast({
          paths: append(name)(paths),
          name: id,
          data,
          op: "add",
          opt,
        })
      }),
    startAt: (...args) =>
      collection(paths, mergeLeft({ startAt: args }, opt))(name),
    startAfter: (...args) =>
      collection(paths, mergeLeft({ startAfter: args }, opt))(name),
    endAt: (...args) =>
      collection(paths, mergeLeft({ endAt: args }, opt))(name),
    endBefore: (...args) =>
      collection(paths, mergeLeft({ endBefore: args }, opt))(name),
    where: (field, op, val) =>
      collection(
        paths,
        mergeLeft({ where: append({ field, op, val })(opt.where) }, opt)
      )(name),
    orderBy: (field, dir = "asc") =>
      collection(
        paths,
        mergeLeft({ orderBy: append({ field, dir })(opt.orderBy) }, opt)
      )(name),
    limit: n => collection(paths, mergeLeft({ limit: n }, opt))(name),
    get: () =>
      new Promise((res, rej) => res(collection(paths, opt)(name)._get())),
    _get: () => {
      let data = o(
        values,
        mapObjIndexed((v, k) => ({ key: k, data: v }))
      )(ref(append(name)(paths)))
      for (const w of opt.where) {
        data = filter(v => {
          if (isNil(v.data[w.field])) return false
          if (w.op === "==") {
            return v.data[w.field] === w.val
          } else if (w.op === "!=") {
            return v.data[w.field] !== w.val
          } else if (w.op === ">") {
            return v.data[w.field] > w.val
          } else if (w.op === ">=") {
            return v.data[w.field] >= w.val
          } else if (w.op === "<") {
            return v.data[w.field] < w.val
          } else if (w.op === "<=") {
            return v.data[w.field] <= w.val
          } else if (w.op === "in") {
            return includes(v.data[w.field])(w.val)
          } else if (w.op === "not-in") {
            return !includes(v.data[w.field])(w.val)
          } else if (w.op === "array-contains") {
            return (
              is(Array, v.data[w.field]) && includes(w.val)(v.data[w.field])
            )
          } else if (w.op === "array-contains-any") {
            return (
              is(Array, v.data[w.field]) &&
              intersection(w.val)(v.data[w.field]).length !== 0
            )
          } else {
            return true
          }
        })(data)
      }
      if (opt.orderBy.length !== 0) {
        data = compose(
          sortWith(
            map(v =>
              v.dir === "asc"
                ? ascend(path(["data", v.field]))
                : descend(path(["data", v.field]))
            )(opt.orderBy)
          ),
          filter(v => {
            for (let v2 of pluck("field")(opt.orderBy)) {
              if (isNil(v.data[v2])) return false
            }
            return true
          })
        )(data)
      }
      if (!isNil(opt.startAt)) {
        const min =
          typeof opt.startAt[0] === "object"
            ? 1
            : Math.min(opt.startAt.length, opt.orderBy.length)
        if (min > 0) {
          for (const i in range(0, min)) {
            let ex = false
            data = filter(v => {
              if (ex === true) return true
              if (typeof opt.startAt[i] === "object") {
                ex = v.key === opt.startAt[i].key
              } else {
                ex =
                  opt.orderBy[i].dir === "asc"
                    ? v.data[opt.orderBy[i].field] >= opt.startAt[i]
                    : v.data[opt.orderBy[i].field] <= opt.startAt[i]
              }
              return ex
            })(data)
          }
        }
      } else if (!isNil(opt.startAfter)) {
        const min =
          typeof opt.startAfter[0] === "object"
            ? 1
            : Math.min(opt.startAfter.length, opt.orderBy.length)
        if (min > 0) {
          for (const i in range(0, min)) {
            let ex = false
            data = filter(v => {
              if (ex === true) return true
              if (typeof opt.startAfter[i] === "object") {
                ex = v.key === opt.startAfter[i].key
                if (ex === true) {
                  return false
                }
              } else {
                ex =
                  opt.orderBy[i].dir === "asc"
                    ? v.data[opt.orderBy[i].field] > opt.startAfter[i]
                    : v.data[opt.orderBy[i].field] < opt.startAfter[i]
              }
              return ex
            })(data)
          }
        }
      }
      if (!isNil(opt.endAt)) {
        const min = Math.min(opt.endAt.length, opt.orderBy.length)
        if (min > 0) {
          for (const i in range(0, min)) {
            let ex = true
            data = filter(v => {
              if (ex === false) return false
              if (typeof opt.endAt[i] === "object") {
                if (v.key === opt.endAt[i].key) {
                  ex = false
                  return true
                }
              } else {
                ex =
                  opt.orderBy[i].dir === "asc"
                    ? v.data[opt.orderBy[i].field] <= opt.endAt[i]
                    : v.data[opt.orderBy[i].field] >= opt.endAt[i]
              }
              return ex
            })(data)
          }
        }
      } else if (!isNil(opt.endBefore)) {
        const min = Math.min(opt.endBefore.length, opt.orderBy.length)
        if (min > 0) {
          for (const i in range(0, min)) {
            let ex = true
            data = filter(v => {
              if (ex === false) return false
              if (typeof opt.endBefore[i] === "object") {
                if (v.key === opt.endBefore[i].key) ex = false
              } else {
                ex =
                  opt.orderBy[i].dir === "asc"
                    ? v.data[opt.orderBy[i].field] < opt.endBefore[i]
                    : v.data[opt.orderBy[i].field] > opt.endBefore[i]
              }
              return ex
            })(data)
          }
        }
      }
      if (!isNil(opt.limit)) data = slice(0, opt.limit)(data)
      data = clone(data)
      return {
        size: data.length,
        empty: data.length === 0,
        forEach: fn => {
          for (let v of data) {
            fn({ key: v.key, data: () => v.data })
          }
        },
        _raw: pluck("data", data),
      }
    },
  })
}

function batch() {
  let ops = []
  return {
    set: (_ref, data, opt = {}) =>
      ops.push({ op: "set", ref: _ref, data: data, opt }),
    update: (_ref, data) => ops.push({ op: "update", ref: _ref, data: data }),
    delete: _ref => ops.push({ op: "delete", ref: _ref }),
    commit: () =>
      new Promise(async res => {
        for (let op of ops) {
          await op.ref[op.op](op.data, op.opt)
        }
        res(true)
      }),
  }
}

function runTransaction(fn) {
  return fn({
    get: _ref => _ref.get(),
    update: (_ref, data) => _ref.update(data),
  })
}

const firestore = () => ({ collection: collection([]), batch, runTransaction })

firestore.FieldValue = {
  increment: n => ({
    key: "increment",
    val: n,
    _FieldValue: true,
  }),
  delete: () => ({
    key: "delete",
    _FieldValue: true,
  }),
  serverTimestamp: () => ({
    key: "serverTimestamp",
    _FieldValue: true,
  }),
  arrayUnion: (...args) => ({
    val: args,
    key: "arrayUnion",
    _FieldValue: true,
  }),
  arrayRemove: (...args) => ({
    val: args,
    key: "arrayRemove",
    _FieldValue: true,
  }),
}

module.exports = {
  initializeApp: _config => {
    config = _config
    if (!isNil(_config.data)) db = clone(_config.data)
  },
  firestore,
  db,
}
