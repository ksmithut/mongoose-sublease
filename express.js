'use strict'

const sublease = require('./')

module.exports = function expressSublease (rootConnection, models, options) {
  options = Object.assign(
    {
      connectionKey: 'connection',
      tenantKey: 'tenant',
      modelKey: 'model',
      getDbName: (req, connection) => connection.name
    },
    options
  )
  const getTenant = sublease(rootConnection, models)
  return (req, res, next) => {
    const dbName = options.getDbName(req, rootConnection)
    const tenant = getTenant(dbName)
    req[options.tenantKey] = dbName
    req[options.connectionKey] = tenant
    req[options.modelKey] = tenant.model.bind(tenant)
    next()
  }
}
