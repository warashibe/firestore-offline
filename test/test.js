const assert = require("assert")
const firebase = require("../index")
const fs = firebase.firestore()
const fv = firebase.firestore.FieldValue

describe("Firestore", function() {
  describe("collection", function() {
    it("add", async () => {
      const col = fs.collection("col")
      const id = await col.add({ name: "john" })
      const doc = (await col.doc(id).get()).data()
      assert.equal(doc.name, "john")
    })
    it("get", async () => {
      const col = fs.collection("col2")
      const id = await col.add({ name: "john" })
      const id2 = await col.add({ name: "mary" })
      const ss = await col.get()
      const names = ["john", "mary"]
      let i = 0
      ss.forEach(doc => assert.equal(doc.data().name, names[i++]))
      assert.equal(ss.size, 2)
    })
    it("limit", async () => {
      const col = fs.collection("col4")
      const id = await col.add({ name: "john" })
      const id2 = await col.add({ name: "mary" })
      const ss = await col.limit(1).get()
      assert.equal(ss.size, 1)
    })
    it("orderBy", async () => {
      const col = fs.collection("col5")
      const id = await col.add({ name: "john", age: 3 })
      const id2 = await col.add({ name: "mary", age: 3 })
      const id3 = await col.add({ name: "hide", age: 5 })
      const ss = await col
        .orderBy("age", "asc")
        .orderBy("name", "desc")
        .get()
      const names = ["mary", "john", "hide"]
      let i = 0
      ss.forEach(doc => assert.equal(doc.data().name, names[i++]))
      assert.equal(ss.size, 3)
    })
    it("where", async () => {
      const col = fs.collection("col6")
      const id = await col.add({ name: "john", age: 3 })
      const id2 = await col.add({ name: "mary" })
      const id3 = await col.add({ name: "hide", age: 5 })
      const ss = await col.where("age", "==", 3).get()
      const names = ["john"]
      let i = 0
      ss.forEach(doc => assert.equal(doc.data().name, names[i++]))
      assert.equal(ss.size, 1)
    })
    it("where array", async () => {
      const col = fs.collection("col7")
      const id = await col.add({
        name: "john",
        age: 3,
        foods: ["beef", "chicken"]
      })
      const id2 = await col.add({ name: "mary", foods: ["pork", "chicken"] })
      const id3 = await col.add({ name: "hide", age: 5 })
      const ss = await col.where("name", "in", ["hide"]).get()
      assert.equal(ss.size, 1)
      const ss2 = await col.where("foods", "array-contains", "chicken").get()
      assert.equal(ss2.size, 2)
      const ss3 = await col.where("name", "not-in", ["john", "hide"]).get()
      assert.equal(ss3.size, 1)
      const ss4 = await col
        .where("foods", "array-contains-any", ["pork", "beef"])
        .get()
      assert.equal(ss4.size, 2)
    })
    it("startAt", async () => {
      const col = fs.collection("col8")
      const id = await col.add({ name: "john", age: 3 })
      const id2 = await col.add({ name: "mary", age: 3 })
      const id3 = await col.add({ name: "hide", age: 5 })
      const ss = await col
        .orderBy("age", "desc")
        .orderBy("name", "desc")
        .startAt(3, "l")
        .get()
      const names = ["john"]
      let i = 0
      ss.forEach(doc => assert.equal(doc.data().name, names[i++]))
      assert.equal(ss.size, 1)
      const doc = await col.doc(id).get()
      const ss2 = await col
        .orderBy("age", "desc")
        .startAt(doc)
        .get()
      const names2 = ["john", "mary"]
      let i2 = 0
      ss2.forEach(doc => assert.equal(doc.data().name, names2[i2++]))
      assert.equal(ss2.size, 2)
    })

    it("startAfter", async () => {
      const col = fs.collection("col9")
      const id = await col.add({ name: "john", age: 3 })
      const id2 = await col.add({ name: "mary", age: 3 })
      const id3 = await col.add({ name: "hide", age: 5 })
      const ss = await col
        .orderBy("age", "desc")
        .orderBy("name", "desc")
        .startAfter(4, "mary")
        .get()
      const names = ["john"]
      let i = 0
      ss.forEach(doc => assert.equal(doc.data().name, names[i++]))
      assert.equal(ss.size, 1)
      const doc = await col.doc(id).get()
      const ss2 = await col
        .orderBy("age", "desc")
        .startAfter(doc)
        .get()
      const names2 = ["mary"]
      let i2 = 0
      ss2.forEach(doc => assert.equal(doc.data().name, names2[i2++]))
      assert.equal(ss2.size, 1)
    })

    it("endAt", async () => {
      const col = fs.collection("col10")
      const id = await col.add({ name: "john", age: 3 })
      const id2 = await col.add({ name: "mary", age: 5 })
      const id3 = await col.add({ name: "hide", age: 5 })
      const ss = await col
        .orderBy("age", "desc")
        .endAt(5)
        .get()
      const names = ["mary", "hide"]
      let i = 0
      ss.forEach(doc => assert.equal(doc.data().name, names[i++]))
      assert.equal(ss.size, 2)
      const doc = await col.doc(id3).get()
      const ss2 = await col
        .orderBy("age", "desc")
        .endAt(doc)
        .get()
      const names2 = ["mary", "hide"]
      let i2 = 0
      ss2.forEach(doc => assert.equal(doc.data().name, names2[i2++]))
      assert.equal(ss2.size, 2)
    })

    it("endBefore", async () => {
      const col = fs.collection("col11")
      const id = await col.add({ name: "john", age: 3 })
      const id2 = await col.add({ name: "mary", age: 3 })
      const id3 = await col.add({ name: "hide", age: 4 })
      const ss = await col
        .orderBy("age", "asc")
        .endBefore(4)
        .get()
      const names = ["john", "mary"]
      let i = 0
      ss.forEach(doc => assert.equal(doc.data().name, names[i++]))
      assert.equal(ss.size, 2)
      const doc = await col.doc(id2).get()
      const ss2 = await col
        .orderBy("age", "desc")
        .endBefore(doc)
        .get()
      const names2 = ["hide", "john"]
      let i2 = 0
      ss2.forEach(doc => assert.equal(doc.data().name, names2[i2++]))
      assert.equal(ss2.size, 2)
    })
    it("onSnapShot", function(done) {
      ;(async () => {
        const col = fs.collection("col12")
        const id = await col.add({ name: "doe" })
        const id2 = await col.add({ name: "john" })
        const unsubscribe = col.onSnapShot(ss => {
          if (ss.size === 3) {
            unsubscribe()
            done()
          }
        })
        const id3 = await col.add({ name: "mary" })
      })()
    })
  })
  describe("doc", function() {
    it("get", async () => {
      const col = fs.collection("doc1")
      const id = await col.add({ name: "doe" })
      const data = (await col.doc(id).get()).data()
      const data2 = (await col.doc("null").get()).data()
      assert.equal(data.name, "doe")
      assert.equal(data2, null)
    })
    it("set", async () => {
      const doc = fs.collection("doc2").doc("john")
      await doc.set({ age: 3, name: "john" })
      const data = (await doc.get()).data()
      assert.equal(data.age, 3)
    })
    it("update", async () => {
      const doc = fs.collection("doc3").doc("john")
      await doc.set({ age: 3, name: "john" })
      await doc.update({ age: 4 })
      const data = (await doc.get()).data()
      assert.equal(data.age, 4)
    })
    it("delete", async () => {
      const doc = fs.collection("doc4").doc("john")
      await doc.set({ age: 3, name: "john" })
      await doc.delete()
      const data = (await doc.get()).data()
      assert.equal(data, null)
    })
    it("onSnapShot", function(done) {
      ;(async () => {
        const col = fs.collection("doc5")
        const id = await col.add({ name: "doe" })
        const doc = col.doc(id)
        const unsubscribe = doc.onSnapShot(ss => {
          if (ss.data().age === 8) {
            unsubscribe()
            done()
          }
        })
        await doc.update({ age: 6 })
        await doc.update({ age: 8 })
      })()
    })
  })
  describe("FieldValue", function() {
    it("inc", async () => {
      const col = fs.collection("fv1")
      const id = await col.add({
        name: "doe",
        age: fv.increment(3)
      })
      const doc = col.doc(id)
      await doc.update({ age: fv.increment(-2) })
      const data = (await col.doc(id).get()).data()
      assert.equal(data.age, 1)
    })
    it("delete", async () => {
      const col = fs.collection("fv2")
      const id = await col.add({
        name: "doe",
        age: 3
      })
      const doc = col.doc(id)
      await doc.update({ age: fv.delete() })
      const data = (await col.doc(id).get()).data()
      assert.equal(data.age, undefined)
    })
    it("serverTimestamp", async () => {
      const col = fs.collection("fv3")
      const id = await col.add({
        name: "doe",
        age: 3,
        date: fv.serverTimestamp()
      })
      const doc = col.doc(id)
      const data = (await col.doc(id).get()).data()
      assert.equal(typeof data.date, "number")
    })
    it("arrayUnion", async () => {
      const col = fs.collection("fv4")
      const id = await col.add({
        name: "doe",
        age: 3,
        foods: fv.arrayUnion("chicken", "beef")
      })
      const doc = col.doc(id)
      await doc.update({ foods: fv.arrayUnion("pork", "lam", "beef") })
      const data = (await col.doc(id).get()).data()
      assert.equal(data.foods.length, 4)
    })
    it("arrayRemove", async () => {
      const col = fs.collection("fv5")
      const id = await col.add({
        name: "doe",
        age: 3,
        foods: fv.arrayUnion("chicken", "beef")
      })
      const doc = col.doc(id)
      await doc.update({ foods: fv.arrayRemove("pork", "lam", "beef") })
      const data = (await col.doc(id).get()).data()
      assert.equal(data.foods.length, 1)
    })
  })
  describe("advanced", function() {
    it("batch", async () => {
      const batch = fs.batch()
      const col = fs.collection("adv1")
      const doc = col.doc("john")
      const doc2 = col.doc("mary")
      batch.set(doc, { name: "john", age: 3 })
      batch.set(doc2, { name: "mary", age: 4 })
      batch.update(doc, { name: "john doe" })
      batch.set(doc, { foods: ["beef"] }, { merge: true })
      batch.delete(doc2)
      await batch.commit()
      const data = (await doc.get()).data()
      const data2 = (await doc2.get()).data()
      assert.equal(data.age, 3)
      assert.equal(data2, null)
      assert.equal(data.foods.length, 1)
    })
    it("runTransaction", async () => {
      const col = fs.collection("adv2")
      const id = await col.add({
        name: "doe",
        age: 3
      })
      const id2 = await col.add({
        name: "mary",
        age: 4
      })
      const doc = col.doc(id)
      const age = await fs.runTransaction(async tx => {
        const data = (await tx.get(doc)).data()
        await tx.update(doc, { age: data.age + 1 })
        return data.age
      })
      const data2 = (await doc.get()).data()
      assert.equal(data2.age, 4)
    })
  })
})
