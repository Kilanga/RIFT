module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = api.env('test');
  return {
    presets: [
      isTest
        ? ['@babel/preset-env', { targets: { node: 'current' } }]
        : 'babel-preset-expo',
    ],
  };
};
