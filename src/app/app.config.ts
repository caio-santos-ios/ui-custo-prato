import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { routes } from './app.routes';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideToastr({
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
      timeOut: 3500,
    }),
    provideEnvironmentNgxMask(),
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
