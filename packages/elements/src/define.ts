// Side-effect entry: `import '@snowbros/elements/define'` registers every element.
import { defineElements } from './elements.js';

if (typeof customElements !== 'undefined') defineElements();
