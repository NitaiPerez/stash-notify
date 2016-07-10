/**
 * Created by Nitai J. Perez
 * nitai.perez@ironsrc.com
 * 14/07/2015.
 */

var pullRequestsURL = '/rest/inbox/latest/pull-requests?role=reviewer&start=0&limit=10&avatarSize=64&state=OPEN&order=oldest';
var myPullRequestsURL = '/rest/inbox/latest/pull-requests?role=author&start=0&limit=10&avatarSize=64&state=OPEN&order=oldest';
var whoAmI = '/plugins/servlet/applinks/whoami';


function filterResult(data) {

    // Open tasks:
    if (localStorage["_hide_pr_with_tasks"] == "true") {
        data.values = _.filter(data.values, (pr) => {
            return !(
                pr['attributes']['openTaskCount']
                && (pr['attributes']['openTaskCount'] != "0")
            );
        });
    }

    // Scrum master:
    if (localStorage["_scrum_master"] == "true"
        && me()
    ) {
        data.values = _.filter(data.values, (pr) => {
            // If I'm the only reviewer, display:
            if (pr["reviewers"].length == 1) return true;
            // Else, if at least one other had reviewed:
            return _.some(pr["reviewers"], (rev) => {
                return (
                    rev['approved'] == true
                    && rev['user']['name'] != me()
                );
            });
        });
    }
    data.size = data.values.length;
    //return data;
    return data;
}


function getMyRequestsData() {

    var uri = host(myPullRequestsURL);

    return najax(uri)
        .then(JSON.parse)
        .then(getTasks)
        .then(getMergeStatus)
        .then((res) => {
            localStorage.prDataMine = JSON.stringify(res);
            return res;
        })
        .catch(errHandle);
}

var notifyPullRequests = _.throttle((PRData) => {
    if (PRData && PRData.values && localStorage["_notifyPRs"] == "true" && !(localStorage['snooze_all'] > Date.now())) {
        PRData.values.forEach(notifyPullRequest);
    }
    return Promise.resolve();
}, localStorage["_notifyInterval"], {});

function notifyPullRequest(pr) {

    var prID = pr.links.self[0].href;

    // Quit if snoozed:
    if (localStorage['snooze.' + prID] > Date.now()) return;

    // Don't show if no repeat:
    if (localStorage["_repeatUntilNoticed"] == "once"
        && localStorage["notif." + prID])
        return;

    // Don't show if clicked:
    if (localStorage["_repeatUntilNoticed"] == "click"
        && localStorage["click." + prID])
        return;

    // Prepare buttons:
    var buttons = [];
    if (!(localStorage["_snooze_this_btn"] == 'true')) {
        buttons.push({title: "Snooze this Pull Request", iconUrl: "/assets/snooze.svg"});
    }
    if (!(localStorage["_snooze_all_btn"] == 'true')) {
        buttons.push({title: "Snooze all", iconUrl: "/assets/zzz.svg"});
    }

    chrome.notifications.clear(prID, null);
    chrome.notifications.create(prID, {
        type: "basic",
        message: pr.title,
        title: pr['author']['user']['displayName'],
        iconUrl: host(pr['author']['user']['avatarUrl'].split("?")[0]),
        buttons: buttons
    }, () => {
        // Mark as shown:
        if (localStorage["notif." + prID] != 1) {
            //noinspection JSCheckFunctionSignatures
            chrome.notifications.onClicked.addListener((prID) => {
                window.open(prID);
                localStorage["click." + prID] = 1;
            });

            //noinspection JSCheckFunctionSignatures
            chrome.notifications.onButtonClicked.addListener((prID, buttonIndex) => {
                    switch (buttonIndex) {
                        case 0: // Snooze THIS!
                            localStorage['snooze.' + prID] = Date.now() + Number(localStorage["_snooze_duration"].replace(/"/g, ''));
                            break;
                        case 1: // Snooze ALL!
                            localStorage['snooze_all'] = Date.now() + Number(localStorage["_snooze_duration"].replace(/"/g, ''));
                            dismissAllNotifications();
                            break;
                    }
                }
            );
        }
        localStorage["notif." + prID] = 1;
    });
}