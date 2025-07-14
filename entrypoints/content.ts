export default defineContentScript({
  matches: ['*://v2ex.com/*'],
  main() {
    console.log('Hello content.');
  },
});
