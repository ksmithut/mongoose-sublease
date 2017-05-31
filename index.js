'use strict'

module.exports = function mongooseSublease (rootConnection, models) {
  const tenants = {}
  const schemas = schemaStore(models)

  return name => {
    if (!tenants[name]) {
      tenants[name] = rootConnection.useDb(name)
      schemas.apply(tenants[name])
    }
    return tenants[name]
  }
}

function schemaStore (schemas) {
  schemas = schemas || {}
  const sharedSchemas = []
  const store = {
    model (modelName, schema) {
      sharedSchemas.push({ modelName, schema })
      return store
    },
    apply (connection) {
      sharedSchemas.forEach(schema => {
        connection.model(schema.modelName, schema.schema)
      })
      return store
    }
  }
  Object.keys(schemas).forEach(modelName => {
    store.model(modelName, schemas[modelName])
  })
  return store
}
