const DANGEROUS_EVENT_ATTRS = /^on\w+/i;
const DANGEROUS_URI_PATTERN = /^\s*javascript\s*:/i;
const DANGEROUS_TAGS = new Set(['script', 'object', 'embed', 'applet']);

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const sanitizeHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node) => {
    const children = [...node.children];
    children.forEach((child) => {
      if (DANGEROUS_TAGS.has(child.tagName.toLowerCase())) {
        child.remove();
        return;
      }
      [...child.attributes].forEach((attr) => {
        if (DANGEROUS_EVENT_ATTRS.test(attr.name)) {
          child.removeAttribute(attr.name);
        } else if (DANGEROUS_URI_PATTERN.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
};

export const isNumeric = (str) => {
  if (typeof str === 'number') {
    return true;
  }
  return !Number.isNaN(str) && !Number.isNaN(parseFloat(str));
};

export const getLocalISOString = (date) => {
  const offset = date.getTimezoneOffset();
  const offsetAbs = Math.abs(offset);
  const isoString = new Date(date.getTime() - offset * 60 * 1000).toISOString();
  return `${isoString.slice(0, -1)}${offset > 0 ? '-' : '+'}${String(Math.floor(offsetAbs / 60)).padStart(2, '0')}`;
};

export const convertTimeOffsetToSeconds = (timecode, duration = null) => {
  // convert timeoffset in percent
  if (duration && timecode.includes('%')) {
    const percent = timecode.replace('%', '');
    return (duration / 100) * percent;
  }
  // convert timeoffset in seconds from the start
  if (timecode.includes('#')) {
    return Number(timecode.replace('#', ''));
  }
  // convert timeoffset in timecode
  const [time, ms] = timecode.split('.');
  const [hours, minutes, seconds] = time.split(':');
  return Number(`${parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10)}.${ms}`);
};

/*
 * This method is responsible for choosing the best media file to play according to the user's
 * screen resolution and internet connection speed
 */
export const getBestMediaFile = (mediaFilesAvailable, playerWidth) => {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  const dpr = Math.min(2, window.devicePixelRatio || 1);

  const downlinkMbps = connection?.downlink ?? Infinity;
  const saveData = connection?.saveData ?? false;

  // Keep some bandwidth reserve
  const maxBitrate = saveData ?
    1200 :
    (Number.isFinite(downlinkMbps) ? downlinkMbps * 1000 * 0.75 : Infinity);

  // Real required render width with DPR
  const targetWidth = playerWidth * dpr;

  const sortedMediaFiles = [...mediaFilesAvailable].sort((a, b) => a.width - b.width);

  // Best matching variant
  const matched = sortedMediaFiles.find((file) => file.width >= targetWidth && file.bitrate <= maxBitrate);
  if (matched) {
    return matched;
  }

  // Fallback: highest quality that fits bandwidth
  const byBandwidth = sortedMediaFiles
    .filter((file) => file.bitrate <= maxBitrate)
    .at(-1);
  if (byBandwidth) {
    return byBandwidth;
  }

  // Final fallback: smallest
  return sortedMediaFiles[0];
}

export const applyNonLinearCommonDomStyle = (domElement) => {
  domElement.style.cursor = 'pointer';
  domElement.style.left = '50%';
  domElement.style.position = 'absolute';
  domElement.style.transform = 'translateX(-50%)';
  domElement.style.bottom = '80px';
  domElement.style.display = 'block';
  domElement.style.zIndex = '2';
};

export const getCloseButton = (clickCallback) => {
  const closeButton = document.createElement('button');
  closeButton.addEventListener('click', clickCallback);
  closeButton.style.width = '20px';
  closeButton.style.height = '20px';
  closeButton.style.position = 'absolute';
  closeButton.style.right = '5px';
  closeButton.style.top = '5px';
  closeButton.style.zIndex = '3';
  closeButton.style.background = '#CCC';
  closeButton.style.color = '#000';
  closeButton.style.fontSize = '12px';
  closeButton.style.cursor = 'pointer';
  closeButton.textContent = 'X';
  return closeButton;
};

/*
* This method is responsible for choosing the best URl to redirect the user to when he clicks
* on the ad
*/
export const getBestCtaUrl = (creative) => {
  if (creative.videoClickThroughURLTemplate && creative.videoClickThroughURLTemplate.url) {
    return creative.videoClickThroughURLTemplate.url;
  }
  return null;
};

export const getMidrolls = (adBreaks) => {
  const midrolls = [];
  if (adBreaks) {
    return adBreaks
      .filter((adBreak) => !['start', '0%', '00:00:00', 'end', '100%'].includes(adBreak.timeOffset))
      .reduce((prev, current) => ([
        ...prev,
        {
          timeOffset: current.timeOffset,
          vastUrl: current.adSource.adTagURI?.uri,
          vastData: current.adSource.vastAdData,
        },
      ]), []);
  }
  return midrolls;
};

export const getPreroll = (adBreaks) => {
  if (adBreaks) {
    return adBreaks.find((adBreak) => ['start', '0%', '00:00:00'].includes(adBreak.timeOffset)) ?? null;
  }
  return null;
};

export const appendToSlotOrPlayer = (element, adSlotID, playerEl) => {
  if (adSlotID) {
    const adSlot = document.querySelector(`#${adSlotID}`);
    if (adSlot) {
      adSlot.appendChild(element);
    } else {
      console.warn(`VastVjs: adSlotID #${adSlotID} not found in DOM`);
    }
  } else {
    playerEl.appendChild(element);
  }
};

export const getPostroll = (adBreaks) => {
  if (adBreaks) {
    return adBreaks.find((adBreak) => ['end', '100%'].includes(adBreak.timeOffset)) ?? null;
  }
  return null;
};
