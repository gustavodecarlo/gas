/**
 * GAS - Google Analytics on Steroids
 *
 * YouTube Video Tracking Plugin
 *
 * Copyright 2011, Cardinal Path and Direct Performance
 * Licensed under the MIT license.
 *
 * @author Eduardo Cereto <eduardocereto@gmail.com>
 */

/**
 * Array of percentage to fire events.
 *
 */
var timeTriggers = [];

/**
 * Used to map each vid to a set of timeTriggers and it's pool timer
 */
var poolMaps = {}, curr_target, curr_hash;

function _ytStartPool(target) {
    
    if (timeTriggers && timeTriggers.length) {
    	
    	curr_target = target;
    	
        var h = target['getVideoData']()['video_id'];
        
        curr_hash = h;
        
        //console.log('CONFIG TIME TRIGGERS: ' + h);
        
        if (poolMaps[h]) {
            _ytStopPool(target);
        }else {
            poolMaps[h] = {};
            poolMaps[h].timeTriggers = slice.call(timeTriggers);
        }
        
       poolMaps[h].timer = setTimeout(_ytPool, 1000);
    }
}

function _ytPool() {
	
	
	//console.log("yPOOL Target: " + curr_target);
	//console.log("CHECK TIMER: " + poolMaps[curr_hash]);
	
    if (typeof(poolMaps[curr_hash]) == 'undefined' || poolMaps[curr_hash].timeTriggers.length <= 0) {
        return false;
    }
   
    var p = curr_target['getCurrentTime']() / curr_target['getDuration']() * 100;
    
    //console.log("CURR TIME: " + p);
    
    if (p >= poolMaps[curr_hash].timeTriggers[0]) {
        
        var action = poolMaps[curr_hash].timeTriggers.shift();
        
        //console.log("MAP IT! " + action);
        
        _gas.push([
            '_trackEvent',
            'YouTube Video',
            action + '%',
            curr_target['getVideoUrl']()
        ]);
    }
    
    poolMaps[curr_hash].timer = setTimeout(_ytPool, 1000);
}

function _ytStopPool(target) {
    var h = target['getVideoData']()['video_id'];
    if (poolMaps[h] && poolMaps[h].timer) {
        _ytPool(target, h); // Pool one last time before clearing it.
        clearTimeout(poolMaps[h].timer);
    }
}

/**
 * Called when the Video State changes
 *
 * We are currently tracking only finish, play and pause events
 *
 * @param {Object} event the event passed by the YT api.
 */

function _ytStateChange(event) {
    
    //console.log('CHANGE STATE TO: ' + event['data']);
    
    var action = '';
    
    switch (event['data']) {
        case 0:
            action = 'finish';
            _ytStopPool(event['target']);
            break;
        case 1:
            action = 'play';
            _ytStartPool(event['target']);
            break;
        case 2:
            action = 'pause';
            _ytStopPool(event['target']);
            break;
    }
    if (action) {
    	
    	//console.log('TrackYoutube #6: ' + action);
    	
        _gas.push(['_trackEvent',
            'YouTube Video', action, event['target']['getVideoUrl']()
        ]);
    }
}

/**
 * Called when the player fires an Error Event
 *
 * @param {Object} event the event passed by the YT api.
 */

function _ytError(event) {
    _gas.push(['_trackEvent',
        'YouTube Video',
        'error (' + event['data'] + ')',
        event['target']['getVideoUrl']()
    ]);
}

/**
 * Looks for object/embed youtube videos and migrate them to the iframe method
 *  so it tries to track them
 */

function _ytMigrateObjectEmbed() {
	
	////console.log('MIGRATE OBJECTS TO IFRAME');
	
    var objs = document.getElementsByTagName('object');
    var pars, ifr, ytid;
    var r = /(https?:\/\/www\.youtube(-nocookie)?\.com[^/]*).*\/v\/([^&?]+)/;
    
    for (var i = 0; i < objs.length; i++) { // OBJECT DIRECTLY INSERTED
        
        if(objs[i].data.indexOf('youtube')){
        	// Replace the object with an iframe
	         ytid = objs[i].data.match(r);
	        
	        if (ytid && ytid[1] && ytid[3]) {
        	
	            ifr = document.createElement('iframe');
	            ifr.src = ytid[1] + '/embed/' + ytid[3] + '?enablejsapi=1';
	            ifr.width = objs[i].width;
	            ifr.height = objs[i].height;
	            ifr.setAttribute('frameBorder', '0');
	            ifr.setAttribute('allowfullscreen', '');
	            
	            objs[i].parentNode.insertBefore(ifr, objs[i]);
	            objs[i].parentNode.removeChild(objs[i]);
	           
	            // Since we removed the object the Array changed
	            i--;
            
            	//console.log('TrackYoutube #5: ' + ifr);
           }
        }
         
        pars = objs[i].getElementsByTagName('param');
        
        for (var j = 0; j < pars.length; j++) {
        	
        	//console.log('pars.name: ' + pars[j].name);
        	//console.log('pars.value: ' + pars[j].value);
        	
            if (pars[j].name == 'movie' && pars[j].value) {
            	                
                // Replace the object with an iframe
                ytid = pars[j].value.match(r);
                
                if (ytid && ytid[1] && ytid[3]) {
                	
                    ifr = document.createElement('iframe');
                    ifr.src = ytid[1] + '/embed/' + ytid[3] + '?enablejsapi=1';
                    ifr.width = objs[i].width;
                    ifr.height = objs[i].height;
                    ifr.setAttribute('frameBorder', '0');
                    ifr.setAttribute('allowfullscreen', '');
                    
                    objs[i].parentNode.insertBefore(ifr, objs[i]);
                    objs[i].parentNode.removeChild(objs[i]);
                    // Since we removed the object the Array changed
                    i--;
                    
                    //console.log('TrackYoutube #5: ' + ifr);
                }
                break;
            }
        }
    }
}

/**
 * Triggers the YouTube Tracking on the page
 *
 * Only works for the iframe tag. The video must have the parameter
 * enablejsapi=1 on the url in order to make the tracking work.
 *
 * @param {(string|boolean)} force evaluates to true if we should force the
 * enablejsapi=1 parameter on the url to activate the api. May cause the player
 * to reload. Also converts object/embedded youtube videos to iframe.
 * @param {Array} opt_timeTriggers Array of integers from 0 to 100 that define
 * the steps to fire an event. eg: [25, 50, 75, 90].
 */
function _trackYoutube(force, opt_timeTriggers) {
	
	//console.log('TrackYoutube #1');
	
    if (force) {
        try {
            _ytMigrateObjectEmbed();
        }catch (e) {
            _gas.push(['_trackException', e,
                'GAS Error on youtube.js:_ytMigrateObjectEmbed'
            ]);
        }
    }

    var youtube_videos = [];
    var iframes = document.getElementsByTagName('iframe');
    
    //console.log('Iframes: ' + iframes.length);
    
    for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].src.indexOf('//www.youtube.com/embed') > -1) { // Its a ytplayer
        	
        	//console.log('Iframes[ ' + i + ' ]' + 'IS A YOUTUBE VIDEO');
        	
            if (iframes[i].src.indexOf('enablejsapi=1') < 0) { // HASN´T GOT enabled JS API
                if (force) {
                    // Reload the video enabling the api
                    if (iframes[i].src.indexOf('?') < 0) {
                        iframes[i].src += '?enablejsapi=1';
                    }else {
                        iframes[i].src += '&enablejsapi=1';
                    }
                }else {
                    // We can't track players that don't have api enabled.
                    continue;
                }
            }
            
            youtube_videos.push(iframes[i]);
            //console.log("GOT NEW YOUTUBE PLAYER: " + iframes[i].src);
        }
    }
    
    //console.log("YOUTUBE VIDEOS CATCHED: " + youtube_videos.length);
    
    if (youtube_videos.length > 0) {
    	 
    	//console.log('TrackYoutube IS > 0 ');
    	 
        if (opt_timeTriggers && opt_timeTriggers.length) {
            timeTriggers = opt_timeTriggers;
            
            //console.log('TrackYoutube TIMETRIGGERS: ' + timeTriggers);
        }
        
	    var p;
	    
        // this function will be called when the youtube api loads
        window['onYouTubePlayerAPIReady'] = function() {
        	
        	//console.log('TrackYoutube: ADD EVENT LISTENERS')

            for (var i = 0; i < youtube_videos.length; i++) {
            	
                p = new window['YT']['Player'](youtube_videos[i]);
                
                if(p.addEventListener){
                	
                	p.addEventListener('onStateChange', '_ytStateChange');
                	p.addEventListener('onError', '_ytError');
                	
                	//console.log('Event Listener Added: ' + p);
                }
                else if(p.attachEvent){
                	
                	 p.attachEvent('onStateChange', _ytStateChange);  
                	 p.attachEvent('onError', _ytError);
                	 
                	 //console.log('Attach Event Added: ' + p);
                }
            }
        };
        
        // load the youtube player api
        var tag = document.createElement('script');
        
        //XXX use document.location.protocol
        
        var protocol = 'http:';
        if (document.location.protocol === 'https:') {
            protocol = 'https:';
        }
        
        tag.src = protocol + '//www.youtube.com/player_api';
        tag.type = 'text/javascript';
        tag.async = true;
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}

var arr_tempo = [5, 10, 20, 35, 40, 45, 50, 75, 90];
window['_trackYoutube'] = _trackYoutube(true, arr_tempo);

