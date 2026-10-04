import { createRoot } from 'react-dom/client';
import '@subcult/rekolekt-web/base.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App variant="base stylesheet" />);
