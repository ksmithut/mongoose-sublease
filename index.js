'use strict'

module.exports = function mongooseSublease (rootConnection, sharedSchemas) {
  const tenantsConnections = {}
  const sharedSchemasStore = schemaStore(sharedSchemas)

  return tenantId => {
    if (!tenantsConnections[tenantId]) {
      tenantsConnections[tenantId] = rootConnection.useDb(tenantId)
      sharedSchemasStore.initModelsForConnection(tenantsConnections[tenantId])
    }
    return tenantsConnections[tenantId]
  }
}

function schemaStore (schemas) {
  schemas = schemas || {}
  const sharedModelsData = []
  const store = {
    initModelsForConnection (connection) {
      sharedModelsData.forEach(model => {
        connection.model(model.name, model.schema)
      })
      return store
    }
  }
  Object.keys(schemas).forEach(schemaName => {
    sharedModelsData.push({ name: schemaName, schema: schemas[schemaName] })
  })
  return store
}
