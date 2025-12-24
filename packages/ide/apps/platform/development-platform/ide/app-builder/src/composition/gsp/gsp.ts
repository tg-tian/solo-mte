import { Ide } from './ide/ide';
import { ContextManager } from './context/context';
import { ContextManagerImplement } from './context/context-manager';
import { CacheService } from './cache/services/cache.service';
import { EventBus } from './eventbus/event-bus';

export class GSP {
  private pConfig: any;
  // private pCommands: CommandRegistry;
  private pIde: Ide;
  private pCache: CacheService;
  private pContext: ContextManager;
  private pEventBus: EventBus;

  // get commands(): CommandRegistry { return this.pCommands; }
  get ide(): Ide { return this.pIde; }
  get context(): ContextManager { return this.pContext; }
  get cache(): CacheService { return this.pCache; }
  get eventBus(): EventBus { return this.pEventBus; }
  constructor(parent?: GSP) {
    this.pConfig = {
      get(key) {
        return this[key];
      }
    };
    this.pContext = new ContextManagerImplement();
    // this.pCommands = new CommandRegistry();
    this.pCache = new CacheService();
    this.pCache .set("sessionId", "default");
    this.pIde = new Ide();
    this.pEventBus = new EventBus();
  }
}
