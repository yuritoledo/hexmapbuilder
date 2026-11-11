import '@fontsource-variable/literata';
import './theme.css';
import './style.css';
import './workspace.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Elemento principal não encontrado.');
createRoot(app).render(createElement(App));
