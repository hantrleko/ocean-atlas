export default {
  base: './',
  build: {
    rollupOptions: {
      output: {
        // three.js core in its own long-cached chunk; app code changes don't bust it
        manualChunks: id => (id.includes('node_modules/three/') ? 'three' : undefined),
      },
    },
  },
};
