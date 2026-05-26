/* global describe it */
import { expect } from 'chai'
import { student_t_two_tailed_p_value } from '../src/utils/student-t-p-value.js'

// Reference values from scipy.stats.t.sf(|t|, df) * 2
// Reference values produced by @stdlib/stats-base-dists-t-cdf
// (the dependency this module replaces), via 2 * (1 - cdf(|t|, df)).
const cases = [
  { t: 0, df: 10, expected: 1.0 },
  { t: 1.0, df: 10, expected: 0.34089313230205986 },
  { t: 2.228, df: 10, expected: 0.05001177181711136 },
  { t: 3.169, df: 10, expected: 0.01000463336438484 },
  { t: -2.228, df: 10, expected: 0.05001177181711136 },
  { t: 1.96, df: 1000, expected: 0.05027318495574873 },
  { t: 1.96, df: 1e6, expected: 0.049996067585269754 },
  { t: 0.5, df: 1, expected: 0.7048327646991335 }
]

describe('student_t_two_tailed_p_value', () => {
  for (const { t, df, expected } of cases) {
    it(`t=${t}, df=${df} → ${expected.toExponential(3)}`, () => {
      const actual = student_t_two_tailed_p_value(t, df)
      expect(actual).to.be.closeTo(expected, Math.max(1e-7, expected * 1e-5))
    })
  }
})
