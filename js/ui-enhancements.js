// Old Norse theme toggle
(function(){
  const btn = document.getElementById('oldNorseToggle');
  const LS_KEY = 'polylingua_theme';

  function applyTheme(theme){
    if(theme === 'old-norse'){
      document.body.classList.add('old-norse');
      btn.textContent = 'Old Norse ON';
      btn.classList.add('primary');
    } else {
      document.body.classList.remove('old-norse');
      btn.textContent = 'Toggle Old Norse';
      btn.classList.remove('primary');
    }
    localStorage.setItem(LS_KEY, theme);
  }

  // Load saved theme
  const saved = localStorage.getItem(LS_KEY);
  if(saved === 'old-norse') applyTheme('old-norse');

  // Toggle on click
  btn.addEventListener('click', ()=>{
    const active = document.body.classList.contains('old-norse');
    applyTheme(active ? 'default' : 'old-norse');
  });
})();
const flagIcon = document.getElementById("flagIcon");

const flagMap = {
  spanish: "assets/flags/es.svg",
  norwegian: "assets/flags/no.svg",
  icelandic: "assets/flags/is.svg"
};

function updateFlag() {
  const lang = languageSelect.value;
  flagIcon.src = flagMap[lang];
}

languageSelect.addEventListener("change", updateFlag);

// Initialize on page load
updateFlag();
const resetQuizBtn = document.getElementById("resetQuizBtn");

resetQuizBtn.addEventListener("click", () => {
  console.log("Reset button clicked");
  resetQuiz();
});
const viewLeaderboardBtn = document.getElementById("viewLeaderboardBtn");

viewLeaderboardBtn.addEventListener("click", () => {
  console.log("Leaderboard button clicked");

  // Show results screen
  resultsArea.classList.remove("hidden");
  quizArea.classList.add("hidden");
  startArea.classList.add("hidden");

  // Always load leaderboard fresh
  loadLeaderboard();

  // Scroll to leaderboard
  document.getElementById("leaderboard").scrollIntoView({ behavior: "smooth" });
});
// Background Music Toggle
const music = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicToggle");

let musicOn = localStorage.getItem("musicOn") === "true";

function updateMusicUI() {
    musicBtn.textContent = musicOn ? "Music: On" : "Music: Off";
}

function applyMusicState() {
    if (musicOn) {
        music.volume = 0.35; // gentle background volume
        music.play();
    } else {
        music.pause();
    }
}

musicBtn.addEventListener("click", () => {
    musicOn = !musicOn;
    localStorage.setItem("musicOn", musicOn);
    updateMusicUI();
    applyMusicState();
});

// Initialize on load
updateMusicUI();
applyMusicState();