'use strict'

const sublease = require('./')

module.exports = function expressSublease (
  rootConnection,
  models,
  {
    connectionKey = 'mongooseConnection',
    tenantKey = 'tenant',
    modelKey = 'model',
    getDbName = (req, connection) => connection.name
  } = {}
) {
  const getTenant = sublease(rootConnection, models)
  return (req, res, next) => {
    const dbName = getDbName(req, rootConnection)
    const tenant = getTenant(dbName)
    req[tenantKey] = dbName
    req[connectionKey] = tenant
    req[modelKey] = tenant.model.bind(tenant)
    next()
  }
}
