// Every contextual-bar control: its button face, its state and what it does (a popover, a patch or a native action).
import { Icon } from './icon.jsx';
import { SwatchPopover } from './swatch-popover.jsx';
import { ListPopover } from './list-popover.jsx';
import { OpacityPopover } from './opacity-popover.jsx';

const FONTS = { 5: 'À mão', 6: 'Normal', 8: 'Código' };
const SIZES = { 16: 'P', 20: 'M', 28: 'G', 36: 'XG' };
const WIDTH = { 1: 'Fina', 2: 'Média', 4: 'Grossa' };
const LINE = { solid: 'Contínua', dashed: 'Tracejada', dotted: 'Pontilhada' };
const HEAD = { null: 'Nenhuma', arrow: 'Seta', triangle: 'Triângulo', circle: 'Círculo', bar: 'Barra' };
const chevron = <Icon name="chev" className="board-chevron" />;
const swatch = (style, extra = '') => <span className={`board-swatch ${extra}`} style={style} />;
const fillFace = color => color === 'transparent' ? swatch({}, 'hatched') : swatch({ background: color });
const items = (pairs, icons = {}) => pairs.map(value => ({ value, icon: icons[value] }));

const strokeSections = ctx => [
  { title: 'Espessura', control: 'width', current: WIDTH[ctx.first.strokeWidth], items: items(['Fina', 'Média', 'Grossa'], { Fina: 'w1', Média: 'w2', Grossa: 'w3' }) },
  { title: 'Estilo da linha', control: 'lineStyle', current: LINE[ctx.first.strokeStyle], items: items(['Contínua', 'Tracejada', 'Pontilhada'], { Contínua: 'w2', Tracejada: 'dash', Pontilhada: 'dot' }) },
];
const headSection = (ctx, control, title) => [{ title, control, current: HEAD[ctx.first[control === 'startHead' ? 'startArrowhead' : 'endArrowhead']], items: items(Object.values(HEAD), { Nenhuma: 'line', Seta: 'hend', Triângulo: 'tri', Círculo: 'cir', Barra: 'bar' }) }];
const fontSection = ctx => ({ title: 'Fonte', control: 'font', current: FONTS[ctx.text?.fontFamily], items: items(['À mão', 'Normal', 'Código']) });
const sizeSection = ctx => ({ title: 'Tamanho', control: 'size', current: SIZES[ctx.text?.fontSize], items: items(['P', 'M', 'G', 'XG']) });
const list = (label, sections) => ctx => <ListPopover label={label} sections={sections(ctx)} onChoose={ctx.choose} />;

// face: button content; popover: opens under the button; run: acts at once; on: highlighted state.
export const CONTROLS = {
  fill: { title: 'Preenchimento', face: ctx => <>{ctx.several ? swatch({ background: ctx.fillMix }) : fillFace(ctx.first.backgroundColor)}{chevron}</>,
    popover: ctx => <SwatchPopover title="Preenchimento" current={ctx.first.backgroundColor} pattern={ctx.first.backgroundColor === 'transparent' ? 'Vazio' : ctx.first.fillStyle === 'solid' ? 'Sólido' : 'Hachura'} opacity={ctx.first.opacity} onColor={value => ctx.apply('fill', value)} onPattern={value => ctx.apply('fillPattern', value)} onOpacity={value => ctx.apply('opacity', value)} /> },
  stroke: { title: 'Traço', face: ctx => <>{swatch({ borderColor: ctx.first.strokeColor === 'transparent' ? undefined : ctx.first.strokeColor }, 'ring')}{chevron}</>,
    popover: ctx => <SwatchPopover title="Traço" current={ctx.first.strokeColor} onColor={value => ctx.apply('stroke', value)} /> },
  textColor: { title: 'Cor do texto', face: ctx => <>{swatch({ background: ctx.first.strokeColor })}{chevron}</>,
    popover: ctx => <SwatchPopover title="Cor do texto" current={ctx.first.strokeColor} onColor={value => ctx.apply('textColor', value)} /> },
  width: { title: 'Espessura', face: () => <><Icon name="w2" />{chevron}</>, popover: list('Espessura', strokeSections) },
  lineStyle: { title: 'Estilo da linha', face: () => <><Icon name="dash" />{chevron}</>, popover: list('Estilo da linha', strokeSections) },
  roughness: { title: 'Traço à mão', face: () => <Icon name="rough" />, on: ctx => ctx.first.roughness > 0, run: ctx => ctx.apply('roughness') },
  corners: { title: 'Cantos arredondados', face: () => <Icon name="round" />, on: ctx => Boolean(ctx.first.roundness), run: ctx => ctx.apply('corners') },
  shapeText: { title: 'Texto', face: ctx => <><Icon name="font" /><span>{SIZES[ctx.text?.fontSize] || 'M'}</span>{chevron}</>, popover: list('Texto', ctx => [fontSection(ctx), sizeSection(ctx)]) },
  fontFamily: { title: 'Fonte', face: ctx => <><Icon name="font" /><span>{FONTS[ctx.first.fontFamily] || 'À mão'}</span>{chevron}</>, popover: list('Fonte', ctx => [fontSection(ctx)]) },
  fontSize: { title: 'Tamanho', face: ctx => <><span>{SIZES[ctx.first.fontSize] || 'M'}</span>{chevron}</>, popover: list('Tamanho', ctx => [sizeSection(ctx)]) },
  alignLeft: { title: 'Alinhar à esquerda', face: ctx => <Icon name={ctx.several ? 'alignl' : 'tl'} />, on: ctx => !ctx.several && ctx.first.textAlign === 'left', run: ctx => ctx.several ? ctx.key('alignLeft') : ctx.apply('alignLeft') },
  alignCenter: { title: 'Centralizar', face: () => <Icon name="tc" />, on: ctx => ctx.first.textAlign === 'center', run: ctx => ctx.apply('alignCenter') },
  alignHorizontal: { title: 'Centralizar na horizontal', face: () => <Icon name="alignc" />, run: ctx => ctx.panel('alignHorizontal') },
  alignTop: { title: 'Alinhar ao topo', face: () => <Icon name="alignt" />, run: ctx => ctx.key('alignTop') },
  distribute: { title: 'Distribuir', face: () => <Icon name="dist" />, run: ctx => ctx.key('distribute') },
  sharp: { title: 'Reta', face: () => <Icon name="sharp" />, on: ctx => !ctx.first.elbowed && !ctx.first.roundness, run: ctx => ctx.arrow ? ctx.panel('sharpArrow') : ctx.apply('sharp') },
  curve: { title: 'Curva', face: () => <Icon name="curve" />, on: ctx => !ctx.first.elbowed && Boolean(ctx.first.roundness), run: ctx => ctx.arrow ? ctx.panel('curveArrow') : ctx.apply('curve') },
  elbow: { title: 'Cotovelo', face: () => <Icon name="elbow" />, on: ctx => Boolean(ctx.first.elbowed), disabled: ctx => !ctx.arrow, run: ctx => ctx.panel('elbowArrow') },
  startHead: { title: 'Ponta inicial', face: () => <><Icon name="hstart" />{chevron}</>, disabled: ctx => !ctx.arrow, popover: list('Ponta inicial', ctx => headSection(ctx, 'startHead', 'Ponta inicial')) },
  endHead: { title: 'Ponta final', face: () => <><Icon name="hend" />{chevron}</>, disabled: ctx => !ctx.arrow, popover: list('Ponta final', ctx => headSection(ctx, 'endHead', 'Ponta final')) },
  opacity: { title: 'Opacidade', face: ctx => <><span>Opacidade {ctx.first.opacity}%</span>{chevron}</>, popover: ctx => <OpacityPopover value={ctx.first.opacity} onChange={value => ctx.apply('opacity', value)} /> },
  rename: { title: 'Renomear', face: () => <><Icon name="rename" /><span>Renomear</span></>, run: ctx => ctx.renameFrame() },
  exportFrame: { title: 'Exportar PNG', face: () => <><Icon name="export" /><span>Exportar PNG</span></>, run: ctx => ctx.exportFrame() },
  group: { title: 'Agrupar', face: () => <><Icon name="group" /><span>Agrupar</span></>, run: ctx => ctx.key('group') },
  wrapFrame: { title: 'Em frame', face: () => <><Icon name="frame" /><span>Em frame</span></>, run: ctx => ctx.wrapFrame() },
  layer: { title: 'Camada', face: () => <Icon name="layers" />, popover: list('Camada', () => [{ title: 'Camada', control: 'layer', items: [{ value: 'bringForward', label: 'Trazer para frente' }, { value: 'sendBackward', label: 'Enviar para trás' }, { value: 'bringToFront', label: 'Trazer ao topo' }, { value: 'sendToBack', label: 'Enviar ao fundo' }] }]) },
  duplicate: { title: 'Duplicar', face: () => <Icon name="copy" />, run: ctx => ctx.key('duplicate') },
  delete: { title: 'Apagar', face: () => <Icon name="del" />, run: ctx => ctx.key('delete') },
  more: { title: 'Mais', face: () => <Icon name="more" />, popover: list('Mais', ctx => [{ title: 'Mais', control: 'more', items: [{ value: 'lock', label: ctx.first.locked ? 'Destravar' : 'Travar' }, { value: 'copyStyles', label: 'Copiar estilo' }, { value: 'pasteStyles', label: 'Colar estilo' }] }]) },
};
