/**
 * Base Component Class
 *
 * All block components extend from this base class.
 * Components are pure data containers with no behavior.
 */
export class Component {
  constructor(data = {}) {
    Object.assign(this, data);
  }
}
