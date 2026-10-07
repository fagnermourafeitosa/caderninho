import { Icon } from './icon.jsx';

// [tool, icon, shortcut, label]; '|' is a hairline between groups (order from the overview mockup).
const TOOLS = [
  ['selection', 'cursor', 'V', 'Seleção'], ['hand', 'hand', 'H', 'Mão'], '|',
  ['rectangle', 'rect', 'R', 'Retângulo'], ['diamond', 'diamond', 'D', 'Losango'], ['ellipse', 'ellipse', 'O', 'Elipse'], ['arrow', 'arrow', 'A', 'Seta'], ['line', 'line', 'L', 'Linha'], ['freedraw', 'pencil', 'P', 'Lápis'], ['text', 'text', 'T', 'Texto'], '|',
  ['postit', 'postit', 'N', 'Post-it'], ['image', 'image', '9', 'Imagem'], ['frame', 'frame', 'F', 'Frame'], '|',
  ['eraser', 'eraser', 'E', 'Borracha'],
];

export function ToolRail({ active, onSelect }) {
  return (
    <nav className="board-rail" aria-label="Ferramentas do quadro">
      {TOOLS.map((tool, index) => tool === '|' ? <hr key={index} /> : (
        <button key={tool[0]} type="button" data-tool={tool[0]} className={active === tool[0] ? 'active' : ''} aria-pressed={active === tool[0]} aria-label={tool[3]} title={`${tool[3]} (${tool[2]})`} onClick={() => onSelect(tool[0])}>
          <Icon name={tool[1]} /><small aria-hidden="true">{tool[2]}</small>
        </button>
      ))}
    </nav>
  );
}
