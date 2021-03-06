app.factory('badge', [() => {
    function set(text, title, color, nText) {
        if (text && text.toString()) {
            chrome.browserAction.setBadgeText({text: text.toString()});
        }
        if (title && title.toString()) {
            chrome.browserAction.setTitle({title: title.toString()});
        }
        if (color) {
            chrome.browserAction.setBadgeBackgroundColor({color});
        }
        if (nText) {
            chrome.notifications.create(String(Date.now()), {
                type: 'basic',
                iconUrl: 'icon/clock.png',
                title: 'Snel',
                eventTime: Date.now(),
                message: nText
            });
        }
    }

    function clear() {
        chrome.browserAction.setBadgeText({text: ''});
    }

    function error(err) {
        set('ERR', err, '#000000');
    }

    return {
        clear,
        set,
        error
    };
}]);
