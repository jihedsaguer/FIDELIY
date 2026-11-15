import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { AuthProvider } from '../features/auth/AuthProvider';
import { store as appStore, type AppStore } from './store';
import { I18nProvider } from '../shared/i18n/i18n';

export function AppProviders({
  children,
  store = appStore,
}: {
  children: ReactNode;
  store?: AppStore;
}) {
  return (
    <Provider store={store}>
      <I18nProvider><AuthProvider>{children}</AuthProvider></I18nProvider>
    </Provider>
  );
}
