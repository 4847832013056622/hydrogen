import {Flags} from '@oclif/core';
import {logThrown} from '@remix-run/dev/dist/compiler/utils/log.js';
import Command from '@shopify/cli-kit/node/base-command';
import colors from '@shopify/cli-kit/node/colors';
import {
  outputContent,
  outputInfo,
  outputWarn,
} from '@shopify/cli-kit/node/output';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {Logger, LogLevel} from '@shopify/cli-kit/node/output';
import {
  createDeploy,
  DeploymentConfig,
  DeploymentHooks,
  parseToken,
} from '@shopify/oxygen-cli/dist/deploy/index.js';

import {commonFlags} from '../../lib/flags.js';
import {getOxygenDeploymentToken} from '../../lib/get-oxygen-token.js';

// cli-kit will expose a LogLevel in nightly/future versions https://github.com/Shopify/cli/pull/2329
const customLogger: Logger = (message: string, level: LogLevel = 'info') => {
  if (level === 'error' || level === 'warn') {
    outputWarn(message);
  }
};

export default class Deploy extends Command {
  static flags: any = {
    path: commonFlags.path,
    shop: commonFlags.shop,
    publicDeployment: Flags.boolean({
      env: 'OXYGEN_PUBLIC_DEPLOYMENT',
      description: 'Marks a preview deployment as publicly accessible.',
      required: false,
      default: false,
    }),
    metadataUrl: Flags.string({
      description:
        'URL that links to the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'OXYGEN_METADATA_URL',
    }),
    metadataUser: Flags.string({
      description:
        'User that initiated the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'OXYGEN_METADATA_USER',
    }),
    metadataVersion: Flags.string({
      description:
        'A version identifier for the deployment. Will be saved and displayed in the Shopify admin',
      required: false,
      env: 'OXYGEN_METADATA_VERSION',
    }),
  };

  static hidden = true;

  async run() {
    const {flags} = await this.parse(Deploy);
    const actualPath = flags.path ?? process.cwd();

    const token = await getOxygenDeploymentToken({
      root: actualPath,
      flagShop: flags.shop,
    });
    if (!token) {
      return;
    }

    const config: DeploymentConfig = {
      assetsDir: 'dist/client',
      buildCommand: 'yarn build',
      buildOutput: false,
      deploymentUrl: 'https://oxygen.shopifyapps.com',
      deploymentToken: parseToken(token as string),
      metadata: {
        url: flags.metadataUrl,
        user: flags.metadataUser,
        version: flags.metadataVersion,
      },
      publicDeployment: flags.publicDeployment,
      rootPath: actualPath,
      skipBuild: false,
      workerOnly: false,
      workerDir: 'dist/worker',
    };

    let startTime: number;
    const hooks: DeploymentHooks = {
      onBuildStart: () => {
        startTime = Date.now();
      },
      onBuildComplete: () => {
        const duration = Date.now() - startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = ((duration % 60000) / 1000).toFixed(0);
        outputInfo(
          outputContent`${colors.whiteBright(
            'Build completed in: ',
          )} ${colors.dim(`${minutes} minutes and ${seconds} seconds`)}`.value,
        );
      },
      onBuildError: (error: Error) => {
        logThrown(error);
      },
    };

    outputInfo(
      outputContent`${colors.whiteBright('Deploying to Oxygen..')}`.value,
    );
    await createDeploy({config, hooks, logger: customLogger}).then(
      (url: string | undefined) => {
        const deploymentType = config.publicDeployment ? 'public' : 'private';
        renderSuccess({
          body: ['Successfully deployed to Oxygen'],
          nextSteps: [
            [
              `Open ${url!} in your browser to view your ${deploymentType} deployment`,
            ],
          ],
        });
      },
    );
  }
}
