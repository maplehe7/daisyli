var videoList = [
  "https://player.vimeo.com/video/584055906?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/564693956?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/549409748?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479",
  "https://player.vimeo.com/video/522138099?badge=0&amp;autopause=0&amp;quality_selector=1&amp;player_id=0&amp;app_id=58479"
];

// Index to keep track of the current video
var currentIndex = 0;

function changeVideo(direction) {
  if (direction === 'prev') {
    currentIndex = (currentIndex - 1 + videoList.length) % videoList.length;
  } else if (direction === 'next') {
    currentIndex = (currentIndex + 1) % videoList.length;
  }

  // Update the src attribute of the iframe
  document.getElementById('webpage').src = videoList[currentIndex];
}