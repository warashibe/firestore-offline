## Firestore Offline

`firestore-offline` is a 100% in-memory emulation of Firestore.

You can use it in browsers to switch the data storage online / offline without changing any part of your app codebase. Firestore itself has a offline-persistence feature, but not the handy 100% offline emulation like this.

### Installation

```bash
yarn add firestore-offline
```

### Initialization

```javascript
import fo from "firestore-offline"

const DATA = {
  users : {
    user_A : {
	  name : "warashibe"
	},
	user_B : {
	  name : "hideaki"
	},
  }
}

fo.initializeApp({
  onChange: async data => await {
    // this will be executed every time the data changes
	// for instance, you can sync the data with LocalStorage here
  },
  data: DATA // initial data
})
  
```

The rest is the same as Firestore.

### Test

```bash
yarn test
```

### Cookbook

Using `firestore-offline` with [Firestore Sweet](https://warashibe.github.io/firestore-sweet/) syntactic sugar with the data backed up and synced by [LocalForage](https://github.com/localForage/localForage).

```javascript
import fo from "firestore-offline"
import sweet from "firestore-sweet"
import lf from "localforage"

fo.initializeApp({
  onChange: async data => await lf.setItem("data", data.data),
  data: (await lf.getItem("data")) || {}
})
const fs = sweet(fbls.firestore)

(async ()=>{
  const user_id = await fs.add({name: "warashibe"}, "users")
  console.log(await fs.get("users", user_id))
})()

```
