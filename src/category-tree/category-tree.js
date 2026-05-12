import React from 'react'
import PropTypes from 'prop-types'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import List from '@mui/material/List'
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

import { use_count_children } from '../utils'

export const CategoryTree = ({
  category,
  depth = 0,
  base_path = '/',
  open_categories,
  toggle_category,
  render_leaf
}) => {
  const count_children = use_count_children()
  const category_path = `${base_path}${category.header}/`
  const is_open = open_categories[category_path] || false
  const total_children_count = count_children(category.columns || [])
  return (
    <div>
      <ListItem
        disablePadding
        onClick={() => toggle_category(category_path)}
        className={`column-category column-category-depth-${depth}`}>
        {is_open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
        <ListItemText primary={category.header} />
        <Badge badgeContent={total_children_count} color='primary' />
      </ListItem>
      <Collapse in={is_open} timeout='auto' unmountOnExit>
        <List component='div' disablePadding>
          {category.columns &&
            category.columns.map((sub) =>
              sub.columns ? (
                <CategoryTree
                  key={`${category_path}${sub.header}/`}
                  category={sub}
                  depth={depth + 1}
                  base_path={category_path}
                  open_categories={open_categories}
                  toggle_category={toggle_category}
                  render_leaf={render_leaf}
                />
              ) : (
                render_leaf(sub, depth + 1)
              )
            )}
        </List>
      </Collapse>
    </div>
  )
}

CategoryTree.propTypes = {
  category: PropTypes.object.isRequired,
  depth: PropTypes.number,
  base_path: PropTypes.string,
  open_categories: PropTypes.object.isRequired,
  toggle_category: PropTypes.func.isRequired,
  render_leaf: PropTypes.func.isRequired
}
