import { describe, it } from 'mocha'
import { expect } from 'chai'

import { validate_where_clause } from '../src/validators/index.mjs'

// A row filter can keep exact (subject, season) rows by listing [id, season]
// pairs -- league's player_year filter. The validator admits the shape and
// still applies the string checks to the id inside each pair.
const pair_where = (value) => [
  { column_id: 'player_year', operator: 'IN', value }
]

describe('where value pairs', () => {
  it('admits a list of [id, season] pairs', () => {
    const where = pair_where([
      ['TODD-GURL-000001', 2015],
      ['ANTO-GIBS-000002', 2020]
    ])
    expect(validate_where_clause(where).errors).to.deep.equal([])
  })

  it('refuses a pair carrying an unsafe string', () => {
    const where = pair_where([['x; drop table player', 2015]])
    expect(validate_where_clause(where).valid).to.equal(false)
  })

  it('refuses a triple', () => {
    const where = pair_where([['TODD-GURL-000001', 2015, 1]])
    expect(validate_where_clause(where).valid).to.equal(false)
  })
})
