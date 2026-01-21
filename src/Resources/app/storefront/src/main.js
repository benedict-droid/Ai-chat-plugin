import ChatWidget from './chat-widget/chat-widget';

// Initialize chat widget when DOM is ready
if (window.agenticAiConfig && window.agenticAiConfig.enabled) {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatWidget();
    });
}
