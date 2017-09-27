import { Platform } from 'react-native';
import * as watch from 'react-native-watch-connectivity';

import { APP_WILL_MOUNT, appNavigate } from '../../app';
import { getInviteURL } from '../../base/connection';
import { setAudioMuted } from '../../base/media';
import {
    MiddlewareRegistry,
    StateListenerRegistry,
    toState
} from '../../base/redux';
import { toURLString } from '../../base/util';

import { setConferenceURL, setMicMuted, setRecentUrls } from './actions';

const logger = require('jitsi-meet-logger').getLogger(__filename);

const watchOSEnabled = Platform.OS === 'ios';

// Handles the recent URLs state sent to the watch
watchOSEnabled && StateListenerRegistry.register(
    /* selector */ state => state['features/recent-list'],
    /* listener */ (recentListState, { dispatch, getState }) => {
        dispatch(setRecentUrls(recentListState));
        _updateApplicationContext(getState);
    });

// Handles the mic muted state sent to the watch
watchOSEnabled && StateListenerRegistry.register(
    /* selector */ state => _isAudioMuted(state),
    /* listener */ (isAudioMuted, { dispatch, getState }) => {
        dispatch(setMicMuted(isAudioMuted));
        _updateApplicationContext(getState);
    });

// Handles the conference URL state sent to the watch
watchOSEnabled && StateListenerRegistry.register(
    /* selector */ state => _getCurrentConferenceUrl(state),
    /* listener */ (currentUrl, { dispatch, getState }) => {
        dispatch(setConferenceURL(currentUrl));
        _updateApplicationContext(getState);
    });

// FIXME There's a mystery why this middleware gets the APP_WILL_MOUNT
//  action multiple times which is registers the watch msg subscriber multiple
//  times.
let appMounted = false;

/**
 * Middleware that captures conference actions.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
watchOSEnabled && MiddlewareRegistry.register(
({ dispatch, getState }) => next => action => {
    switch (action.type) {
    case APP_WILL_MOUNT: {
        if (!appMounted) {
            _appWillMount({
                dispatch,
                getState
            });
            appMounted = true;
        }
        break;
    }
    }

    return next(action);
});

/**
 * Registers listeners to the react-native-watch-connectivity lib.
 *
 * @param {Store} store - The redux store.
 * @private
 * @returns {void}
 */
function _appWillMount({ dispatch, getState }) {

    watch.subscribeToWatchState((error, watchState) => {
        if (error) {
            logger.error('Error getting watchState', error);

            return;
        }

        if (watchState.toLowerCase() === 'activated') {
            _updateApplicationContext(getState);
        }
    });

    watch.subscribeToMessages((error, message) => {
        if (error) {
            logger.error('watch.subscribeToMessages error:', error);

            return;
        }

        switch (message.command) {
        case 'joinConference': {
            const newConferenceURL = message.data;
            const oldConferenceURL = _getCurrentConferenceUrl(getState());

            if (oldConferenceURL !== newConferenceURL) {
                dispatch(appNavigate(newConferenceURL));
            }
            break;
        }
        case 'toggleMute':
            dispatch(
                setAudioMuted(
                    !_isAudioMuted(getState),
                    /* ensureTrack */ true));
            break;
        case 'hangup':
            if (_getCurrentConferenceUrl(getState()) !== 'NULL') {
                dispatch(appNavigate(undefined));
            }
            break;
        }
    });
}

/**
 * Figures out what's the current conference URL which is supposed to indicate
 * what conference is currently active. When not currently in any conference
 * and not trying to join any then the 'NULL' string value is returned.
 *
 * @param {Object|Function} stateful - Either the whole Redux state object or
 * the Redux store's {@code getState} method.
 * @returns {string}
 * @private
 */
function _getCurrentConferenceUrl(stateful) {
    const state = toState(stateful);
    const { locationURL } = state['features/base/config'];
    let currentUrl;

    if (locationURL) {
        currentUrl = toURLString(locationURL);
    }

    if (!currentUrl) {
        const inviteUrl = getInviteURL(state);

        currentUrl = toURLString(inviteUrl);
    }

    // NOTE is there no reliable way in the app to figure out what's the current
    // conference (including the load config phase) ?

    // Check if the URL doesn't end with a slash
    if (currentUrl && currentUrl.substr(-1) === '/') {
        currentUrl = null;
    }

    return currentUrl ? currentUrl : 'NULL';
}

/**
 * Determines the audio muted state to be sent to the apple watch.
 *
 * @param {Object|Function} stateful - Either the whole Redux state object or
 * the Redux store's {@code getState} method.
 * @returns {boolean}
 * @private
 */
function _isAudioMuted(stateful) {
    const state = toState(stateful);
    const { audio } = state['features/base/media'];

    return audio.muted;
}

/**
 * Sends the context to the watch os app. At the time of this writing it's
 * the entire state of the 'features/mobile/watchos' reducer.
 *
 * @param {Object|Function} stateful - Either the whole Redux state object or
 * the Redux store's {@code getState} method.
 * @private
 * @returns {void}
 */
function _updateApplicationContext(stateful) {
    const state = toState(stateful);
    const context = state['features/mobile/watchos'];

    try {
        watch.updateApplicationContext(context);
    } catch (error) {
        logger.error('Failed to stringify or send the context', error);
    }
}
