import '../styles/studio.css';
import '../styles/legal.css';
import { exeLinks } from './exe-link';
import { initStudioShell } from './shell';

// Privacy and terms: the shared shell only. A page people read to the end stays still.
initStudioShell([]);
exeLinks();
