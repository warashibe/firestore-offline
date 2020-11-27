const { append, isNil, mergeLeft, clone } = require("ramda")
const shortid = require("shortid")
let config = null

let db = {}

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
    if (isNil(_db[p])) {
      return null
    }
    _db = _db[p]
  }
  return _db
}

function doc(paths) {
  return name => {
    return {
      collection: collection(append(name)(paths)),
      get: () => {
        return new Promise((res, rej) => {
          const data = ref(append(name, paths))
          res({ exists: data !== null, data: () => data })
        })
      },
      set: (data, opt = {}) => {
        return new Promise((res, rej) => {
          let _doc = build(paths)
          if (isNil(_doc[name])) {
            _doc[name] = data
            res(name)
          } else {
            if (opt.merge) {
              _doc[name] = mergeLeft(data, _doc[name])
              res(name)
            } else {
              rej("exists")
            }
          }
        })
      }
    }
  }
}

function collection(paths) {
  return name => {
    return {
      doc: doc(append(name)(paths)),
      add: data => {
        return new Promise(res => {
          let _col = build(append(name)(paths))
          const id = shortid.generate()
          _col[id] = data
          res(id)
        })
      }
    }
  }
}

const firestore = () => ({ collection: collection([]) })

module.exports = {
  initializeApp: _config => {
    config = _config
  },
  firestore,
  db,
  FieldValue: {}
}
