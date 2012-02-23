/**
 * GAS - Google Analytics on Steroids
 *
 * HTML5 Video Tracking Plugin
 *
 * Copyright 2011, Cardinal Path
 * Licensed under the MIT license.
 *
 * @author Eduardo Cereto <eduardocereto@gmail.com>
 */

 /**
 * Array of percentage to fire events.
 *
 */
var mediaTime = [];

/**
 * Used to map each media to a set of mediaTime and it's pool timer
 */
var poolMedia = {};

function _trackMediaStart(target,e) {
    if (mediaTime && mediaTime.length) {
		var h = target['currentSrc'];
		if (poolMedia[h]) {
            _stopMediaTime(target);
        }else {
			poolMedia[h] = {};
			poolMedia[h].mediaTime = slice.call(mediaTime);
		}
		poolMedia[h].timer = setTimeout(_trackMediaTime, 1000, target, h);
	}
}

function _trackMediaTime(target, hash) {
	if (poolMedia[hash] == undefined ||
        poolMedia[hash].mediaTime.length <= 0) {
        return false;
    }
	var tempo = (target.currentTime *100) / target.duration;
	if (tempo >= poolMedia[hash].mediaTime[0]){
		_gas.push(['_trackEvent', target.tagName, poolMedia[hash].mediaTime[0]+"%", target.currentSrc]);
		poolMedia[hash].mediaTime.shift();
	}
	poolMedia[hash].timer = setTimeout(_trackMediaTime, 1000, target, hash);
}

function _stopMediaTime(target) {
	var h = target['currentSrc'];
	if (poolMedia[h] && poolMedia[h].timer) {
        _trackMediaTime(target, h); // Pool one last time before clearing it.
        clearTimeout(poolMedia[h].timer);
    }
}

/**
 * Used to trigger only one volumechange per second
 */
var _mediaVolume = true;

function _trackMediaVolume(e) {
	function _volumeChange() {
		_mediaVolume = true;
	}
	if (_mediaVolume) {
		_gas.push(['_trackEvent', this.tagName, 'volumechange', this.currentSrc]);
		_mediaVolume = false;
		setTimeout(_volumeChange, 1000);
	}
}

/**
 * Triggers the actual video/audio GA events
 *
 * To be used as a callback for the HTML5 media events
 *
 * @param {Event} e A reference to the HTML event fired.
 * @this {HTMLMediaElement} The HTML element firing the event
 */
function _trackMediaElement(e) {
    _gas.push(['_trackEvent', this.tagName, e.type, this.currentSrc]);
	if (e.type === "play") {
		_trackMediaStart(e['target'],e);
	}
}

/**
 * Triggers the HTML5 Video Tracking on the page

 * @param {String} tag Either 'audio' or 'video'.
 * @this {GasHelper} GA Helper object.
 */
function _trackMedia(tag, opt_timeTriggers) {
    var self = this;
    self._DOMReady(function() {
        var vs = document.getElementsByTagName(tag);
        for (var i = 0; i < vs.length; i++) {
            self._addEventListener(vs[i], 'play', _trackMediaElement);
            self._addEventListener(vs[i], 'ended', _trackMediaElement);
            self._addEventListener(vs[i], 'pause', _trackMediaElement);
			self._addEventListener(vs[i], 'volumechange', _trackMediaVolume);
        }
    });
}

function _trackVideo(opt_timeTriggers) {
	if (opt_timeTriggers && opt_timeTriggers.length) {
		mediaTime = opt_timeTriggers;
	}
    _trackMedia.call(this, 'video');
}

function _trackAudio(opt_timeTriggers) {
	if (opt_timeTriggers && opt_timeTriggers.length) {
		mediaTime = opt_timeTriggers;
	}
    _trackMedia.call(this, 'audio');
}

_gas.push(['_addHook', '_trackVideo', function() {
	var args = slice.call(arguments);
    var gh = this;
    gh._DOMReady(function() {
        _trackVideo.apply(gh, args);
    });
    return false;
}]);

_gas.push(['_addHook', '_trackAudio', function() {
    var args = slice.call(arguments);
    var gh = this;
    gh._DOMReady(function() {
        _trackAudio.apply(gh, args);
    });
    return false;
}]);