# mongoose-sublease

[![NPM version](https://img.shields.io/npm/v/mongoose-sublease.svg?style=flat)](https://www.npmjs.org/package/mongoose-sublease)
[![Dependency Status](https://img.shields.io/david/ksmithut/mongoose-sublease.svg?style=flat)](https://david-dm.org/ksmithut/mongoose-sublease)
[![Dev Dependency Status](https://img.shields.io/david/dev/ksmithut/mongoose-sublease.svg?style=flat)](https://david-dm.org/ksmithut/mongoose-sublease#info=devDependencies&view=table)
[![Code Climate](https://img.shields.io/codeclimate/github/ksmithut/mongoose-sublease.svg)](https://codeclimate.com/github/ksmithut/mongoose-sublease)
[![Build Status](https://img.shields.io/travis/ksmithut/mongoose-sublease/master.svg?style=flat)](https://travis-ci.org/ksmithut/mongoose-sublease)
[![Coverage Status](https://img.shields.io/codeclimate/coverage/github/ksmithut/mongoose-sublease.svg?style=flat)](https://codeclimate.com/github/ksmithut/mongoose-sublease)

Makes is easy to do database-level multitenancy with mongoose. Even easier with
express.

# Installation

```sh
npm install --save mongoose-sublease
```

This module has a peer dependency of mongoose of >= version 4. It depends on
the [.useDb()](https://github.com/Automattic/mongoose/wiki/3.8-Release-Notes#connection-pool-sharing)
functionality, so it would probably work on >= 3.8, but this module is only
tested with version 4.

Also, this module requires a user that has access to multiple databases, which
is kind of a scary thought. It is definitely **not** recommended that you just
use an admin user. I haven't verified this, but this is the kind of user you
want. You might be able to narrow this down even more. If you are able to, let
me know and I'll update this doc to represent the least priviledges you need
to work correctly:

```sh
$ mongo
> use admin
> db.addUser({ user: "foo", pwd: "bar", roles: [ "userAdminAnyDatabase", "readWriteAnyDatabase" ]})
```

Then when you authenticate, your mongo uri should look something like this:

```
mongodb://foo:bar@localhost/admin?authSource=admin
```

The important part there is the `authSource=admin`, which tells mongo which
database to use when authenticating. Your multi-database user should be added
to the admin database.

# Usage

## With Express

```js
'use strict'

const express = require('express')
const subleaseMiddleware = require('mongoose-sublease/express')
const mongoose = require('mongoose')

mongoose.Promise = Promise
mongoose.connect('mongodb://localhost')

const app = express()
const userSchema({
  username: String,
  email: String,
  password: String,
})

app.use(subleaseMiddleware(mongoose.connection, {
  User: userSchema,
}))
app.get('/users', (req, res, next) => {
  req.model('User')
    .find()
    .then((users) => res.json(users))
    .catch(next)
})

app.listen(8000)
```

## Raw Usage

```js
'use strict'

const sublease = require('mongoose-sublease')
const mongoose = require('mongoose')

mongoose.Promise = Promise
mongoose.connect('mongodb://localhost')

const userSchema({
  username: String,
  email: String,
  password: String,
})

const getTenant = sublease(mongoose.connection, {
  User: userSchema,
})

const tenant1 = getTenant('tenant1') // 'tenant1' is the database name
const tenant2 = getTenant('tenant2') // 'tenant2' is the database name

tenant1.model('User')
  .create({
    username: 'foo',
    email: 'test@email.com'
    password: 'correct horse battery stable',
  })
  .then(() => {
    return tenant2.find()
  })
  .then((tenant2Users) => {
    console.log(tenant2Users) // empty []
  })
```

# API

`sublease(rootConnection, models)`

Returns a function that you call with a database name, which returns a new
mongoose connection (which shares the same connection pool) and has all of your
monogoose models.

- `rootConnection` Mongoose Connection - The root connection to base other
  connections off of. If you're using the main mongoose connection, use
  `mongoose.connection`.

- `models` Object{string:mongoose.Schema} - And Object map who's keys are the
  model name and values are the corresponding schemas.

  ```js
  const userSchema = new mongoose.Schema({
    name: String
  })
  app.use(
    mongooseModel(mongoose.connection, {
      User: userSchema
    })
  )
  ```

`subleaseMiddleware(rootConnection, models, options)`

Returns a middleware that applies the connection info to the request.
The `rootConnection` and `models` arguments are the same as above.

- `options.connectionKey` String - The key to use when attaching the connection
  to the request object. Default: `connection`. e.g. `req.connection`.

- `options.tenantKey` String - The key to use when attaching the name of the
  tenant. Default `tenant`. e.g. `req.tenantKey`.

- `options.modelKey` String - The key to use when attaching the model method
  that retrieves the models by name. This is essentially a shortcut for
  `connection.model(modelName)`. Default `model`. e.g. `req.model(modelName)`.

- `options.getDbName` Function - The function to call to get the database
  name to use. Defaults to just getting the database name of the root
  connection. This function gets passed the request object and the root
  connection (respectively) and must return a string as it will be used as a key
  to keep track of tenants. Default: `(req, connection) => connection.name`

# Notes

Only express middleware is provided, but with enough interest, I could be
convinced to support middleware for other popular http server frameworks. Or
just write your own! It's not too hard. In fact, this whole module isn't too
difficult to reproduce. In fact, maybe this whole this is just over-engineered.
It's open source, feel free to take it, and modify it, use it, take credit for
it, whatever.

This whole module came about because of a folder structure that I tend to follow
for my node projects. I have a `lib/` folder, which is used for non-business
specific logic, things which could become generic enough as a standalone node
module. It's not super magical, but it definitely reduces boilerplate.
