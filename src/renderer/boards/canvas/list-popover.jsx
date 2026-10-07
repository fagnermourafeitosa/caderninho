// List popover: one or more titled sections of choices, the current one highlighted (Espessura, Ponta final…).
import { Icon } from './icon.jsx';

export function ListPopover({ label, sections, onChoose }) {
  return (
    <div className="board-popover" role="menu" aria-label={label}>
      {sections.map(section => (
        <div key={section.title} className="board-list">
          <h3>{section.title}</h3>
          {section.items.map(item => (
            <button key={item.value} type="button" role="menuitemradio" aria-checked={item.value === section.current} className={item.value === section.current ? 'on' : ''} onClick={() => onChoose(section.control, item.value)}>
              {item.icon ? <Icon name={item.icon} /> : <span className="board-list-gap" />}<span>{item.label ?? item.value}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
