module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/utils/current-user.test.ts'],
  transform: {
    '^.+\\.ts$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript']
    }]
  }
};
