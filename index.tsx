
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * EXPOSING FLOWMD AS A SERVICE
 * This custom element allows FlowMD to be surfaced inside ClaimFlow-Direct
 * Usage in ClaimFlow: <flow-md-service patient-id="123"></flow-md-service>
 */
class FlowMDService extends HTMLElement {
  private root: ReactDOM.Root | null = null;

  connectedCallback() {
    const mountPoint = document.createElement('div');
    mountPoint.style.height = '100%';
    mountPoint.style.width = '100%';
    this.appendChild(mountPoint);

    this.root = ReactDOM.createRoot(mountPoint);
    this.render();
  }

  static get observedAttributes() {
    return ['patient-id', 'theme'];
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    if (!this.root) return;
    this.root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }
}

if (!customElements.get('flow-md-service')) {
  customElements.define('flow-md-service', FlowMDService);
}

// Still support standalone mode if index.html has #root
const standaloneRoot = document.getElementById('root');
if (standaloneRoot) {
  const root = ReactDOM.createRoot(standaloneRoot);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
