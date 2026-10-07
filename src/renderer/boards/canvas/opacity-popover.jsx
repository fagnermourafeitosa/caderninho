// Image opacity: a single slider under the "Opacidade" button.
import { OpacityField } from './swatch-popover.jsx';

export function OpacityPopover({ value, onChange }) {
  return <div className="board-popover" role="dialog" aria-label="Opacidade"><OpacityField value={value} onChange={onChange} /></div>;
}
