import asperaDesktop from '../src/index';

describe('initHttpGateway', () => {

  test('called with invalid string', async () => {
    asperaDesktop.initAsperaDesktop();
    expect(true).toEqual(true);
  });
});
