/**
 * The label a row axis shows, in the split columns and in the picker.
 *
 * An axis is an id, and a consumer that also declares it as a column has
 * already given it a header, so that header is the label. An axis with no
 * column falls back to its id, which is what every axis showed before.
 *
 * @param {object} params
 * @param {string} params.row_axis - the axis id
 * @param {object} [params.all_columns] - column definitions keyed by column id
 * @returns {string}
 */
export const get_row_axis_label = ({ row_axis, all_columns = {} }) =>
  all_columns[row_axis]?.header_label || row_axis

export default get_row_axis_label
