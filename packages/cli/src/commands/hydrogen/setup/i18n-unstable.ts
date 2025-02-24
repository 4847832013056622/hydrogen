import {resolvePath} from '@shopify/cli-kit/node/path';
import {commonFlags, flagsToCamelObject} from '../../../lib/flags.js';
import Command from '@shopify/cli-kit/node/base-command';
import {
  renderSelectPrompt,
  renderSuccess,
  renderTasks,
} from '@shopify/cli-kit/node/ui';
import {Args} from '@oclif/core';
import {getRemixConfig} from '../../../lib/config.js';
import {
  setupI18nStrategy,
  SETUP_I18N_STRATEGIES,
  I18N_STRATEGY_NAME_MAP,
  type I18nStrategy,
  renderI18nPrompt,
} from '../../../lib/setups/i18n/index.js';

export default class SetupI18n extends Command {
  static description =
    'Setup internationalization strategies for your project.';

  static hidden = true;

  static flags = {
    path: commonFlags.path,
  };

  static args = {
    strategy: Args.string({
      name: 'strategy',
      description: `The internationalization strategy to setup. One of ${SETUP_I18N_STRATEGIES.join()}`,
      options: SETUP_I18N_STRATEGIES as unknown as string[],
    }),
  };

  async run(): Promise<void> {
    const {flags, args} = await this.parse(SetupI18n);
    const directory = flags.path ? resolvePath(flags.path) : process.cwd();

    await runSetupI18n({
      ...flagsToCamelObject(flags),
      strategy: args.strategy as I18nStrategy,
      directory,
    });
  }
}

export async function runSetupI18n({
  strategy: flagStrategy,
  directory,
}: {
  strategy?: I18nStrategy;
  directory: string;
}) {
  const remixConfigPromise = getRemixConfig(directory);

  const strategy = flagStrategy ? flagStrategy : await renderI18nPrompt();

  const remixConfig = await remixConfigPromise;

  await renderTasks([
    {
      title: 'Updating files',
      task: async () => {
        await setupI18nStrategy(strategy, remixConfig);
      },
    },
  ]);

  renderSuccess({
    headline: `Internationalization setup complete with strategy ${I18N_STRATEGY_NAME_MAP[
      strategy
    ].toLocaleLowerCase()}.`,
    body: `You can now modify the supported locales in ${
      remixConfig.serverEntryPoint ?? 'your server entry file.'
    }\n`,
  });
}
