const { createQueryVariables } = require('./utils')
const { createBelongsToKey } = require('../graphql/nodes/utils')
const { createFilterQuery } = require('../graphql/createFilterTypes')

function createRenderQueue (renderQueue, { pages, store, schema }) {
  for (const page of pages.allPages()) {
    if (page.query.paginate) {
      const totalPages = calcTotalPages(page, store, schema)

      for (let i = 1; i <= totalPages; i++) {
        renderQueue.push(createRenderEntry(page, i))
      }
    } else {
      renderQueue.push(createRenderEntry(page))
    }
  }

  return renderQueue
}

function calcTotalPages (page, store, schema) {
  const { belongsTo, fieldName, typeName, perPage } = page.query.paginate
  const { collection } = store.getContentType(typeName)
  const rootFields = schema.getQueryType().getFields()

  let totalNodes = 0

  if (belongsTo) {
    const { id, path } = belongsTo
    const { args } = rootFields[fieldName].type.getFields().belongsTo
    const query = createCollectionQuery(args, page.query.filters)
    const node = id ? collection.by('id', id) : collection.by('path', path)

    query[createBelongsToKey(node)] = { $eq: true }

    totalNodes = store.index.count(query)
  } else {
    const { args } = rootFields[fieldName]
    const query = createCollectionQuery(args, page.query.filters)

    totalNodes = collection.find(query).length
  }

  return Math.ceil(totalNodes / perPage) || 1
}

function createRenderEntry (page, currentPage = undefined) {
  const segments = page.path.split('/').filter(segment => !!segment)

  if (currentPage > 1) {
    segments.push(currentPage)
  }

  return {
    route: page.route,
    path: `/${segments.join('/')}`,
    component: page.component,
    context: page.context,
    isIndex: page.internal.isIndex,
    query: page.query.document ? {
      document: page.query.document,
      variables: createQueryVariables(page, currentPage)
    } : null
  }
}

function createCollectionQuery (args, filters) {
  const filter = args.find(arg => arg.name === 'filter')
  const fields = filter.type.getFields()

  return createFilterQuery(filters, fields)
}

module.exports = createRenderQueue
