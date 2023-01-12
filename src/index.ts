/**
 * Initialize IBM Aspera Desktop client.
 */
const initAsperaDesktop = () => {
  console.warn('Hello, World!');
};

if (typeof (<any>window) === 'object') {
  (<any>window).initAsperaDesktop = initAsperaDesktop;
}

export default {
  initAsperaDesktop
};
