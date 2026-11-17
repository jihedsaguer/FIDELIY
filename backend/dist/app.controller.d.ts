import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHealth(): {
        status: string;
        timestamp: string;
        phase: string;
    };
    getInfo(): {
        app: string;
        phase: string;
        status: string;
    };
}
//# sourceMappingURL=app.controller.d.ts.map