// i18n helper for SafeAI Assistant
(function () {
    const i18n = {
        currentLanguage: 'en',
        locales: {},
        enabledLanguages: ['en', 'he'],

        async init() {
            return new Promise((resolve) => {
                chrome.storage.local.get(['preferredLanguage', 'enabledLanguages'], async (result) => {
                    this.currentLanguage = result.preferredLanguage || 'en';
                    if (result.enabledLanguages) {
                        this.enabledLanguages = result.enabledLanguages;
                    }

                    await this.loadLocale(this.currentLanguage);
                    this.applyTranslations();
                    this.applyRTL();
                    resolve();
                });
            });
        },

        async loadLocale(lang) {
            try {
                const url = chrome.runtime.getURL(`locales/${lang}.json`);
                const response = await fetch(url);
                this.locales[lang] = await response.json();
            } catch (e) {
                console.error(`Failed to load locale ${lang}`, e);
                if (lang !== 'en') {
                    await this.loadLocale('en');
                }
            }
        },

        t(key, params = {}) {
            let translation = (this.locales[this.currentLanguage] || this.locales['en'] || {})[key] || key;
            for (const [k, v] of Object.entries(params)) {
                translation = translation.replace(`{${k}}`, v);
            }
            return translation;
        },

        applyTranslations() {
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                const translation = this.t(key);

                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.placeholder) {
                        el.placeholder = translation;
                    } else {
                        el.value = translation;
                    }
                } else {
                    el.textContent = translation;
                }
            });
        },

        applyRTL() {
            const isRTL = ['he', 'ar'].includes(this.currentLanguage);
            document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
            document.documentElement.lang = this.currentLanguage;

            if (isRTL) {
                document.body.classList.add('rtl');
            } else {
                document.body.classList.remove('rtl');
            }
        },

        async setLanguage(lang) {
            if (this.enabledLanguages.includes(lang)) {
                this.currentLanguage = lang;
                await this.loadLocale(lang);
                chrome.storage.local.set({ preferredLanguage: lang });
                this.applyTranslations();
                this.applyRTL();

                // Notify backend if authenticated
                chrome.storage.local.get(['authToken'], (result) => {
                    if (result.authToken) {
                        fetch('http://localhost:3000/auth/update-language', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${result.authToken}`
                            },
                            body: JSON.stringify({ language: lang })
                        }).catch(err => console.error('Failed to update language on backend', err));
                    }
                });
            }
        }
    };

    window.i18n = i18n;
    document.addEventListener('DOMContentLoaded', () => i18n.init());
})();
