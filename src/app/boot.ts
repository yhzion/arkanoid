import { main } from './main';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) {
    document.body.innerHTML = '<div id="app"></div>';
  }
  main();
});
