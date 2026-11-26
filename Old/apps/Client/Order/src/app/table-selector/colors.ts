/**
 * Color constants for the table selector and related components
 * Update these colors here to change them across the entire application
 */
export const COLORS = {
  // Table colors
  TABLE_SELECTABLE: '#1e3a8a', // Dark blue for selectable tables
  TABLE_UNSELECTABLE: '#6b7280', // Dark gray for unselectable tables
  TABLE_SELECTED: 'lightgreen', // Green when seats are selected
  TABLE_HOVERED: '#3b82f6', // Lighter blue for hover

  // Seat colors
  SEAT_SELECTABLE: '#1e3a8a', // Dark blue for selectable seats
  SEAT_UNSELECTABLE: '#6b7280', // Dark gray for unselectable seats
  SEAT_SELECTABLE_TABLE: '#9ca3af', // Light gray for seats on selectable tables
  SEAT_TAKEN: 'red',
  SEAT_SELECTED: 'lightgreen',
  SEAT_HOVERED: '#3b82f6', // Lighter blue for hover

  // Other colors
  SEAT_LINE: 'gray',
  ROOM_FILL: 'rgba(0, 0, 255, 0.3)',
  ROOM_STROKE: 'blue',
  ROOM_TEXT: 'black',
  TABLE_TEXT: 'white'
} as const;
