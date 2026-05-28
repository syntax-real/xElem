import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { DynamicIslandProvider, DynamicIsland } from './System/Context/DynamicIsland';
import { WebSocketProvider } from './System/Context/WebSocket';
import { MusicModalProvider } from './System/Context/MusicModal';
import store from './Store/store';
import AudioPlayer from './Components/AudioPlayer';
import ImageView from './Components/ImageView';
import { DatabaseProvider } from './System/Context/Database';
import Notifications from './Components/Notifications';
import ErrorBoundary from './System/Components/ErrorBoundary';
import ModalsRenderer from './Components/Modals/ModalsRenderer';
import { StrictMode } from 'react';
import { errorReporter } from './System/Services/ErrorReporter.js';
import WindowsRenderer from './Components/Windows/WindowsRenderer.js';
import { ToastNotifications } from './Components/ToastNotifications.js';
import { configureLogger } from './Utils/Logger.js';
import { CallProvider } from './System/Context/CallContext';

window.onerror = (message, filename, lineno, colno, error) => {
  errorReporter.sendJSError(String(message), filename, lineno, colno, error);
  return false;
};

window.addEventListener('unhandledrejection', (event) => {
  errorReporter.sendUnhandledRejection(event.reason);
});

configureLogger({
  level: 'DEBUG',
  modules: null
});

console.log(`%c██████╗ ██╗     ███████╗███╗   ███╗███████╗███╗   ██╗████████╗
██╔════╝ ██║     ██╔════╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝
█████╗   ██║     █████╗  ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   
██╔══╝   ██║     ██╔══╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   
███████╗ ███████╗███████╗██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   
╚══════╝ ╚══════╝╚══════╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   

%celemsocial.com - Приватная социальная сеть
%cМузыка без ограничений | Шифрованные сообщения! | Свобода слова!

%cИнтересуешься разработкой? Присоединяйся к команде!
%cgithub:github.com/Xaromie/Element | Email: elemsupport@proton.me
`, 'color: white; font-weight: bold; font-family: monospace;', 'color: #8b5cf6; font-size: 14px; font-weight: bold;', 'color: #6366f1; font-size: 12px;', 'color: #10b981; font-size: 12px; font-weight: bold;', 'color: #64748b; font-size: 11px;');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('%cService Worker активирован', 'color: #10b981; font-weight: bold;'))
    .catch(err => console.error('❌ Ошибка Service Worker:', err));
}

const rootElement = document.getElementById('root') as HTMLElement;

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <DatabaseProvider>
        <Provider store={store}>
          <BrowserRouter>
            <DynamicIslandProvider>
              <WebSocketProvider>
                <CallProvider>
                <MusicModalProvider>
                  <DynamicIsland />
                  <App />
                  <AudioPlayer />
                  <ImageView />
                  <Notifications />
                  <ToastNotifications />
                  <ModalsRenderer />
                  <WindowsRenderer />
                </MusicModalProvider>
                </CallProvider>
              </WebSocketProvider>
            </DynamicIslandProvider>
          </BrowserRouter>
        </Provider>
      </DatabaseProvider>
    </ErrorBoundary>
  </StrictMode>
);