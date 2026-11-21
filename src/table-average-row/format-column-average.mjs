// A volume average reads as a count -- 33.1 targets -- so one place is enough
// when the column declares no precision of its own, AND when every value it
// covers is a whole number whatever precision it declares. A count column can
// inherit a `fixed` meant for its fractional variants (league's from-plays
// factory gives carries `fixed: 2` for the per-game rate outputs), which its
// integer cells never show; its average then read 116.64 carries.
const DEFAULT_AVERAGE_FIXED_PLACES = 1

// A BOOLEAN column's average is a rate -- the share of non-null rows that are
// true -- and reads as a percent whatever precision the column declares.
export const format_column_average = ({
  value,
  fixed,
  integer_valued = false,
  is_rate = false
}) =>
  is_rate
    ? `${(value * 100).toFixed(DEFAULT_AVERAGE_FIXED_PLACES)}%`
    : value.toFixed(
        integer_valued || fixed === undefined
          ? DEFAULT_AVERAGE_FIXED_PLACES
          : fixed
      )
