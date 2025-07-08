import { Command, CommandRunner } from 'nest-commander';
import { SeedService } from '../database/seeds/seed.service';

@Command({
  name: 'seed',
  description: '执行数据库种子数据初始化',
})
export class SeedCommand extends CommandRunner {
  constructor(private readonly seedService: SeedService) {
    super();
  }

  async run(inputs: string[], options: Record<string, any>): Promise<void> {
    const subCommand = inputs[0];

    switch (subCommand) {
      case 'all':
        await this.seedService.runAllSeeds();
        break;
      case 'template':
        await this.seedService.runDefaultTemplate();
        break;
      default:
        console.log('可用的种子命令:');
        console.log('  npm run seed all      # 运行所有种子数据');
        console.log('  npm run seed template # 仅初始化默认考核模板');
        break;
    }
  }
}