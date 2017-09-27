import {
    SET_CONFERENCE_URL,
    SET_MIC_MUTED,
    SET_RECENT_URLS
} from './actionTypes';

/**
 * Updates the watch about the current conference URL. The 'NULL' string is
 * used when not in a conference.
 *
 * @param {string} conferenceURL - The new conference URL to be set.
 * @returns {{
 *     type,
 *     conferenceURL: string
 * }}
 */
export function setConferenceURL(conferenceURL) {
    return {
        type: SET_CONFERENCE_URL,
        conferenceURL
    };
}

/**
 * Updates the watch about the microphone muted state.
 *
 * @param {boolean} micMuted - Whether or not the microphone is muted.
 * @returns {{
 *     micMuted: boolean,
 *     type: SET_MIC_MUTED
 * }}
 */
export function setMicMuted(micMuted) {
    return {
        type: SET_MIC_MUTED,
        micMuted
    };
}

/**
 * Updates the watch about recent meetings state.
 *
 * @param {Objects} recentURLs - The state structure as defined by
 * the 'features/recent-list' reducer (an Array at the time of this writing).
 * @returns {{
 *     micMuted: boolean,
 *     type: SET_MIC_MUTED
 * }}
 */
export function setRecentUrls(recentURLs) {
    return {
        type: SET_RECENT_URLS,
        recentURLs
    };
}
