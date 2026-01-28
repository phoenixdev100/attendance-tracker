import { useState, useEffect } from 'react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="install-prompt-container">
            <div className="install-prompt">
                <div className="install-content">
                    <span className="install-icon">📱</span>
                    <div className="install-text">
                        <strong>Install App</strong>
                        <span>Install for better experience</span>
                    </div>
                </div>
                <button onClick={handleInstallClick} className="btn-install">
                    Install
                </button>
                <button onClick={() => setIsVisible(false)} className="btn-close-prompt">
                    ✕
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
