import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  SpyInstance,
} from 'vitest';
import {Config} from '@oclif/core';
import {createDeploy} from '@shopify/oxygen-cli/dist/deploy/index.js';

import Deploy from './deploy.js';
import {getOxygenDeploymentToken} from '../../lib/get-oxygen-token.js';

vi.mock('../../../src/lib/get-oxygen-token');
vi.mock('@shopify/oxygen-cli/dist/deploy/index.js');

describe('deploy', () => {
  beforeEach(() => {
    vi.mocked(createDeploy).mockResolvedValue('http://the-deploy-url.com');
  });

  it('calls getOxygenDeploymentToken with the correct parameters', async () => {
    const config = await Config.load();
    const deploy = new Deploy([], config);
    deploy.argv = ['--shop', 'snowdevil', '--path', './'];
    await deploy.run();

    expect(getOxygenDeploymentToken).toHaveBeenCalledWith({
      root: './',
      flagShop: 'snowdevil.myshopify.com',
    });
  });
});
