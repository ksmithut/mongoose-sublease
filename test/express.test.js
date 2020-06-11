/* eslint-env jest */
'use strict'

const express = require('express')
const supertest = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const subleaseMiddleware = require('../express')

mongoose.Promise = Promise

const wrap = fn => {
  return (req, res, next) => {
    try {
      return fn(req, res, next)
    } catch (ex) {
      return next(ex)
    }
  }
}

describe('mongoose-model', () => {
  function getRequest (options) {
    const app = express()
    app.use(
      subleaseMiddleware(
        options.rootConnection,
        options.models,
        options.options
      )
    )
    if (options.middleware) app.use(wrap(options.middleware))
    app.use((err, req, res, next) => {
      // eslint-disable-line no-unused-vars
      res.send(err.message)
    })
    return supertest(app)
  }

  /** @type {import('mongodb-memory-server').MongoMemoryServer} */
  let mongod

  const testSchema = new mongoose.Schema({
    name: String
  })
  testSchema.static('test', val => val)

  beforeAll(async () => {
    mongod = new MongoMemoryServer()
    await mongoose.connect(await mongod.getUri())
  }, 600000)

  afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
  })

  it('applies models', () => {
    const middleware = (req, res) => {
      const Test = req.model('Test')
      expect(Test).toHaveProperty('test')
      res.send(Test.test('test'))
    }
    const request = getRequest({
      rootConnection: mongoose.connection,
      models: { Test: testSchema },
      middleware
    })
    return request.get('/').expect(200, 'test')
  })

  it('has custom model key', () => {
    const middleware = (req, res) => {
      expect(req).not.toHaveProperty('model')
      const Test = req.getModel('Test')
      expect(Test).toHaveProperty('test')
      res.send(Test.test('test'))
    }
    const request = getRequest({
      rootConnection: mongoose.connection,
      models: { Test: testSchema },
      options: {
        modelKey: 'getModel'
      },
      middleware
    })
    return request.get('/').expect(200, 'test')
  })

  it('supports multiple database connections', () => {
    const middleware = (req, res) => {
      const Test = req.model('Test')
      expect(Test).toHaveProperty('test')
      res.send(Test.test(req.tenant))
    }
    const request = getRequest({
      rootConnection: mongoose.connection,
      models: { Test: testSchema },
      options: {
        getDbName: req => req.path.substr(1)
      },
      middleware
    })
    return request
      .get('/foo')
      .expect(200, 'foo')
      .then(() => {
        return request.get('/bar').expect(200, 'bar')
      })
      .then(() => {
        return request.get('/foo').expect(200, 'foo')
      })
  })

  it('works without models', () => {
    const middleware = (req, res) => {
      expect(Object.keys(req.mongooseConnection.models)).toHaveLength(0)
      res.send('success')
    }
    const request = getRequest({
      rootConnection: mongoose.connection,
      middleware
    })
    return request.get('/').expect(200, 'success')
  })
})
