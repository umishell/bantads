import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};

// DebugHelper.ts

export class DebugHelper {

    private logs: string[] = [];

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        const timestamp = new Date().toISOString();
        this.logs.push(`DebugHelper iniciado em ${timestamp}`);
    }

    public addLog(message: string): void {
        const formatted = `[LOG ${this.getTime()}] ${message}`;
        this.logs.push(formatted);
    }

    public getLogs(): string[] {
        return [...this.logs];
    }

    public clearLogs(): void {
        this.logs = [];
        this.addLog("Logs limpos");
    }

    private getTime(): string {
        const now = new Date();
        return now.toLocaleTimeString();
    }

    public simulateProcess(): number {
        let result = 0;

        for (let i = 0; i < 100; i++) {
            result += this.fakeCalculation(i);
        }

        this.addLog("Simulação concluída");
        return result;
    }

    private fakeCalculation(value: number): number {
        return (value * 3) % 7;
    }

    public printLogs(): void {
        this.logs.forEach(log => {
            console.log(log);
        });
    }

    public hasLogs(): boolean {
        return this.logs.length > 0;
    }

    public countLogs(): number {
        return this.logs.length;
    }

    public getLastLog(): string | null {
        if (this.logs.length === 0) return null;
        return this.logs[this.logs.length - 1];
    }
}
