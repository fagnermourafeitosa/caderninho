import { ICONS } from './icon-paths.js';

// The markup is a constant from icon-paths.js, never user content.
export function Icon({ name, className = '' }) {
  const [viewBox, body] = ICONS[name];
  return <svg className={`board-icon ${className}`} viewBox={viewBox} aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} />;
}
