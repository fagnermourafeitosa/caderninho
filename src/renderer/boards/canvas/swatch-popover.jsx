// Colour popover: the ten paper swatches, plus fill pattern and opacity for fills (contextual-bar image).
export const SWATCHES = ['#fff3b0', '#f6d77a', '#f4c6c0', '#c9d8df', '#cfdcbc', '#e3d4ef', '#f1dcc0', '#fffaea', '#303025', 'transparent'];
const PATTERNS = ['Sólido', 'Hachura', 'Vazio'];

export function SwatchPopover({ title, current, pattern, opacity, onColor, onPattern, onOpacity }) {
  return (
    <div className="board-popover" role="dialog" aria-label={title}>
      <h3>{title}</h3>
      <div className="board-swatches">
        {SWATCHES.map(color => (
          <button key={color} type="button" data-color={color} aria-label={color === 'transparent' ? 'Transparente' : color} aria-pressed={current === color} className={`${current === color ? 'selected' : ''} ${color === 'transparent' ? 'hatched' : ''}`} style={color === 'transparent' ? undefined : { background: color }} onClick={() => onColor(color)} />
        ))}
      </div>
      {onPattern && <>
        <h3>Padrão</h3>
        <div className="board-segmented" role="group" aria-label="Padrão">
          {PATTERNS.map(name => <button key={name} type="button" className={pattern === name ? 'on' : ''} aria-pressed={pattern === name} onClick={() => onPattern(name)}>{name}</button>)}
        </div>
      </>}
      {onOpacity && <OpacityField value={opacity} onChange={onOpacity} />}
    </div>
  );
}

export function OpacityField({ value, onChange }) {
  return <>
    <h3>Opacidade</h3>
    <input className="board-slider" type="range" min="0" max="100" step="10" value={value} aria-label="Opacidade" onChange={event => onChange(Number(event.target.value))} />
  </>;
}
