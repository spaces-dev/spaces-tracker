import videojs from 'video.js';
import { VASTClient, VASTTracker, VASTParser } from '@dailymotion/vast-client';
import { silentPromise } from '../utils';
import {
  injectScriptTag, getLocalISOString, convertTimeOffsetToSeconds, fetchVmapUrl,
} from './lib';
import {
  getMidrolls, getPostroll, getPreroll, getBestCtaUrl,
  getBestMediaFile,
  formatTime, applyNonLinearCommonDomStyle, getCloseButton, sanitizeHtml, isNumeric, appendToSlotOrPlayer
} from './lib/utils';

const Plugin = videojs.getPlugin('plugin');

const playerEvents = [
  { event: 'adplaying', handler: 'onAdPlay' },
  { event: 'adpause', handler: 'onAdPause' },
  { event: 'adtimeupdate', handler: 'onAdTimeUpdate' },
  { event: 'advolumechange', handler: 'onAdVolumeChange' },
  { event: 'adfullscreen', handler: 'onAdFullScreen' },
  { event: 'adstart', handler: 'onAdStart' },
  { event: 'aderror', handler: 'onAdError' },
  { event: 'skip', handler: 'onSkip' },
  { event: 'adended', handler: 'onAdEnded' },
  { event: 'dispose', handler: 'onDispose' },
];

const SKIP_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor" class="vjs-vast-skip-button-icon">
    <path d="M660-240v-480h80v480h-80Zm-440 0v-480l360 240-360 240Z"/>
  </svg>
`;

const MUTE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor">
    <path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Z"/>
  </svg>
`;

const SOUND_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 -960 960 960" fill="currentColor">
    <path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320Z"/>
  </svg>
`;

class Vast extends Plugin {
  player;
  vastContainer;
  vastPlayer;
  vastPlayerProgress;
  vastPlayerProgressLabel;
  vastPlayerTimeoutTimer;
  vastPlayerStartedPlaying;
  allowPauseOnBlur;
  adsArray;
  totalAdsCount;

  constructor(player, options) {
    super(player, options);
    this.player = player;

    // Load the options with default values
    const defaultOptions = {
      vastUrl: false,
      vmapUrl: false,
      verificationTimeout: 2000,
      addCtaClickZone: true,
      addSkipButton: true,
      translation: {
        skipButtonText: 'Skip',
        adsSingleLabel: 'Advertistment: {timeLeft}',
        adsMultiLabel: '{current} of {total}: {timeLeft}'
      },
      debug: false,
      timeout: 5000,
      loadVideoTimeout: 8000,
      isLimitedTracking: false,
    };

    this.vastContainer = document.createElement('div');
    this.vastContainer.classList.add('vjs-vast');
    this.player.el().appendChild(this.vastContainer);

    // Assign options that were passed in by the consumer
    this.options = {
      ...defaultOptions,
      ...options,
      translation: {
        ...defaultOptions.translation,
        ...options.translation,
      },
    };

    if (this.options.addCtaClickZone) {
      // add the cta click
      this.vastContainer.addEventListener('click', () => {
        if (!this.vastPlayer)
          return;
        this.allowPauseOnBlur = true;
        this.adClickCallback(this.ctaUrl);
      });
    }

    this.setMacros();

    // Init an empty array that will later contain the ads metadata
    this.adsArray = [];
    this.totalAdsCount = 0;

    // array of nonlinear or companions dom element
    this.domElements = [];
    // array of icons dom containers
    this.iconContainers = [];

    this.adBreakType = null;
    this.isAdPlaying = false;
    this.isContentStarted = false;
    this.isContentEnded = false;
    this.hasPreroll = true;
    this.postroll = null;

    this.prerollAds = options.vmapUrl ? this.handleVMAP(options.vmapUrl) : this.handleVAST(options.vastUrl);
    this.addEventsListeners();
  }

  isAdBreakActive() {
    return !!this.adBreakType;
  }

  startAdBreak(type) {
    this.adBreakType = type;
    this.player.pause();
    this.player.addClass('vjs-vast-loading');
  }

  endAdBreak() {
    const type = this.adBreakType;
    this.adBreakType = null;
    this.player.removeClass('vjs-vast-loading');
    if (this.isAdPlaying) {
      this.isAdPlaying = false;
      this.player.removeClass('vjs-ad-playing');
      this.player.trigger('adend');
    }
    this.player.trigger('vast.adBreakEnd');
    if (type !== 'postroll')
      silentPromise('[vast] resume content', this.player.play());
  }

  async playAdBreakWithTimeout(type, adsLoading) {
    this.startAdBreak(type);
    const { ads, error } = await Promise.race([
      adsLoading,
      new Promise((resolve) => setTimeout(() => resolve({ ads: [], error: 'VastVjs: Timeout' }), this.options.timeout)),
    ]);

    if (!this.player)
      return;

    if (error)
      this.player.trigger('vast.error', { message: error });

    if (ads.length) {
      this.readAds(ads);
    } else {
      this.endAdBreak();
    }
  }

  readAds(ads) {
    this.adsArray = ads;
    this.totalAdsCount = ads.length;
    this.readAd();
  }

  loadAdBreakAds(vastUrl, vastData) {
    return vastUrl ? this.handleVAST(vastUrl) : this.parseInlineVastData(vastData);
  }

  setMacros(newMacros = undefined) {
    const { options } = this;
    if (!newMacros) {
      // generate unique int from current timestamp
      const cacheBuster = parseInt(Date.now().toString().slice(-8), 10);
      const ts = getLocalISOString(new Date());
      this.macros = {
        CACHEBUSTING: cacheBuster,
        TIMESTAMP: ts,
        PAGEURL: (window.location !== window.parent.location)
          ? document.referrer
          : document.location.href,
        // PODSEQUENCE: '',
        // UNIVERSALADID: '',
        // ADTYPE: '',
        // ADSERVINGID: '',
        // ADCATEGORIES: '',
        LIMITADTRACKING: options.isLimitedTracking,
      };
    } else {
      this.macros = {
        ...this.macros,
        ...newMacros,
      };
    }
  }

  async handleVAST(vastUrl) {
    // Now let's fetch some adsonp
    this.vastClient = new VASTClient();
    try {
      const response = await this.vastClient.get(vastUrl, {
        allowMultipleAds: true,
        resolveAll: true,
      });
      const ads = response.ads ?? [];
      return {
        ads,
        error: ads.length ? null : 'VastVjs: Empty VAST XML',
      };
    } catch (err) {
      console.error(err);
      return {
        ads: [],
        error: 'VastVjs: Error while fetching VAST XML',
      };
    }
  }

  removeDomElements() {
    // remove icons
    this.domElements.forEach((domElement) => {
      domElement.remove();
    });
  }

  readAd() {
    const currentAd = this.getNextAd();
    if (!currentAd) {
      console.warn("getNextAd is null o_O");
      return;
    }

    const linearCreative = currentAd.linearCreative();
    this.allowPauseOnBlur = false;

    if (currentAd.hasLinearCreative()) {
      // Retrieve the CTA URl to render
      this.ctaUrl = getBestCtaUrl(linearCreative);
      this.debug('ctaUrl', this.ctaUrl);

      this.player.trigger('vast.metadata', {
        duration: linearCreative.duration,
        id: linearCreative.id,
        adId: linearCreative.adId,
        type: linearCreative.type,
      });
      this.linearVastTracker = new VASTTracker(
        this.vastClient,
        currentAd.ad,
        linearCreative,
      );
      this.linearVastTracker.on('firstQuartile', () => {
        this.debug('firstQuartile');
      });
      this.linearVastTracker.on('midpoint', () => {
        this.debug('midpoint');
      });
      this.createVastPlayer();
      this.addIcons(currentAd);
      this.addSkipButton(linearCreative);
      this.addMuteButton();
      // We now check if verification is needed or not, if it is, then we import the
      // verification script with a timeout trigger. If it is not, then we simply display the ad
      // by calling playAd
      if ('adVerifications' in currentAd.ad && currentAd.ad.adVerifications.length > 0) {
        // Set a timeout for the verification script - accortding to the IAB spec, we should do
        // a best effort to load the verification script before the actual ad, but it should not
        // block the ad nor the video playback
        const verificationTimeout = setTimeout(() => {
          this.playLinearAd(linearCreative);
        }, this.options.verificationTimeout);

        // Now for each verification script, we need to inject a script tag in the DOM and wait
        // for it to load
        let index = 0;
        this.setMacros({
          OMIDPARTNER: `${currentAd.ad.adVerifications[index].vendor ?? 'unknown'}`,
        });
        const scriptTagCallback = () => {
          index += 1;
          if (index < currentAd.ad.adVerifications.length) {
            injectScriptTag(
              currentAd.ad.adVerifications[index].resource,
              scriptTagCallback,
              // eslint-disable-next-line no-use-before-define
              scriptTagErrorCallback,
            );
          } else {
            // Once we are done with all verification tags, clear the timeout timer and play the ad
            clearTimeout(verificationTimeout);
            this.playLinearAd(linearCreative);
          }
        };
        const scriptTagErrorCallback = () => {
          // track error
          this.linearVastTracker.verificationNotExecuted(
            currentAd.ad.adVerifications[index].vendor,
            { REASON: 3 },
          );
          // load next script
          scriptTagCallback();
        };
        injectScriptTag(
          currentAd.ad.adVerifications[index].resource,
          scriptTagCallback,
          scriptTagErrorCallback,
        );
      } else {
        // No verification to import, just run the add
        this.playLinearAd(linearCreative);
      }
    } else {
      this.endAdBreak();
    }
    if (currentAd.hasNonlinearCreative()) {
      this.cleanupReadAdListeners();
      const nonlinearEvent = currentAd.hasLinearCreative() ? 'adplaying' : 'playing';
      this.onNonLinearReady = () => {
        this.nonLinearVastTracker = new VASTTracker(this.vastClient, currentAd.ad, currentAd.nonlinearCreative(), 'NonLinearAd');
        this.playNonLinearAd(currentAd.nonlinearCreative());
      };
      this.player.one(nonlinearEvent, this.onNonLinearReady);
    }
    if (currentAd.hasCompanionCreative()) {
      const companionEvent = currentAd.hasLinearCreative() ? 'adplaying' : 'playing';
      this.onCompanionReady = () => {
        this.companionVastTracker = new VASTTracker(this.vastClient, currentAd.ad, currentAd.companionCreative(), 'CompanionAd');
        this.playCompanionAd(currentAd.companionCreative());
      };
      this.player.one(companionEvent, this.onCompanionReady);
    }
  }

  /*
  * This method is responsible for retrieving the next ad to play from all the ads present in the
  * VAST manifest.
  * Please be aware that a single ad can have multple types of creatives.
  * A linear add for example can come with a companion ad and both can should be displayed.
  */
  getNextAd() {
    if (this.adsArray.length === 0) {
      return null;
    }
    const nextAd = this.adsArray.shift();
    const linear = nextAd.creatives.find((c) => c.type === 'linear');
    const companion = nextAd.creatives.find((c) => c.type === 'companion');
    const nonlinear = nextAd.creatives.find((c) => c.type === 'nonlinear');

    const hasValidLinear = linear
      && linear.mediaFiles.length > 0
      && linear.mediaFiles.some((mf) => mf.fileURL !== '');

    return {
      ad: nextAd,
      hasLinearCreative: () => !!hasValidLinear,
      linearCreative: () => linear,
      hasCompanionCreative: () => !!companion,
      companionCreative: () => companion,
      hasNonlinearCreative: () => !!nonlinear,
      nonlinearCreative: () => nonlinear,
    };
  }

  onPageVisibilityChange = (e) => {
    if (document.hidden) {
      this.onPageUnfocus(e);
    } else {
      this.onPageFocus(e);
    }
  }

  onPageFocus = (_e) => {
    if (this.vastPlayer && this.vastPlayer.paused)
      this.vastPlayer.play();
  }

  onPageUnfocus = (_e) => {
    if (this.vastPlayer && this.allowPauseOnBlur) {
      if (!this.vastPlayer.paused)
        this.vastPlayer.pause();
      this.allowPauseOnBlur = false;
    }
  }

  onAdPlay = () => {
    this.debug('adplay');
    // don't track the very first play to avoid sending resume tracker event
    if (parseInt(this.vastPlayer.currentTime, 10) > 0) {
      this.linearVastTracker?.setPaused(false, {
        ...this.macros,
        ADPLAYHEAD: this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
      });
    }
  };

  onAdPause = () => {
    this.debug('adpause');
    // don't track the pause event triggered before complete
    if (this.vastPlayer.duration - this.vastPlayer.currentTime > 0.2) {
      this.linearVastTracker?.setPaused(true, {
        ...this.macros,
        ADPLAYHEAD: this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
      });
    }
  };

  // Track timeupdate-related events
  onAdTimeUpdate = () => {
    // Set progress to track automated trackign events
    this.linearVastTracker?.setProgress(this.vastPlayer.currentTime, this.macros);
    this.player.trigger('vast.time', {
      position: this.vastPlayer.currentTime,
      currentTime: this.vastPlayer.currentTime,
      duration: this.vastPlayer.duration
    });
    const playProgress = Math.round(this.vastPlayer.currentTime / this.vastPlayer.duration * 100);
    const remainingTime = this.vastPlayer.duration - this.vastPlayer.currentTime;
    if (isNaN(remainingTime)) {
      this.vastPlayerProgressLabel.innerHTML = '';
      this.vastPlayerProgress.style.width = '0%';
    } else {
      const adNumber = this.totalAdsCount - this.adsArray.length;
      const adsLabel = this.totalAdsCount > 1 ? this.options.translation.adsMultiLabel : this.options.translation.adsSingleLabel;
     this.vastPlayerProgressLabel.innerHTML = adsLabel
        .replace(/{current}/, adNumber)
        .replace(/{total}/, this.totalAdsCount)
        .replace(/{timeLeft}/, formatTime(remainingTime));
      this.vastPlayerProgress.style.width = playProgress + '%';
    }
  };

  // track on regular content progress
  onProgress = async () => {
    if (this.watchForProgress && this.watchForProgress.length > 0) {
      const { timeOffset } = this.watchForProgress[0];
      const timeOffsetInSeconds = convertTimeOffsetToSeconds(timeOffset, this.player.duration());
      if (this.player.currentTime() > timeOffsetInSeconds) {
        const nextAd = this.watchForProgress.shift();
        const { ads, error } = await this.loadAdBreakAds(nextAd.vastUrl, nextAd.vastData);
        if (!this.player)
          return;
        if (error)
          this.player.trigger('vast.error', { message: error });
        if (!ads.length || this.adBreakType || this.isContentEnded)
          return;
        this.startAdBreak('midroll');
        this.readAds(ads);
      }
    }
  };

  onFirstPlay = () => {
    this.debug('first play');
    // Track the first timeupdate event - used for impression tracking
  };

  onAdVolumeChange = () => {
    this.debug('volume');
    if (!this.linearVastTracker) {
      return;
    }
    // Track the user muting or unmuting the video
    this.linearVastTracker.setMuted(this.vastPlayer.muted, {
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.vastPlayer.currentTime),
    });
  };

  onAdFullScreen = (evt, data) => {
    this.debug('fullscreen');
    if (!this.linearVastTracker) {
      return;
    }
    this.linearVastTracker.setFullscreen(data.state);
  };

  // Track when user closes the video
  onUnload = () => {
    if (!this.linearVastTracker || !this.vastPlayer) {
      return;
    }

    this.linearVastTracker.close({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.vastPlayer.currentTime),
    });
    this.removeEventsListeners();
  };

  // send event when ad is playing to remove loading spinner
  onAdStart = () => {
    this.debug('adstart');
    // Trigger an event to notify the player consumer that the ad is playing
    this.player.trigger('vast.play', {
      ctaUrl: this.ctaUrl,
      skipDelay: this.linearVastTracker?.skipDelay,
      adClickCallback: this.ctaUrl ? () => this.adClickCallback(this.ctaUrl) : null,
      duration: this.vastPlayer.duration,
    });
    // Track the impression of an ad
    this.linearVastTracker?.load({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
    });

    this.linearVastTracker?.trackImpression({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
    });
    this.linearVastTracker?.overlayViewDuration(
      this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
      this.macros,
    );
  };

  addSkipButton(creative) {
    this.debug('addSkipButton');
    if (this.options.addSkipButton && creative.skipDelay > 0) {
      let skipRemainingTime = creative.skipDelay;
      let isSkippable = skipRemainingTime < 1;

      // add the skip button
      const skipButtonDiv = document.createElement('div');
      skipButtonDiv.className = 'vjs-vast-skip-button';
      this.domElements.push(skipButtonDiv);
      this.vastContainer.appendChild(skipButtonDiv);

      const updateText = () => {
        skipButtonDiv.innerHTML = isSkippable ?
          `<span>${this.options.translation.skipButtonText}</span> ${SKIP_ICON}` :
          skipRemainingTime.toFixed();
        skipButtonDiv.classList.toggle('vjs-vast-skip-button--is-countdown', !isSkippable);
      };
      updateText();

      // update time
      this.skipInterval = setInterval(() => {
        if (!this.player || !this.vastPlayer) {
          this.clearSkipInterval();
          return;
        }

        skipRemainingTime = Math.round(creative.skipDelay - this.vastPlayer.currentTime);
        isSkippable = skipRemainingTime < 1;

        // for worst case with bad internet
        if (this.vastPlayerStartedPlaying) {
          const elapsed = (Date.now() - this.vastPlayerStartedPlaying) / 1000;
          if (elapsed >= creative.skipDelay * 2)
            isSkippable = true;
        }

        if (isSkippable) {
          skipButtonDiv.style.cursor = 'pointer';
          skipButtonDiv.style.pointerEvents = 'auto';
          skipButtonDiv.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.player.trigger('skip');
          });
          this.clearSkipInterval();
        }
        updateText();
      }, 500);
    }
  }

  addMuteButton() {
    if (this.vastPlayerMute)
      return;

    this.vastPlayerMute = document.createElement('div');
    this.vastPlayerMute.className = 'vjs-vast-mute';
    this.vastContainer.appendChild(this.vastPlayerMute);

    this.vastPlayerMute.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.vastPlayer.muted = !this.vastPlayer.muted;
      this.updateMuteButton();
      this.onAdVolumeChange();
    });
  }

  updateMuteButton() {
    this.vastPlayerMute.innerHTML = this.vastPlayer.muted ? MUTE_ICON : SOUND_ICON;
  }

  clearSkipInterval = () => {
    clearInterval(this.skipInterval);
  };

  onAdError = (_e, { error }) => {
    this.debug('aderror');
    this.clearSkipInterval();
    // trigger a tracker error
    this.linearVastTracker?.error({
      ...this.macros,
      ERRORCODE: 900, // undefined error, to be improved
    });

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.error', {
      message: error ?? 'Unknown error',
      tag: this.options.vastUrl,
    });

    // no more ads (end of preroll, adpods or midroll)
    if (this.adsArray.length === 0) {
      this.resetPlayer();
    } else { // pods is not ended go ahead
      this.readAd();
    }
  };

  onContentPlay = () => {
    if (this.adBreakType) {
      this.player.pause();
    } else if (!this.isContentStarted) {
      this.isContentStarted = true;
      if (this.hasPreroll)
        this.playAdBreakWithTimeout('preroll', this.prerollAds);
    }
  };

  onContentEnded = () => {
    this.isContentEnded = true;
    this.player.off('timeupdate', this.onProgress);
    if (this.postroll)
      this.playAdBreakWithTimeout('postroll', this.loadAdBreakAds(this.postroll.adSource?.adTagURI?.uri, this.postroll.adSource?.vastAdData));
  };

  onSkip = () => {
    this.debug('skip');

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.skip');

    // Track skip event
    this.linearVastTracker?.skip({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
    });

    // delete ctadiv, skip btn, icons, companions or nonlinear elements
    this.removeDomElements();

    // no more ads (end of preroll, adpods or midroll)
    if (this.adsArray.length === 0) {
      this.resetPlayer();
    } else {
      this.readAd();
    }
  };

  onDispose = () => {
    this.clearSkipInterval();
  };

  onAdEnded = () => {
    this.debug('adended');

    // Track the end of an ad
    this.linearVastTracker?.complete({
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
    });

    // delete ctadiv, skip btn, icons, companions or nonlinear elements
    this.removeDomElements();

    // no more ads (end of preroll, adpods or midroll)
    if (this.adsArray.length === 0) {
      this.resetPlayer();
    } else { // pods is not ended go ahead
      this.readAd();
    }
  };

  resetPlayer() {
    // clear skip button interval
    this.clearSkipInterval();

    // Dispose vast player
    this.disposeVastPlayer();

    // Finish ad mode so that regular content can resume
    this.endAdBreak();

    // Trigger an event when the ad is finished to notify the player consumer
    this.player.trigger('vast.complete');
  }

  /**
   * Linear mode
   * */
  playLinearAd(creative) {
    this.debug('playLinearAd', creative);

    // Retrieve the media file from the VAST manifest
    const playerRect = this.player.el().getBoundingClientRect();
    const mediaFile = getBestMediaFile(creative.mediaFiles, Math.round(playerRect.width));

    // Start ad mode
    if (!this.isAdPlaying) {
      this.isAdPlaying = true;
      this.player.addClass('vjs-ad-playing');
      this.player.trigger('adstart');
    }

    // Trigger an event when the ad starts playing
    this.player.trigger('vast.playAttempt', { adBreakType: this.adBreakType });

    this.setMacros({
      ASSETURI: mediaFile.fileURL,
      ADPLAYHEAD: this.linearVastTracker.convertToTimecode(this.vastPlayer.currentTime),
      CONTENTPLAYHEAD: this.linearVastTracker.convertToTimecode(this.player.currentTime()),
    });

    this.player.el().classList.add('vjs-vast-loading');

    this.vastPlayerStartedPlaying = 0;

    if (this.vastPlayerTimeoutTimer) {
      clearTimeout(this.vastPlayerTimeoutTimer);
      this.vastPlayerTimeoutTimer = undefined;
    }

    this.vastPlayerTimeoutTimer = setTimeout(() => {
      this.player.trigger('aderror', { error: `Video loading timeout (${this.vastPlayer.src})` });
    }, this.options.loadVideoTimeout);

    const oldSrc = this.vastPlayer.src;
    if (oldSrc) {
      this.vastPlayer.currentTime = 0;
      this.vastPlayer.src = mediaFile.fileURL;
      this.vastPlayer.load();
    } else {
      this.vastPlayer.src = mediaFile.fileURL;
    }

    this.vastPlayer.play().catch(() => {
      if (this.vastPlayer) {
        this.vastPlayer.muted = true;
        this.vastPlayer.play();
        this.updateMuteButton();
      }
    });

    this.updateMuteButton();
  }

  /**
   * Non-linear mode
   * */
  playNonLinearAd(creative) {
    creative.variations.forEach((variation) => {
      this.nonLinearVastTracker.trackImpression(this.macros);

      const clickHandler = () => {
        window.open(variation.nonlinearClickThroughURLTemplate, '_blank');
        this.nonLinearVastTracker.click(null, this.macros);
      };

      // image
      if (variation.staticResource) {
        const resourceContainer = document.createElement('div');
        this.domElements.push(resourceContainer);
        applyNonLinearCommonDomStyle(resourceContainer);

        const resource = document.createElement('img');
        resource.addEventListener('click', clickHandler);
        resourceContainer.style.maxWidth = variation.expandedWidth;
        resourceContainer.style.maxHeight = variation.expandedHeight;
        resource.src = variation.staticResource;

        // add close button
        const closeButton = getCloseButton(() => resourceContainer.remove());
        closeButton.style.display = variation.minSuggestedDuration ? 'none' : 'block';

        if (variation.minSuggestedDuration) {
          setTimeout(() => {
            closeButton.style.display = 'block';
            resourceContainer.appendChild(closeButton);
          }, variation.minSuggestedDuration * 1000);
        }
        resourceContainer.appendChild(resource);
        appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.player.el());
      }

      // html
      if (variation.htmlResource) {
        const resourceContainer = document.createElement('div');
        this.domElements.push(resourceContainer);
        applyNonLinearCommonDomStyle(resourceContainer);
        resourceContainer.addEventListener('click', clickHandler);

        resourceContainer.style.maxWidth = variation.expandedWidth;
        resourceContainer.style.maxHeight = variation.expandedHeight;
        resourceContainer.innerHTML = sanitizeHtml(variation.htmlResource);

        appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.player.el());
        if (variation.minSuggestedDuration) {
          setTimeout(() => {
            resourceContainer.remove();
          }, variation.minSuggestedDuration * 1000);
        }
      }

      // iframe
      if (variation.iframeResource) {
        const resourceContainer = document.createElement('iframe');
        this.domElements.push(resourceContainer);
        applyNonLinearCommonDomStyle(resourceContainer);
        resourceContainer.addEventListener('click', clickHandler);

        resourceContainer.style.maxWidth = variation.expandedWidth;
        resourceContainer.style.maxHeight = variation.expandedHeight;

        resourceContainer.src = variation.iframeResource;
        appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.player.el());
        if (variation.minSuggestedDuration) {
          setTimeout(() => {
            resourceContainer.remove();
          }, variation.minSuggestedDuration * 1000);
        }
      }
    });
  }

  /**
   * Companion mode
   * */
  playCompanionAd(creative) {
    creative.variations.forEach((variation) => {
      this.companionVastTracker.trackImpression(this.macros);

      const clickHandler = (e) => {
        e.stopPropagation();
        window.open(variation.companionClickThroughURLTemplate, '_blank');
        this.companionVastTracker.click(null, this.macros);
      };

      // image
      if (variation.staticResources && variation.staticResources.length > 0) {
        variation.staticResources.forEach((staticResource) => {
          const resourceContainer = document.createElement('div');
          this.domElements.push(resourceContainer);
          const { width, height } = variation.staticResources;
          resourceContainer.width = width > 0 ? width : 100;
          resourceContainer.height = height > 0 ? height : 100;
          resourceContainer.style.maxWidth = variation.staticResources.expandedWidth;
          resourceContainer.style.maxHeight = variation.staticResources.expandedHeight;
          applyNonLinearCommonDomStyle(resourceContainer);

          const resource = document.createElement('img');
          resource.addEventListener('click', clickHandler);
          resource.src = staticResource.url;
          resourceContainer.appendChild(resource);
          appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.vastContainer);
        });
      }

      // html
      if (variation.htmlResources) {
        variation.htmlResources.forEach((htmlResource) => {
          const resourceContainer = document.createElement('div');
          this.domElements.push(resourceContainer);
          resourceContainer.width = variation.htmlResources.width;
          resourceContainer.height = variation.htmlResources.height;
          resourceContainer.style.maxWidth = variation.htmlResources.expandedWidth;
          resourceContainer.style.maxHeight = variation.htmlResources.expandedHeight;
          applyNonLinearCommonDomStyle(resourceContainer);
          resourceContainer.addEventListener('click', clickHandler);
          resourceContainer.innerHTML = sanitizeHtml(htmlResource);
          appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.vastContainer);
        });
      }

      // iframe
      if (variation.iframeResources) {
        variation.iframeResources.forEach((iframeResource) => {
          const resourceContainer = document.createElement('div');
          this.domElements.push(resourceContainer);
          resourceContainer.width = variation.iframeResources.width;
          resourceContainer.height = variation.iframeResources.height;
          resourceContainer.style.maxWidth = variation.iframeResources.expandedWidth;
          resourceContainer.style.maxHeight = variation.iframeResources.expandedHeight;
          applyNonLinearCommonDomStyle(resourceContainer);
          resourceContainer.addEventListener('click', clickHandler);
          resourceContainer.src = iframeResource;
          appendToSlotOrPlayer(resourceContainer, variation.adSlotID, this.vastContainer);
        });
      }
    });
  }

  createVastPlayer() {
    if (this.vastPlayer)
      return;

    this.vastPlayer = document.createElement('video');
    this.vastPlayer.className = 'vjs-vast-player';
    this.vastContainer.appendChild(this.vastPlayer);

    this.vastPlayer.addEventListener('playing', () => {
      if (this.vastPlayerTimeoutTimer) {
        this.vastPlayerStartedPlaying = Date.now();
        this.player.el().classList.remove('vjs-vast-loading');
        clearTimeout(this.vastPlayerTimeoutTimer);
        this.player.trigger('vast.playSuccess', { adBreakType: this.adBreakType });
        this.vastPlayerTimeoutTimer = undefined;
      }
    });

    this.vastPlayer.addEventListener('play', () => this.vastPlayer && this.player.trigger('adplay'));
    this.vastPlayer.addEventListener('playing', () => this.vastPlayer && this.player.trigger('adplaying'));
    this.vastPlayer.addEventListener('pause', () => this.vastPlayer && this.player.trigger('adpause'));
    this.vastPlayer.addEventListener('timeupdate', () => this.vastPlayer && this.player.trigger('adtimeupdate'));
    this.vastPlayer.addEventListener('ended', () => this.vastPlayer && this.player.trigger('adended'));
    this.vastPlayer.addEventListener('error', () => {
      if (this.vastPlayer) {
        const error = this.vastPlayer?.error ?
          `Error ${this.vastPlayer.error.code}: ${this.vastPlayer.error.message}` :
          `Unknown media error`;
        this.player.trigger('aderror', { error });
      }
    });

    document.addEventListener('visibilitychange', this.onPageVisibilityChange);
    window.addEventListener('focus', this.onPageFocus);
    window.addEventListener('blur', this.onPageUnfocus);

    // Extends main player volume and mute
    if (!this.player.volume()) {
      this.vastPlayer.volume = 1;
      this.vastPlayer.muted = true;
    } else {
      this.vastPlayer.volume = this.player.volume();
      if (this.player.muted())
        this.vastPlayer.muted = true;
    }

    this.vastPlayerProgress = document.createElement('div');
    this.vastPlayerProgress.className = 'vjs-vast-player-progress';
    this.vastContainer.appendChild(this.vastPlayerProgress);

    this.vastPlayerProgressLabel = document.createElement('div');
    this.vastPlayerProgressLabel.className = 'vjs-vast-player-progress-label';
    this.vastContainer.appendChild(this.vastPlayerProgressLabel);
  }

  disposeVastPlayer() {
    this.debug('disposeVastPlayer');

    this.player.el().classList.remove('vjs-vast-loading');

    if (this.vastPlayerTimeoutTimer) {
      clearTimeout(this.vastPlayerTimeoutTimer);
      this.vastPlayerTimeoutTimer = undefined;
    }

    if (this.vastPlayer) {
      document.removeEventListener('visibilitychange', this.onPageVisibilityChange);
      window.removeEventListener('focus', this.onPageFocus);
      window.removeEventListener('blur', this.onPageUnfocus);

      const vastPlayer = this.vastPlayer;
      this.vastPlayer = undefined;

      vastPlayer.src = '';
      vastPlayer.load();
      vastPlayer.remove();
    }

    if (this.vastPlayerProgress) {
      this.vastPlayerProgress.remove();
      this.vastPlayerProgress = undefined;
    }

    if (this.vastPlayerProgressLabel) {
      this.vastPlayerProgressLabel.remove();
      this.vastPlayerProgressLabel = undefined;
    }

    if (this.vastPlayerMute) {
      this.vastPlayerMute.remove();
      this.vastPlayerMute = undefined;
    }
  }

  /*
  * This method is responsible for dealing with the click on the ad
  */
  adClickCallback = (ctaUrl) => {
    this.player.trigger('vast.click', { adBreakType: this.adBreakType });
    window.open(ctaUrl, '_blank');
    // Track when a user clicks on an ad
    this.linearVastTracker?.click(null, {
      ...this.macros,
      ADPLAYHEAD: this.linearVastTracker?.convertToTimecode(this.vastPlayer.currentTime),
    });
  };

  debug(msg, data = undefined) {
    if (!this.options.debug) {
      return;
    }
    console.info('videojs-vast ---', msg, data ?? '');
  }

  /*
  * This method is responsible disposing the plugin once it is not needed anymore
  */
  dispose() {
    this.debug('dispose');
    this.removeEventsListeners();
    this.removeDomElements();
    this.disposeVastPlayer();
    super.dispose();
  }

  async handleVMAP(vmapUrl) {
    try {
      const vmap = await fetchVmapUrl(vmapUrl, this.options.timeout);
      if (!vmap.adBreaks || vmap.adBreaks.length === 0) {
        this.hasPreroll = false;
        return { ads: [] };
      }

      this.postroll = getPostroll(vmap.adBreaks);
      this.watchForProgress = getMidrolls(vmap.adBreaks);
      if (this.watchForProgress.length > 0) {
        // listen on regular content for midroll handling
        this.player.on('timeupdate', this.onProgress);
      }

      const preroll = getPreroll(vmap.adBreaks);
      this.hasPreroll = !!preroll;
      return preroll ? await this.loadAdBreakAds(preroll.adSource?.adTagURI?.uri, preroll.adSource?.vastAdData) : { ads: [] };
    } catch (err) {
      // could not fetch vmap
      console.error(err);
      this.hasPreroll = false;
      return { ads: [] };
    }
  }

  parseInlineVastData(vastAdData) {
    const xmlString = (new XMLSerializer()).serializeToString(vastAdData);
    const vastXml = (new window.DOMParser()).parseFromString(xmlString, 'text/xml');
    const vastParser = new VASTParser();
    return vastParser.parseVAST(vastXml)
      .then((parsedVAST) => ({ ads: parsedVAST.ads ?? [] }))
      .catch((err) => {
        console.log('error', err);
        return { ads: [] };
      });
  }

  addIcons(ad) {
    const { icons } = ad.linearCreative();
    // is there some icons ?
    if (icons && icons.length > 0) {
      icons.forEach((icon) => {
        const {
          height, width, staticResource,
          htmlResource, iframeResource, xPosition, yPosition, iconClickThroughURLTemplate, duration,
        } = icon;
        let iconContainer = null;
        if (staticResource) {
          iconContainer = document.createElement('img');
          iconContainer.src = staticResource;
          iconContainer.height = height > 0 ? height : 100;
          iconContainer.width = width > 0 ? width : 100;
        } else if (htmlResource) {
          iconContainer = document.createElement('div');
          iconContainer.innerHTML = sanitizeHtml(icon.htmlResource);
        } else if (iframeResource) {
          iconContainer = document.createElement('iframe');
          iconContainer.src = iframeResource;
          iconContainer.height = height > 0 ? height : 100;
          iconContainer.width = width > 0 ? width : 100;
        } else {
          return;
        }

        iconContainer.style.zIndex = '1';
        iconContainer.style.position = 'absolute';
        // positioning (Y)
        if (isNumeric(yPosition)) {
          iconContainer.style.top = `${yPosition}px`;
        } else {
          iconContainer.style[['top', 'bottom'].includes(yPosition) ? yPosition : 'top'] = '3em';
        }
        // positioning (X)
        if (isNumeric(xPosition)) {
          iconContainer.style.left = `${xPosition}px`;
        } else {
          iconContainer.style[['right', 'left'].includes(xPosition) ? xPosition : 'left'] = 0;
        }
        // on click icon
        if (iconClickThroughURLTemplate) {
          iconContainer.style.cursor = 'pointer';
          iconContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(iconClickThroughURLTemplate, '_blank');
            this.linearVastTracker.click(iconClickThroughURLTemplate, this.macros);
          });
        }
        this.domElements.push(iconContainer);
        this.vastContainer.appendChild(iconContainer);
        // remove icon after the given duration
        if (duration !== -1) {
          const durationInSeconds = duration.split(':').reverse().reduce((prev, curr, i) => prev + curr * 60 ** i, 0);
          setTimeout(() => {
            iconContainer.remove();
          }, durationInSeconds * 1000);
        }
      });
    }
  }

  addEventsListeners() {
    this.player.on('play', this.onContentPlay);
    this.player.one('ended', this.onContentEnded);
    this.player.one('adplaying', this.onFirstPlay);
    playerEvents.forEach(({ event, handler }) => {
      this.player.on(event, this[handler]);
    });
    window.addEventListener('beforeunload', this.onUnload);
  }

  removeEventsListeners() {
    this.debug('removeEventsListeners');
    this.cleanupReadAdListeners();
    this.player.off('play', this.onContentPlay);
    this.player.off('ended', this.onContentEnded);
    this.player.off('adplaying', this.onFirstPlay);
    playerEvents.forEach(({ event, handler }) => {
      this.player.off(event, this[handler]);
    });
    // added only if some midrolls have been found, remove by security
    this.player.off('timeupdate', this.onProgress);
    window.removeEventListener('beforeunload', this.onUnload);
  }

  cleanupReadAdListeners() {
    if (this.onNonLinearReady) {
      this.player.off('adplaying', this.onNonLinearReady);
      this.player.off('playing', this.onNonLinearReady);
      this.onNonLinearReady = null;
    }
    if (this.onCompanionReady) {
      this.player.off('adplaying', this.onCompanionReady);
      this.player.off('playing', this.onCompanionReady);
      this.onCompanionReady = null;
    }
  }
}

// Register the plugin with video.js
videojs.registerPlugin('vast', Vast);
