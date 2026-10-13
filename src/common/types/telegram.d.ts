/** The parts of Telegram's WebApp SDK (telegram-web-app.js) this app uses. */
type TelegramColorScheme = 'light' | 'dark';

interface TelegramWebAppUser {
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramWebApp {
  /** Raw signed init data. Untrusted on the client: only the server may validate it. */
  initData: string;
  initDataUnsafe: { user?: TelegramWebAppUser };
  colorScheme: TelegramColorScheme;
  ready: () => void;
  expand: () => void;
  openLink: (url: string) => void;
  onEvent: (event: 'themeChanged', handler: () => void) => void;
  offEvent: (event: 'themeChanged', handler: () => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
  /** Bridge the Telegram apps (phone, desktop) inject into a Mini App. Absent in browsers. */
  TelegramWebviewProxy?: { postEvent: (eventType: string, eventData: string) => void };
}

/** Windows Telegram's bridge into a Mini App (absent elsewhere). */
interface External {
  notify?: (message: string) => void;
}
