// ==UserScript==
// @name         Fix Music
// @namespace    p1
// @run-at       document-start
// @version      0.4.1
// @updateURL    https://github.com/p1-BCMC/FixMusic/raw/master/FixMusic.user.js
// @downloadURL  https://github.com/p1-BCMC/FixMusic/raw/master/FixMusic.user.js
// @description  Enables ingame music playback as intended on *ALL* browsers
// @author       p1
// @match        https://boxcritters.com/play/
// @match        https://boxcritters.com/play/?*
// @match        https://boxcritters.com/play/#*
// @match        https://boxcritters.com/play/index.html
// @match        https://boxcritters.com/play/index.html?*
// @match        https://boxcritters.com/play/index.html#*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let timer = setInterval(function() {
        if (typeof world !== "undefined" && typeof world.stage !== "undefined" && typeof world.stage.room !== "undefined") {
            clearInterval(timer);
            onWorldLoaded();
        }
    }, 1000/60);

    function onWorldLoaded() {

        let audioElement;
        let isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification)); /* The browser is Safari. We need a custom player. Detection code from  https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser */

        createjs.Sound.volume = 0.5; /* We set half the volume as default! */


		if (createjs.Sound.isReady() && createjs.Sound._listeners.fileload.length == 1) {
			/* The script got injected too late! We stop the audio playback from the game, so we can re-do the playback and check if it works or not! */
			createjs.Sound.removeSound("music");
			createjs.Sound._listeners.fileload = [];

			if (isSafari) {
				setupAudioPlaybackSafari();
			} else {
                testAudioNonSafari();
            };
        } else {
			createjs.Sound.on("fileload", (function() {
				/* We stop the audio playback from the game, so we can re-do the playback and check if it works or not! */

				createjs.Sound.removeSound("music");
				createjs.Sound._listeners.fileload = [];

				if (isSafari) {
					setupAudioPlaybackSafari();
				} else {
					testAudioNonSafari();
				};
			}), this);
		};

		function testAudioNonSafari() {
			/*
			We test if the audio actually plays or gets "suspended".
			If so, we prompt the user to allow audio playback for the website in their browser.
			Side effect: As soon as the player clicks to close the notification, we can play the audio
			(browsers require website interaction for playback)!
			*/

			createjs.Sound.registerSound(world.stage.room.data.music, "music");
			createjs.Sound.on("fileload", (function() {
				createjs.Sound._listeners.fileload = [];
				let testPlayer = createjs.Sound.play("music", {
					loop: -1
				});
				if (testPlayer.sourceNode.context.state == "suspended") {
					/* We need to prompt the user. */
					onclick = function() {
						testPlayer = createjs.Sound.play("music", {
							loop: -1
						});
						onclick = function() {};
					};
					setupAudioUserPrompt();
				};
			}), this);
		};

        function setupAudioPlaybackSafari() {

	    audioElement = document.createElement("AUDIO");
            audioElement.src = world.stage.room.data.music;
            audioElement.loop = true;
            audioElement.volume = 0.5;
            audioElement.preload = true;
            audioElement.defaultMuted = false;
            audioElement.crossOrigin = "anonymous";
            audioElement.autoplay = true;

            var audioPromise = audioElement.play();
            if (audioPromise !== undefined) {
                audioPromise.then(_ => {/* Autoplay is working! */}).catch(_ => {
                    onclick = function() {
                        audioElement.play();
                        onclick = function() {};
                    };
                    setupAudioUserPrompt();
                });
            };
        };

        function setupAudioUserPrompt() {
            let helpText = "";
            if (isSafari) {
                helpText = "Right click on the address bar, click on 'Settings for this website' and set 'Automatic playback' to 'Allow for all media'.";
            } else if ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
                /* Opera Browser */
                helpText = "Click on the lock symbol next to the address bar, click on 'Website settings' and set 'Sound' to 'Allow'.";
            } else if (typeof InstallTrigger !== 'undefined') {
                /* Firefox */
                helpText = "Click on the lock symbol next to the address bar, click on the dropdown menu for 'Autoplay' and select 'Allow Audio and Video'.";
            } else if (!(!!document.documentMode) && !!window.StyleMedia) {
                /* Edge */
                helpText = "Click on the lock symbol next to the address bar, click on 'Media autoplay settings' and select 'Allow' from the dropdown menu.";
            } else if (!!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)) {
                /* Chrome */
                helpText = "Click on the green lock symbol next to the address bar, click on the dropdown menu for 'Sound' and select 'Allow'.";
            };

            let audioWarning = new box.Alert("Please enable automatic audio playback for this website in your browser! " + helpText);
            audioWarning.centerTo(world.stage);
            audioWarning.y = 20;
            audioWarning.on("click", (function() {
                audioWarning.remove();
            }), world.stage);
            world.stage.addChild(audioWarning);
            world.stage.children[world.stage.children.length - 1].name = "audioWarning";
        };

        world.on("joinRoom", function() {
            if (world.stage.getChildByName("audioWarning") != undefined) {
                world.stage.getChildByName("audioWarning").remove();
            };

            if (isSafari) {
                createjs.Sound.removeSound("music");
                createjs.Sound._listeners.fileload = [];
                audioElement.pause();
                if (world.stage.room.data.music != undefined) {
                    audioElement.src = world.stage.room.data.music;
                    audioElement.play();
                };
            };
        });


    };
})();
