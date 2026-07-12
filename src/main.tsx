import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { PageVisibilityProvider } from './context/PageVisibilityContext';
import { parseImageViewerId } from './lib/imageHosting';
import { parsePasteViewerId } from './lib/paste';
import { ImageHostViewer } from './components/image/ImageHostViewer';
import { PasteViewer } from './components/paste/PasteViewer';

const imageViewerId = parseImageViewerId();
const pasteViewerId = parsePasteViewerId();

createRoot(document.getElementById('root')!).render(
  imageViewerId ? (
    <StrictMode>
      <AuthProvider>
        <ImageHostViewer id={imageViewerId} />
      </AuthProvider>
    </StrictMode>
  ) : pasteViewerId ? (
    <StrictMode>
      <AuthProvider>
        <PasteViewer id={pasteViewerId} />
      </AuthProvider>
    </StrictMode>
  ) : (
    <StrictMode>
      <AuthProvider>
        <PageVisibilityProvider>
          <App />
        </PageVisibilityProvider>
      </AuthProvider>
    </StrictMode>
  ),
);