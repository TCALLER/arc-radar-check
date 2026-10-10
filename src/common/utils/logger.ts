const isProduction = process.env.NODE_ENV === 'production';

const reportError = (message: string, error?: unknown): void => {
  // TODO(monitoring): send to the client's error-tracking service once one is chosen.
  void message;
  void error;
};

export const logger = {
  debug: (message: string, data?: unknown): void => {
    if (!isProduction) console.debug(message, data);
  },
  warn: (message: string, data?: unknown): void => {
    if (!isProduction) console.warn(message, data);
  },
  error: (message: string, error?: unknown): void => {
    if (isProduction) {
      reportError(message, error);
      return;
    }
    console.error(message, error);
  },
};
