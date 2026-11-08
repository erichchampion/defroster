import { registerServiceWorker } from '@/lib/utils/register-sw';

interface MockRegistration {
  installing?: { scriptURL: string } | null;
  waiting?: { scriptURL: string } | null;
  active?: { scriptURL: string } | null;
  unregister: jest.Mock;
}

const makeRegistration = (overrides: Partial<MockRegistration> = {}): MockRegistration => ({
  installing: null,
  waiting: null,
  active: null,
  unregister: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const setServiceWorkerApi = (
  getRegistrations: jest.Mock,
  register: jest.Mock
): void => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations, register },
  });
};

describe('registerServiceWorker', () => {
  it('unregisters foreign service workers on this origin and registers the messaging SW', async () => {
    const foreign = makeRegistration({
      active: { scriptURL: 'http://localhost:3000/old-pwa-sw.js' },
    });
    const register = jest.fn().mockResolvedValue({ scope: '/' });
    setServiceWorkerApi(jest.fn().mockResolvedValue([foreign]), register);

    await registerServiceWorker();

    expect(foreign.unregister).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
  });

  it('keeps an existing messaging service worker registration', async () => {
    const ours = makeRegistration({
      active: { scriptURL: 'http://localhost:3000/firebase-messaging-sw.js' },
    });
    const register = jest.fn().mockResolvedValue({ scope: '/' });
    setServiceWorkerApi(jest.fn().mockResolvedValue([ours]), register);

    await registerServiceWorker();

    expect(ours.unregister).not.toHaveBeenCalled();
    expect(register).toHaveBeenCalled();
  });

  it('inspects installing/waiting scripts when there is no active worker', async () => {
    const staleWaiting = makeRegistration({
      waiting: { scriptURL: 'http://localhost:3000/legacy-sw.js' },
    });
    const register = jest.fn().mockResolvedValue({ scope: '/' });
    setServiceWorkerApi(jest.fn().mockResolvedValue([staleWaiting]), register);

    await registerServiceWorker();

    expect(staleWaiting.unregister).toHaveBeenCalled();
  });

  it('returns null without throwing when service workers are unsupported', async () => {
    try {
      // @ts-expect-error removing the polyfill from the other tests
      delete navigator.serviceWorker;
    } catch {
      // jsdom may define it non-configurable
    }

    await expect(registerServiceWorker()).resolves.toBeNull();
  });
});
