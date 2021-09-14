import {expect} from '@loopback/testlab';
import {resolve} from '../../resolver';

describe('resolver', () => {
  it('reports helpful error when connector init via short name throws', async () => {
    await expect(resolve('throwing')).rejectedWith(/expected test error/);
  });

  it('reports helpful error when connector init via long name throws', async () => {
    await expect(resolve('drpc-connector-throwing')).rejectedWith(/expected test error/);
  });

  it('reports helpful error when connect is not been installed', async () => {
    const resolved = await resolve('not_exist_connector');
    expect(resolved.module).is.not.ok();
    expect(resolved.error).match(/"not_exist_connector" is not installed/);
  });
});
